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

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { amount, currency } = await req.json();

    if (!amount || Number(amount) <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get NOWPayments API key
    const { data: gw } = await supabase
      .from("api_gateways")
      .select("id, provider_name")
      .ilike("provider_name", "%nowpayment%")
      .eq("active", true)
      .maybeSingle();

    if (!gw) {
      return new Response(JSON.stringify({ error: "Payment gateway not active" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: creds } = await supabase
      .from("api_credentials")
      .select("encrypted_api_key, mode, allowed_currencies")
      .eq("gateway_id", gw.id)
      .maybeSingle();

    if (!creds || !creds.encrypted_api_key) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = creds.encrypted_api_key;
    const isSandbox = creds.mode === "sandbox";
    const baseUrl = isSandbox
      ? "https://api-sandbox.nowpayments.io/v1"
      : "https://api.nowpayments.io/v1";

    const payCurrency = (currency || "usdttrc20").toLowerCase();

    // Use /payment endpoint instead of /invoice for embedded flow
    const paymentRes = await fetch(`${baseUrl}/payment`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: Number(amount),
        price_currency: "usd",
        pay_currency: payCurrency,
        order_id: user.id,
        order_description: `Deposit by ${user.email}`,
        ipn_callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/nowpayments-webhook`,
      }),
    });

    const paymentData = await paymentRes.json();

    if (!paymentRes.ok) {
      console.error("NOWPayments error:", JSON.stringify(paymentData));
      return new Response(
        JSON.stringify({ error: paymentData.message || "Failed to create payment" }),
        {
          status: paymentRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentData.payment_id,
        pay_address: paymentData.pay_address,
        pay_amount: paymentData.pay_amount,
        pay_currency: paymentData.pay_currency,
        network: paymentData.network || payCurrency,
        payment_status: paymentData.payment_status || "waiting",
        expiration_estimate_date: paymentData.expiration_estimate_date || null,
        price_amount: paymentData.price_amount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Create payment error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
