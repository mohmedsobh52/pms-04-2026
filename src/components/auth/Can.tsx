import { ReactNode } from "react";
import { useUserRoles, AppRole } from "@/hooks/useUserRoles";

interface Props {
  /** Allow if user has any of these roles. Admin always passes. */
  role: AppRole | AppRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on the current user's roles.
 * Use for UI affordances (buttons, links, sections) — not as a security boundary.
 */
export function Can({ role, children, fallback = null }: Props) {
  const { has, isAdmin } = useUserRoles();
  const list = Array.isArray(role) ? role : [role];
  const allowed = isAdmin || has(list);
  return <>{allowed ? children : fallback}</>;
}
