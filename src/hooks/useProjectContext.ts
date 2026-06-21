import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router-dom";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type LiteProject = {
  id: string;
  name: string;
  status?: string | null;
  client_ref?: string | null;
};

/**
 * Detects whether the current route is "inside a project" context.
 * Looks at /projects/:projectId/* path params and ?projectId= query params.
 */
export function useProjectContext() {
  const { pathname, search } = useLocation();
  const routeParams = useParams<{ projectId?: string }>();

  const projectId = useMemo(() => {
    if (routeParams.projectId) return routeParams.projectId;
    const qs = new URLSearchParams(search);
    return qs.get("projectId") || undefined;
  }, [routeParams.projectId, search]);

  const inProjectMode = Boolean(projectId);

  const { user } = useAuth();
  const projectsQuery = useQuery({
    queryKey: ["sidebar-projects-list", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<LiteProject[]> => {
      const { data, error } = await supabase
        .from("saved_projects")
        .select("id, name, status")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return (data ?? []) as LiteProject[];
    },
  });

  const projectQuery = useQuery({
    queryKey: ["sidebar-current-project", projectId],
    enabled: !!projectId,
    staleTime: 60_000,
    queryFn: async (): Promise<LiteProject | null> => {
      const { data, error } = await supabase
        .from("saved_projects")
        .select("id, name, status")
        .eq("id", projectId!)
        .maybeSingle();
      if (error) return null;
      return (data as LiteProject) ?? null;
    },
  });

  return {
    pathname,
    projectId,
    inProjectMode,
    currentProject: projectQuery.data ?? null,
    projects: projectsQuery.data ?? [],
    isLoading: projectQuery.isLoading || projectsQuery.isLoading,
  };
}
