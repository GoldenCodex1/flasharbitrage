import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as OTPAuth from "npm:otpauth@9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) || "user";

    // Service role client for totp_secrets table (no RLS policies)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, code } = await req.json();

    if (action === "setup") {
      // Generate a new TOTP secret
      const totp = new OTPAuth.TOTP({
        issuer: "FlashArbitrage",
        label: userEmail,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
      });

      const secretBase32 = totp.secret.base32;
      const uri = totp.toString();

      // Store secret (upsert, not yet verified)
      const { error } = await adminClient
        .from("totp_secrets")
        .upsert(
          { user_id: userId, encrypted_secret: secretBase32, verified: false },
          { onConflict: "user_id" }
        );

      if (error) return json({ error: error.message }, 500);

      return json({ uri, secret: secretBase32 });
    }

    if (action === "verify-setup") {
      // Verify the code during setup to confirm the user scanned the QR
      const { data: row } = await adminClient
        .from("totp_secrets")
        .select("encrypted_secret")
        .eq("user_id", userId)
        .maybeSingle();

      if (!row) return json({ error: "No TOTP setup found" }, 400);

      const totp = new OTPAuth.TOTP({
        issuer: "FlashArbitrage",
        label: userEmail,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(row.encrypted_secret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) return json({ error: "Invalid code" }, 400);

      // Mark as verified and enable 2FA on profile
      await adminClient
        .from("totp_secrets")
        .update({ verified: true })
        .eq("user_id", userId);

      await adminClient
        .from("profiles")
        .update({ two_factor_enabled: true })
        .eq("user_id", userId);

      return json({ success: true });
    }

    if (action === "verify-login") {
      // Verify TOTP code during login
      const { data: row } = await adminClient
        .from("totp_secrets")
        .select("encrypted_secret, verified")
        .eq("user_id", userId)
        .maybeSingle();

      if (!row || !row.verified) return json({ error: "2FA not set up" }, 400);

      const totp = new OTPAuth.TOTP({
        issuer: "FlashArbitrage",
        label: userEmail,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(row.encrypted_secret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) return json({ valid: false });

      return json({ valid: true });
    }

    if (action === "disable") {
      // Disable 2FA
      await adminClient
        .from("totp_secrets")
        .delete()
        .eq("user_id", userId);

      await adminClient
        .from("profiles")
        .update({ two_factor_enabled: false })
        .eq("user_id", userId);

      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
