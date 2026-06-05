import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  type: "signup" | "deposit" | "withdrawal" | "settlement";
  user_id: string;
  variables?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: EmailPayload = await req.json();
    const { type, user_id, variables = {} } = payload;

    const { data: settings } = await supabase
      .from("email_settings")
      .select("*")
      .limit(1)
      .single();

    if (!settings) {
      return new Response(
        JSON.stringify({ error: "Email settings not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toggleMap: Record<string, boolean> = {
      signup: settings.notify_signup,
      deposit: settings.notify_deposit,
      withdrawal: settings.notify_withdrawal,
      settlement: settings.notify_settlement,
    };

    if (!toggleMap[type]) {
      return new Response(
        JSON.stringify({ skipped: true, reason: `${type} notifications disabled` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userData } = await supabase.auth.admin.getUserById(user_id);
    if (!userData?.user?.email) {
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user_id)
      .single();

    const vars = {
      name: profile?.full_name || "User",
      ...variables,
    };

    const subjectMap: Record<string, string> = {
      signup: settings.signup_subject,
      deposit: settings.deposit_subject,
      withdrawal: settings.withdrawal_subject,
      settlement: settings.settlement_subject,
    };
    const bodyMap: Record<string, string> = {
      signup: settings.signup_body,
      deposit: settings.deposit_body,
      withdrawal: settings.withdrawal_body,
      settlement: settings.settlement_body,
    };

    let subject = subjectMap[type];
    let body = bodyMap[type];

    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      subject = subject.replace(regex, String(value));
      body = body.replace(regex, String(value));
    }

    const provider = (settings.email_provider || "mailgun").toLowerCase();
    const fromHeader = `${settings.sender_name} <${settings.sender_email}>`;
    const htmlBody = body.replace(/\n/g, "<br>");

    let sendOk = false;
    let sendId: string | undefined;
    let sendStatus = 0;
    let sendDetails: any = null;

    if (provider === "resend") {
      const resendKey = (settings.resend_api_key || Deno.env.get("RESEND_API_KEY") || "").trim();
      if (!resendKey) {
        return new Response(
          JSON.stringify({ error: "Resend not configured. Add API key in Admin → Email & Notifications." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const rRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromHeader,
          to: [userData.user.email],
          subject,
          html: htmlBody,
          text: body,
        }),
      });
      const rText = await rRes.text();
      try { sendDetails = JSON.parse(rText); } catch { sendDetails = { raw: rText }; }
      sendOk = rRes.ok;
      sendStatus = rRes.status;
      sendId = sendDetails?.id;
    } else {
      const apiKey = (settings.mailgun_api_key || Deno.env.get("MAILGUN_API_KEY") || "").trim();
      const domain = (settings.mailgun_domain || Deno.env.get("MAILGUN_DOMAIN") || "").trim();
      const region = (settings.mailgun_region || "us").toLowerCase();
      if (!apiKey || !domain) {
        return new Response(
          JSON.stringify({ error: "Mailgun not configured. Add API key and domain in Admin → Email & Notifications." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const host = region === "eu" ? "api.eu.mailgun.net" : "api.mailgun.net";
      const url = `https://${host}/v3/${domain}/messages`;
      const form = new URLSearchParams();
      form.append("from", fromHeader);
      form.append("to", userData.user.email);
      form.append("subject", subject);
      form.append("html", htmlBody);
      form.append("text", body);
      const auth = "Basic " + btoa(`api:${apiKey}`);
      const mgRes = await fetch(url, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const mgText = await mgRes.text();
      try { sendDetails = JSON.parse(mgText); } catch { sendDetails = { raw: mgText }; }
      sendOk = mgRes.ok;
      sendStatus = mgRes.status;
      sendId = sendDetails?.id;
    }

    if (!sendOk) {
      console.error(`${provider} error:`, sendStatus, sendDetails);
      return new Response(
        JSON.stringify({ error: "Failed to send email", provider, status: sendStatus, details: sendDetails }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, provider, id: sendId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
