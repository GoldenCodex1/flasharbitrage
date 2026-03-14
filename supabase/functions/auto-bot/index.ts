import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: Record<string, unknown>[] = [];

    // Check if engine is globally enabled
    const { data: globalSettings } = await supabase
      .from("bot_global_settings")
      .select("enabled, max_concurrent_trades, max_platform_exposure, trading_window_start, trading_window_end")
      .limit(1)
      .single();

    if (!globalSettings?.enabled) {
      return new Response(
        JSON.stringify({ success: true, message: "Engine globally disabled", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load all risk profile configs for ROI filtering
    const { data: riskProfiles } = await supabase
      .from("risk_profile_config")
      .select("profile_name, roi_min, roi_max");

    const riskMap: Record<string, { roi_min: number; roi_max: number }> = {};
    for (const rp of riskProfiles ?? []) {
      // Map profile_name to bot_activity risk_profile values
      const key = rp.profile_name.toLowerCase() === "balanced" ? "moderate" : rp.profile_name.toLowerCase();
      riskMap[key] = { roi_min: Number(rp.roi_min), roi_max: Number(rp.roi_max) };
    }

    // Get all users with bot enabled
    const { data: activeBots, error: botError } = await supabase
      .from("bot_activity")
      .select("*")
      .eq("bot_enabled", true);

    if (botError || !activeBots || activeBots.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active bots", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get available active trades
    const { data: activeTrades } = await supabase
      .from("trades")
      .select("*")
      .eq("status", "active");

    if (!activeTrades || activeTrades.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active trades available", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const bot of activeBots) {
      try {
        // Get user's plan
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan_id")
          .eq("user_id", bot.user_id)
          .maybeSingle();

        if (!profile?.plan_id) continue;

        const { data: plan } = await supabase
          .from("plans")
          .select("*")
          .eq("id", profile.plan_id)
          .maybeSingle();

        if (!plan) continue;

        // Check trades today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: tradesToday } = await supabase
          .from("trade_entries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", bot.user_id)
          .gte("started_at", today.toISOString());

        const currentTradesToday = tradesToday ?? 0;

        // Check active auto trade slots
        const { count: activeSlots } = await supabase
          .from("trade_entries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", bot.user_id)
          .eq("status", "active");

        const currentActiveSlots = activeSlots ?? 0;

        // Get user balance
        const { data: balanceData } = await supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", bot.user_id);

        const balance = balanceData?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

        // Safety shutdown checks
        let shouldShutdown = false;
        let shutdownReason = "";

        if (currentTradesToday >= plan.max_trades_per_day) {
          shouldShutdown = true;
          shutdownReason = "bot_limit_reached: daily trade limit";
        } else if (currentActiveSlots >= plan.max_auto_trade_slots) {
          shouldShutdown = true;
          shutdownReason = "bot_limit_reached: auto trade slot limit";
        } else if (balance < 1) {
          shouldShutdown = true;
          shutdownReason = "bot_limit_reached: insufficient balance";
        }

        if (shouldShutdown) {
          await supabase
            .from("bot_activity")
            .update({ bot_enabled: false })
            .eq("user_id", bot.user_id);

          await supabase.from("bot_logs").insert({
            user_id: bot.user_id,
            action_type: "bot_stopped",
            category: "safety",
            new_value: shutdownReason,
          });

          await supabase.from("notifications").insert({
            user_id: bot.user_id,
            title: "Auto Bot Paused",
            message: "Auto trading bot paused due to plan or balance limits.",
            type: "warning",
          });

          results.push({ user_id: bot.user_id, action: "shutdown", reason: shutdownReason });
          continue;
        }

        // Determine user's risk profile ROI range
        const userRisk = bot.risk_profile?.toLowerCase() ?? "moderate";
        const riskConfig = riskMap[userRisk];

        // Find a trade to join (one the user hasn't already joined)
        const { data: existingEntries } = await supabase
          .from("trade_entries")
          .select("trade_id")
          .eq("user_id", bot.user_id)
          .eq("status", "active");

        const joinedTradeIds = new Set((existingEntries ?? []).map(e => e.trade_id));

        const eligibleTrade = activeTrades.find(t => {
          if (joinedTradeIds.has(t.id)) return false;
          if (t.slots_filled >= t.slot_limit) return false;
          if (Number(t.min_investment) > balance) return false;
          if (Number(t.min_investment) > plan.max_trade_amount) return false;
          // Filter by risk profile ROI range
          if (riskConfig) {
            const tradeRoi = Number(t.roi_percent);
            if (tradeRoi < riskConfig.roi_min || tradeRoi > riskConfig.roi_max) return false;
          }
          return true;
        });

        if (!eligibleTrade) {
          results.push({ user_id: bot.user_id, action: "no_eligible_trades", risk: userRisk });
          continue;
        }

        // Join the trade
        const tradeAmount = Number(eligibleTrade.min_investment);
        const { error: joinError } = await supabase.from("trade_entries").insert({
          trade_id: eligibleTrade.id,
          user_id: bot.user_id,
          amount: tradeAmount,
        });

        if (joinError) {
          results.push({ user_id: bot.user_id, action: "join_failed", error: joinError.message });
          continue;
        }

        // Deduct from balance
        await supabase.from("transactions").insert({
          user_id: bot.user_id,
          type: "trade_investment",
          amount: -tradeAmount,
          description: `Auto bot: Joined ${eligibleTrade.trading_pair ?? eligibleTrade.title}`,
          reference_id: eligibleTrade.id,
        });

        // Update bot activity
        await supabase.from("bot_activity").update({
          trades_today: currentTradesToday + 1,
        }).eq("user_id", bot.user_id);

        // Update trade slots
        await supabase.from("trades").update({
          slots_filled: eligibleTrade.slots_filled + 1,
        }).eq("id", eligibleTrade.id);

        // Log bot trade
        await supabase.from("bot_logs").insert({
          user_id: bot.user_id,
          action_type: "bot_trade_executed",
          category: "trade",
          new_value: `Joined ${eligibleTrade.trading_pair ?? eligibleTrade.title} (ROI: ${eligibleTrade.roi_percent}%, Risk: ${userRisk}) with $${tradeAmount}`,
        });

        results.push({
          user_id: bot.user_id,
          action: "trade_joined",
          trade_id: eligibleTrade.id,
          amount: tradeAmount,
          risk_profile: userRisk,
          trade_roi: eligibleTrade.roi_percent,
        });

      } catch (userErr) {
        console.error(`Bot error for user ${bot.user_id}:`, userErr);
        results.push({ user_id: bot.user_id, action: "error", error: String(userErr) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Auto-bot engine error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
