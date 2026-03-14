import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase.rpc("expire_plans");

  if (error) {
    console.error("expire_plans error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  console.log("expire_plans result:", data);
  return new Response(JSON.stringify(data), { status: 200 });
});
