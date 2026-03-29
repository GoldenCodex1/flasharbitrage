import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { payment_id } = await req.json();
    if (!payment_id) {
      return new Response(JSON.stringify({ error: "Missing payment_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get API key
    const { data: gw } = await supabase
      .from("api_gateways")
      .select("id")
      .ilike("provider_name", "%nowpayment%")
      .eq("active", true)
      .maybeSingle();

    if (!gw) {
      return new Response(JSON.stringify({ error: "Gateway not active" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: creds } = await supabase
      .from("api_credentials")
      .select("encrypted_api_key, mode")
      .eq("gateway_id", gw.id)
      .maybeSingle();

    if (!creds?.encrypted_api_key) {
      return new Response(JSON.stringify({ error: "Gateway not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = creds.mode === "sandbox"
      ? "https://api-sandbox.nowpayments.io/v1"
      : "https://api.nowpayments.io/v1";

    const statusRes = await fetch(`${baseUrl}/payment/${payment_id}`, {
      headers: { "x-api-key": creds.encrypted_api_key },
    });

    const statusData = await statusRes.json();

    if (!statusRes.ok) {
      return new Response(JSON.stringify({ error: statusData.message || "Failed to check status" }), {
        status: statusRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        payment_status: statusData.payment_status,
        actually_paid: statusData.actually_paid,
        pay_amount: statusData.pay_amount,
        outcome_amount: statusData.outcome_amount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Check payment status error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
