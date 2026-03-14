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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch pending emails
    const { data: queue } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20);

    if (!queue || queue.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let errors = 0;

    for (const item of queue) {
      try {
        // Call the send-email function
        const sendRes = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: item.email_type,
              user_id: item.user_id,
              variables: item.variables,
            }),
          }
        );

        const result = await sendRes.json();

        if (sendRes.ok) {
          await supabase
            .from("email_queue")
            .update({ status: "sent", processed_at: new Date().toISOString() })
            .eq("id", item.id);
          processed++;
        } else {
          await supabase
            .from("email_queue")
            .update({ status: "failed", processed_at: new Date().toISOString() })
            .eq("id", item.id);
          errors++;
          console.error(`Failed to send email ${item.id}:`, result);
        }
      } catch (err) {
        console.error(`Error processing ${item.id}:`, err);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ processed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-email-queue error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
