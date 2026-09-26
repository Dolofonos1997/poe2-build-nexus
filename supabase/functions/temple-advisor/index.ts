import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { createHandler } from "./handler.ts";
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
Deno.serve(
  createHandler({
    origin: Deno.env.get("ATLAS_ORIGIN") || "https://dolofonos1997.github.io",
    model: Deno.env.get("OPENAI_MODEL") || "",
    apiKey: Deno.env.get("OPENAI_API_KEY") || "",
    fetch,
    authorize: async (token) => {
      if (!token) return null;
      const { data, error } = await admin.auth.getUser(token);
      return error ? null : data.user?.id || null;
    },
    claim: async (userId) => {
      const { data, error } = await admin.rpc("atlas_claim_ai", {
        p_user: userId,
      });
      if (error) throw error;
      return data === true;
    },
    save: async (r) => {
      const { error } = await admin
        .from("atlas_ai_generations")
        .upsert({
          id: r.id,
          user_id: r.userId,
          status: r.status,
          model: r.model,
          result: r.result || null,
          input_tokens: r.inputTokens || 0,
          output_tokens: r.outputTokens || 0,
        });
      if (error) throw error;
    },
  }),
);
