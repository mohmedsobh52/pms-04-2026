import type { AppRole } from "@/hooks/useUserRoles";

export type Action =
  | "view_projects"
  | "edit_projects"
  | "manage_boq"
  | "approve_financials"
  | "edit_costs"
  | "manage_procurement"
  | "manage_contracts"
  | "manage_subcontractors"
  | "manage_risks"
  | "view_reports"
  | "export_reports"
  | "manage_users"
  | "manage_settings";

export const ACTION_LABELS: Record<Action, { en: string; ar: string }> = {
  view_projects: { en: "View Projects", ar: "عرض المشاريع" },
  edit_projects: { en: "Edit Projects", ar: "تعديل المشاريع" },
  manage_boq: { en: "Manage BOQ", ar: "إدارة جداول الكميات" },
  approve_financials: { en: "Approve Financials", ar: "اعتماد المالية" },
  edit_costs: { en: "Edit Costs", ar: "تعديل التكاليف" },
  manage_procurement: { en: "Manage Procurement", ar: "إدارة المشتريات" },
  manage_contracts: { en: "Manage Contracts", ar: "إدارة العقود" },
  manage_subcontractors: { en: "Manage Subcontractors", ar: "إدارة مقاولي الباطن" },
  manage_risks: { en: "Manage Risks", ar: "إدارة المخاطر" },
  view_reports: { en: "View Reports", ar: "عرض التقارير" },
  export_reports: { en: "Export Reports", ar: "تصدير التقارير" },
  manage_users: { en: "Manage Users", ar: "إدارة المستخدمين" },
  manage_settings: { en: "System Settings", ar: "إعدادات النظام" },
};

// true = allowed; matrix is intentionally declarative so UI can render it.
export const PERMISSIONS: Record<AppRole, Partial<Record<Action, boolean>>> = {
  admin: Object.fromEntries(Object.keys(ACTION_LABELS).map((k) => [k, true])) as any,
  pm: {
    view_projects: true, edit_projects: true, manage_boq: true, approve_financials: true,
    edit_costs: true, manage_procurement: true, manage_contracts: true,
    manage_subcontractors: true, manage_risks: true, view_reports: true, export_reports: true,
  },
  cost_engineer: {
    view_projects: true, manage_boq: true, edit_costs: true, view_reports: true, export_reports: true,
  },
  qs: {
    view_projects: true, manage_boq: true, view_reports: true, export_reports: true,
  },
  procurement: {
    view_projects: true, manage_procurement: true, view_reports: true, export_reports: true,
  },
  site_engineer: { view_projects: true, view_reports: true },
  subcontractor: { view_projects: true },
  viewer: { view_projects: true, view_reports: true },
};

export function can(roles: AppRole[], action: Action): boolean {
  return roles.some((r) => PERMISSIONS[r]?.[action]);
}
