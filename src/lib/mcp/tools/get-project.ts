import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "get_project",
  title: "Get project",
  description: "Fetch a single project by ID, including its BOQ item count.",
  inputSchema: {
    projectId: z.string().uuid().describe("The project UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ projectId }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const { data: project, error } = await sb
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!project) {
      return { content: [{ type: "text", text: "Project not found" }], isError: true };
    }
    const { count } = await sb
      .from("boq_items")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);
    const result = { project, boqItemCount: count ?? 0 };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
