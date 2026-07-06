import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProjectsTool from "./tools/list-projects";
import getProjectTool from "./tools/get-project";
import listBoqItemsTool from "./tools/list-boq-items";
import projectSummaryTool from "./tools/project-summary";

const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "construction-cost-mcp",
  title: "Construction Cost & BOQ",
  version: "0.1.0",
  instructions:
    "Tools to read the signed-in user's construction projects, BOQ items, and financial summaries. All reads are scoped to the authenticated user via Supabase RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProjectsTool, getProjectTool, listBoqItemsTool, projectSummaryTool],
});
