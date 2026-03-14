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

    // Get email settings
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

    // Check if this notification type is enabled
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

    // Get user email from auth
    const { data: userData } = await supabase.auth.admin.getUserById(user_id);
    if (!userData?.user?.email) {
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user_id)
      .single();

    const vars = {
      name: profile?.full_name || "User",
      ...variables,
    };

    // Select subject and body based on type
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

    // Replace template variables
    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

    // Get Resend API key — prefer DB setting, fallback to env
    const resendApiKey = settings.resend_api_key || Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Resend API key not configured. Add it in Admin → Email & Notifications." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${settings.sender_name} <${settings.sender_email}>`,
        to: [userData.user.email],
        subject,
        html: body.replace(/\n/g, "<br>"),
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
