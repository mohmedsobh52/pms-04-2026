import { supabase } from "@/integrations/supabase/client";

export type EntityGroup = "projects" | "contracts" | "procurement" | "risks" | "boq" | "subcontractors";

export interface EntityHit {
  id: string;
  group: EntityGroup;
  label: string;
  description?: string;
  route: string;
}

/**
 * Permission-aware (via RLS) cross-module entity search. Runs queries in parallel.
 * Falls back silently if a table is unreachable.
 */
export async function searchEntities(query: string, limit = 5): Promise<EntityHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;

  const tasks: Promise<EntityHit[]>[] = [
    safe(() => supabase.from("project_data").select("id,name,file_name").ilike("name", like).limit(limit), (r) =>
      r.map<EntityHit>((p: any) => ({
        id: p.id, group: "projects", label: p.name, description: p.file_name, route: `/projects/${p.id}`,
      }))),
    safe(() => supabase.from("contracts").select("id,contract_title,contractor_name").ilike("contract_title", like).limit(limit), (r) =>
      r.map<EntityHit>((c: any) => ({
        id: c.id, group: "contracts", label: c.contract_title, description: c.contractor_name, route: "/contracts",
      }))),
    safe(() => supabase.from("procurement_items").select("id,description,boq_item_number,status").ilike("description", like).limit(limit), (r) =>
      r.map<EntityHit>((p: any) => ({
        id: p.id, group: "procurement", label: p.description ?? p.boq_item_number, description: p.status, route: "/procurement",
      }))),
    safe(() => supabase.from("risks").select("id,risk_title,risk_score").ilike("risk_title", like).limit(limit), (r) =>
      r.map<EntityHit>((x: any) => ({
        id: x.id, group: "risks", label: x.risk_title, description: x.risk_score ? `Score: ${x.risk_score}` : undefined, route: "/risk",
      }))),
    safe(() => supabase.from("project_items").select("id,description,item_number,project_id").ilike("description", like).limit(limit), (r) =>
      r.map<EntityHit>((b: any) => ({
        id: b.id, group: "boq", label: `${b.item_number ?? ""} ${b.description}`.trim(),
        route: `/projects/${b.project_id}`,
      }))),
    safe(() => supabase.from("subcontractors").select("id,name,specialty").ilike("name", like).limit(limit), (r) =>
      r.map<EntityHit>((s: any) => ({
        id: s.id, group: "subcontractors", label: s.name, description: s.specialty, route: "/subcontractors",
      }))),
  ];

  const results = await Promise.all(tasks);
  return results.flat();
}

async function safe<T>(
  call: () => any,
  map: (rows: any[]) => T[],
): Promise<T[]> {
  try {
    const { data, error } = await call();
    if (error || !data) return [];
    return map(data);
  } catch {
    return [];
  }
}

export const GROUP_LABELS: Record<EntityGroup, { en: string; ar: string }> = {
  projects: { en: "Projects", ar: "المشاريع" },
  contracts: { en: "Contracts", ar: "العقود" },
  procurement: { en: "Procurement", ar: "المشتريات" },
  risks: { en: "Risks", ar: "المخاطر" },
  boq: { en: "BOQ Items", ar: "بنود الكميات" },
  subcontractors: { en: "Subcontractors", ar: "مقاولو الباطن" },
};
