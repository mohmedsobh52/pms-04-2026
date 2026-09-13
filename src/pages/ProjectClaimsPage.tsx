import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { ProjectClaimsLedger } from "@/components/claims/ProjectClaimsLedger";

export default function ProjectClaimsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { isArabic } = useLanguage();
  const [project, setProject] = useState<{ name: string; currency?: string } | null>(null);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const { data } = await (supabase.from("project_data") as any)
        .select("name, currency").eq("id", projectId).maybeSingle();
      if (data) { setProject(data); return; }
      const { data: saved } = await (supabase.from("saved_projects") as any)
        .select("name").eq("id", projectId).maybeSingle();
      if (saved) setProject({ name: saved.name });
    })();
  }, [projectId]);

  if (!projectId) return null;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">
              {isArabic ? "أوامر التغيير والمطالبات" : "Change orders & claims"}
            </h1>
            <p className="text-sm text-muted-foreground">{project?.name ?? projectId}</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/projects/${projectId}`}>
              <ArrowRight className="w-3.5 h-3.5 me-1" />
              {isArabic ? "العودة للمشروع" : "Back to project"}
            </Link>
          </Button>
        </div>
        <ProjectClaimsLedger
          projectId={projectId}
          projectName={project?.name}
          currency={project?.currency || "SAR"}
        />
      </div>
    </AppShell>
  );
}
