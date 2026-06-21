import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles, AppRole } from "@/hooks/useUserRoles";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

interface Props {
  roles: AppRole[];
  children: ReactNode;
  /** Where to redirect when access is denied. Default: "/" */
  fallbackPath?: string;
}

/**
 * Route guard. Renders children only if the signed-in user has at least one
 * of the listed roles. Admins always pass. Unauthenticated users are sent
 * to /auth. Loading shows a spinner so the page doesn't flash.
 */
export function RequireRole({ roles, children, fallbackPath = "/" }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { roles: userRoles, isAdmin, isLoading } = useUserRoles();

  const allowed = isAdmin || userRoles.some((r) => roles.includes(r));

  useEffect(() => {
    if (!authLoading && !isLoading && user && !allowed) {
      toast.error("You don't have permission to access this page");
    }
  }, [authLoading, isLoading, user, allowed]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!allowed) return <Navigate to={fallbackPath} replace />;

  return <>{children}</>;
}
