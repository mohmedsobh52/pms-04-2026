import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole =
  | "admin"
  | "pm"
  | "cost_engineer"
  | "qs"
  | "procurement"
  | "site_engineer"
  | "subcontractor"
  | "viewer";

export const ROLE_LABELS: Record<AppRole, { en: string; ar: string }> = {
  admin: { en: "Admin", ar: "مدير النظام" },
  pm: { en: "Project Manager", ar: "مدير مشروع" },
  cost_engineer: { en: "Cost Engineer", ar: "مهندس تكاليف" },
  qs: { en: "Quantity Surveyor", ar: "مهندس كميات" },
  procurement: { en: "Procurement", ar: "مشتريات" },
  site_engineer: { en: "Site Engineer", ar: "مهندس موقع" },
  subcontractor: { en: "Subcontractor", ar: "مقاول من الباطن" },
  viewer: { en: "Viewer", ar: "مشاهد" },
};

/**
 * Fetches the current user's roles. Returns empty array when not signed in.
 * Cached for 5 minutes via react-query.
 */
export function useUserRoles() {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["user-roles", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AppRole[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) {
        console.warn("useUserRoles:", error.message);
        return [];
      }
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const roles = query.data ?? [];
  const has = (r: AppRole | AppRole[]) => {
    const list = Array.isArray(r) ? r : [r];
    return list.some((x) => roles.includes(x));
  };
  const isAdmin = roles.includes("admin");

  return { roles, has, isAdmin, isLoading: query.isLoading };
}
