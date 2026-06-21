import { useLanguage } from "@/hooks/useLanguage";
import { ROLE_LABELS, AppRole } from "@/hooks/useUserRoles";
import { PERMISSIONS, ACTION_LABELS, Action } from "@/lib/permissions-matrix";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Minus } from "lucide-react";

const ROLES: AppRole[] = ["admin", "pm", "cost_engineer", "qs", "procurement", "site_engineer", "subcontractor", "viewer"];
const ACTIONS = Object.keys(ACTION_LABELS) as Action[];

export function PermissionsMatrix() {
  const { isArabic } = useLanguage();
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{isArabic ? "مصفوفة الصلاحيات" : "Permissions Matrix"}</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b">
              <th className="text-start p-2 sticky start-0 bg-background">{isArabic ? "الصلاحية" : "Action"}</th>
              {ROLES.map((r) => <th key={r} className="p-2 whitespace-nowrap">{isArabic ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en}</th>)}
            </tr></thead>
            <tbody>
              {ACTIONS.map((a) => (
                <tr key={a} className="border-b">
                  <td className="p-2 sticky start-0 bg-background font-medium">{isArabic ? ACTION_LABELS[a].ar : ACTION_LABELS[a].en}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="p-2 text-center">
                      {PERMISSIONS[r]?.[a]
                        ? <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                        : <Minus className="h-3 w-3 text-muted-foreground/40 mx-auto" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
