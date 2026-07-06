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
  name: "project_summary",
  title: "Project financial summary",
  description:
    "Return a cost/quantity summary for a project by aggregating its BOQ items.",
  inputSchema: {
    projectId: z.string().uuid().describe("Project UUID to summarize."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ projectId }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("boq_items")
      .select("total_price, quantity")
      .eq("project_id", projectId);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const rows = data ?? [];
    const totalValue = rows.reduce((s, r: any) => s + (Number(r.total_price) || 0), 0);
    const totalQty = rows.reduce((s, r: any) => s + (Number(r.quantity) || 0), 0);
    const summary = {
      itemCount: rows.length,
      totalValue: Math.round(totalValue * 100) / 100,
      totalQuantity: Math.round(totalQty * 100) / 100,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary) }],
      structuredContent: summary,
    };
  },
});
