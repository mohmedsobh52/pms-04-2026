import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { UsersRolesPanel } from "@/components/admin/UsersRolesPanel";
import { PermissionsMatrix } from "@/components/admin/PermissionsMatrix";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield } from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { useGlobalSuggestions } from "@/contexts/GlobalSuggestionsContext";
import { buildTeamSuggestions } from "@/lib/suggestion-generators";

export default function TeamPage() {
  const { isAdmin } = useUserRoles();
  const { replaceBySource } = useGlobalSuggestions();

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("user_id, role");
      if (error || cancelled) return;
      const rows = (data ?? []) as { user_id: string; role: string }[];
      const uniqueMembers = new Set(rows.map((r) => r.user_id));
      const admins = new Set(
        rows.filter((r) => r.role === "admin").map((r) => r.user_id),
      );
      replaceBySource(
        "team",
        buildTeamSuggestions({
          members: uniqueMembers.size,
          admins: admins.size,
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, replaceBySource]);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">إدارة الفريق</h1>
            <p className="text-xs text-muted-foreground">
              الأعضاء، الأدوار، والصلاحيات على مستوى المؤسسة
            </p>
          </div>
        </div>

        {isAdmin ? (
          <Tabs defaultValue="users" className="w-full">
            <TabsList>
              <TabsTrigger value="users" className="gap-1.5">
                <Users className="w-3.5 h-3.5" />
                المستخدمون والأدوار
              </TabsTrigger>
              <TabsTrigger value="matrix" className="gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                مصفوفة الصلاحيات
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-1.5">
                <ScrollText className="w-3.5 h-3.5" />
                سجل النشاط
              </TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="mt-4">
              <UsersRolesPanel />
            </TabsContent>
            <TabsContent value="matrix" className="mt-4">
              <PermissionsMatrix />
            </TabsContent>
            <TabsContent value="audit" className="mt-4">
              <AuditLogsViewer />
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            هذه الصفحة متاحة للمسؤولين فقط.
          </Card>
        )}
      </div>
    </AppShell>
  );
}
