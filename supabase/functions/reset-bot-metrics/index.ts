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

    // Reset all daily counters
    const { error, count } = await supabase
      .from("bot_activity")
      .update({
        profit_today: 0,
        loss_today: 0,
        trades_today: 0,
        last_reset_at: new Date().toISOString(),
      })
      .gte("id", "00000000-0000-0000-0000-000000000000"); // match all rows

    if (error) {
      console.error("Reset error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the reset event
    await supabase.from("bot_logs").insert({
      action_type: "bot_reset_daily_metrics",
      category: "system",
      new_value: `Daily metrics reset at ${new Date().toISOString()}`,
    });

    console.log("Daily bot metrics reset completed");

    return new Response(
      JSON.stringify({ success: true, message: "Daily bot metrics reset completed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Reset bot metrics error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
