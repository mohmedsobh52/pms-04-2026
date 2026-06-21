import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles, ROLE_LABELS, AppRole } from "@/hooks/useUserRoles";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

const ROLES: AppRole[] = ["admin", "pm", "cost_engineer", "qs", "procurement", "site_engineer", "subcontractor", "viewer"];

export function UsersRolesPanel() {
  const { isAdmin } = useUserRoles();
  const { isArabic } = useLanguage();
  const qc = useQueryClient();
  const [newId, setNewId] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("viewer");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["all-user-roles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("id,user_id,role,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("user_roles").insert({ user_id: newId, role: newRole });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isArabic ? "تمت الإضافة" : "Role assigned"); setNewId(""); qc.invalidateQueries({ queryKey: ["all-user-roles"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isArabic ? "تمت الإزالة" : "Role removed"); qc.invalidateQueries({ queryKey: ["all-user-roles"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!isAdmin) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">{isArabic ? "للمسؤولين فقط" : "Admin only"}</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" />{isArabic ? "المستخدمون والأدوار" : "Users & Roles"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs text-muted-foreground">{isArabic ? "معرّف المستخدم" : "User ID (UUID)"}</label>
            <Input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{isArabic ? "الدور" : "Role"}</label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{isArabic ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={() => addMut.mutate()} disabled={!newId || addMut.isPending}>
            {addMut.isPending && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}{isArabic ? "إضافة" : "Assign"}
          </Button>
        </div>

        <div className="border rounded-md">
          <table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/40">
              <th className="text-start p-2">User ID</th><th className="text-start p-2">{isArabic ? "الدور" : "Role"}</th><th className="p-2"></th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={3} className="p-6 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></td></tr>}
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2 font-mono text-[10px]">{r.user_id}</td>
                  <td className="p-2"><Badge variant="secondary">{isArabic ? ROLE_LABELS[r.role as AppRole].ar : ROLE_LABELS[r.role as AppRole].en}</Badge></td>
                  <td className="p-2 text-end"><Button size="icon" variant="ghost" onClick={() => delMut.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">{isArabic ? "لا توجد بيانات" : "No roles assigned"}</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
