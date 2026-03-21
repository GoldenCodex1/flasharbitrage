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
        // Get user balance
        const { data: balanceData } = await supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", bot.user_id);

        const totalBalance = balanceData?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) ?? 0;

        // Capital allocation logic
        const capitalAllocation = Number(bot.capital_allocation ?? 0);
        const maxPerTradePercent = Number(bot.max_per_trade_percent ?? 25);

        // If user set a capital allocation, use it; otherwise use full balance
        const availableCapital = capitalAllocation > 0 ? Math.min(capitalAllocation, totalBalance) : totalBalance;

        // Calculate how much is already locked in active trades
        const { data: activeEntries } = await supabase
          .from("trade_entries")
          .select("amount")
          .eq("user_id", bot.user_id)
          .eq("status", "active");

        const lockedCapital = activeEntries?.reduce((sum: number, e: any) => sum + Number(e.amount), 0) ?? 0;
        const remainingCapital = availableCapital - lockedCapital;

        // Safety cap: max amount per trade
        const safetyCap = availableCapital * (maxPerTradePercent / 100);

        // Skip cycle if insufficient capital (do NOT disable the bot)
        if (totalBalance < 1 || remainingCapital < 1) {
          results.push({ user_id: bot.user_id, action: "skip", reason: "insufficient_capital", balance: totalBalance, remaining: remainingCapital });
          continue;
        }

        // Determine user's risk profile ROI range
        const userRisk = bot.risk_profile?.toLowerCase() ?? "moderate";
        const riskConfig = riskMap[userRisk];

        // Get already joined trade IDs
        const joinedTradeIds = new Set((activeEntries ?? []).map((e: any) => e.trade_id));

        // Find eligible trades sorted by risk fit
        const eligibleTrades = activeTrades.filter(t => {
          if (joinedTradeIds.has(t.id)) return false;
          if (t.slots_filled >= t.slot_limit) return false;
          const minInv = Number(t.min_investment);
          if (minInv > remainingCapital) return false;
          if (minInv > safetyCap) return false;
          if (riskConfig) {
            const tradeRoi = Number(t.roi_percent);
            if (tradeRoi < riskConfig.roi_min || tradeRoi > riskConfig.roi_max) return false;
          }
          return true;
        });

        if (eligibleTrades.length === 0) {
          results.push({ user_id: bot.user_id, action: "no_eligible_trades", risk: userRisk, remaining_capital: remainingCapital });
          continue;
        }

        // Smart splitting: pick best trade based on risk profile
        // Conservative → smallest amount; Aggressive → largest; Balanced → middle
        let sortedTrades = [...eligibleTrades];
        if (userRisk === "conservative") {
          sortedTrades.sort((a, b) => Number(a.min_investment) - Number(b.min_investment));
        } else if (userRisk === "aggressive") {
          sortedTrades.sort((a, b) => Number(b.min_investment) - Number(a.min_investment));
        } else {
          // Balanced: sort by ROI ascending (moderate picks)
          sortedTrades.sort((a, b) => Number(a.roi_percent) - Number(b.roi_percent));
        }

        const chosenTrade = sortedTrades[0];

        // Determine trade amount: min investment, capped by safety cap and remaining capital
        const tradeAmount = Math.min(
          Number(chosenTrade.min_investment),
          safetyCap,
          remainingCapital
        );

        if (tradeAmount < Number(chosenTrade.min_investment)) {
          results.push({ user_id: bot.user_id, action: "skip_insufficient_for_min", remaining: remainingCapital, cap: safetyCap });
          continue;
        }

        // Use the atomic join_trade RPC for safety
        const { data: joinResult, error: joinError } = await supabase.rpc("join_trade", {
          _user_id: bot.user_id,
          _trade_id: chosenTrade.id,
          _amount: tradeAmount,
          _source: "auto_bot",
        });

        if (joinError) {
          results.push({ user_id: bot.user_id, action: "join_rpc_error", error: joinError.message });
          continue;
        }

        const jr = joinResult as any;
        if (jr && !jr.success) {
          // If plan/balance limit hit, auto-disable bot
          if (jr.error?.includes("limit") || jr.error?.includes("balance") || jr.error?.includes("slot")) {
            await supabase.from("bot_activity").update({ bot_enabled: false }).eq("user_id", bot.user_id);
            await supabase.from("notifications").insert({
              user_id: bot.user_id,
              title: "Auto Bot Paused",
              message: `Bot paused: ${jr.error}`,
              type: "warning",
            });
          }
          results.push({ user_id: bot.user_id, action: "join_rejected", error: jr.error });
          continue;
        }

        // Log bot trade
        await supabase.from("bot_logs").insert({
          user_id: bot.user_id,
          action_type: "bot_trade_executed",
          category: "trade",
          new_value: `Joined ${chosenTrade.trading_pair ?? chosenTrade.title} (ROI: ${chosenTrade.roi_percent}%, Risk: ${userRisk}) with $${tradeAmount}`,
        });

        results.push({
          user_id: bot.user_id,
          action: "trade_joined",
          trade_id: chosenTrade.id,
          amount: tradeAmount,
          risk_profile: userRisk,
          trade_roi: chosenTrade.roi_percent,
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
