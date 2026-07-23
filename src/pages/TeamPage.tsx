import { AppShell } from "@/components/layout/AppShell";
import { UsersRolesPanel } from "@/components/admin/UsersRolesPanel";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";

export default function TeamPage() {
  const { isAdmin } = useUserRoles();
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
          <UsersRolesPanel />
        ) : (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            هذه الصفحة متاحة للمسؤولين فقط.
          </Card>
        )}
      </div>
    </AppShell>
  );
}
