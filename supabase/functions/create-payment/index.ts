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
    // Authenticate user
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

    // Verify JWT
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

    // Get NOWPayments API key from api_credentials table
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

    const payCurrency = (currency || "USDTTRC20").toLowerCase();

    // Create NOWPayments invoice
    const projectId = Deno.env.get("SUPABASE_URL")!.match(/\/\/([^.]+)/)?.[1] || "";
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/nowpayments-webhook`;

    const invoiceRes = await fetch(`${baseUrl}/invoice`, {
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
        ipn_callback_url: callbackUrl,
        success_url: `${req.headers.get("origin") || "https://flasharbitrage.com"}/deposit?status=success`,
        cancel_url: `${req.headers.get("origin") || "https://flasharbitrage.com"}/deposit?status=cancelled`,
      }),
    });

    const invoiceData = await invoiceRes.json();

    if (!invoiceRes.ok) {
      console.error("NOWPayments error:", JSON.stringify(invoiceData));
      return new Response(
        JSON.stringify({ error: invoiceData.message || "Failed to create payment" }),
        {
          status: invoiceRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice_url: invoiceData.invoice_url,
        invoice_id: invoiceData.id,
        payment_status: invoiceData.payment_status || "waiting",
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
