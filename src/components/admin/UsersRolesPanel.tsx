import { logAdminAction } from "@/lib/admin-audit";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles, ROLE_LABELS, AppRole } from "@/hooks/useUserRoles";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, UserPlus, Search, Download } from "lucide-react";
import { toast } from "sonner";

const ROLES: AppRole[] = [
  "admin",
  "pm",
  "cost_engineer",
  "qs",
  "procurement",
  "site_engineer",
  "subcontractor",
  "viewer",
];

export function UsersRolesPanel() {
  const { isAdmin } = useUserRoles();
  const { isArabic } = useLanguage();
  const qc = useQueryClient();
  const [newId, setNewId] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("viewer");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["all-user-roles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id,user_id,role,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: newId, role: newRole });
      if (error) throw error;
      void logAdminAction({
        action: "admin_role_assigned",
        entityId: newId,
        metadata: { role: newRole },
      });
    },
    onSuccess: () => {
      toast.success(isArabic ? "تمت الإضافة" : "Role assigned");
      setNewId("");
      qc.invalidateQueries({ queryKey: ["all-user-roles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("id", id);
      if (error) throw error;
      void logAdminAction({ action: "admin_role_updated", entityId: id, metadata: { role } });
    },
    onSuccess: () => {
      toast.success(isArabic ? "تم تحديث الدور" : "Role updated");
      qc.invalidateQueries({ queryKey: ["all-user-roles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
      void logAdminAction({ action: "admin_role_removed", entityId: id });
    },
    onSuccess: () => {
      toast.success(isArabic ? "تمت الإزالة" : "Role removed");
      qc.invalidateQueries({ queryKey: ["all-user-roles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });


  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {isArabic ? "للمسؤولين فقط" : "Admin only"}
        </CardContent>
      </Card>
    );
  }

  const filtered = (rows as any[]).filter((r) => {
    if (roleFilter !== "all" && r.role !== roleFilter) return false;
    if (q && !r.user_id?.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const roleCounts = ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = (rows as any[]).filter((x) => x.role === r).length;
    return acc;
  }, {});

  const exportCsv = () => {
    const header = "user_id,role,created_at";
    const body = filtered
      .map((r: any) => [r.user_id, r.role, r.created_at ?? ""].join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + "\n" + body], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-roles-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          {isArabic ? "المستخدمون والأدوار" : "Users & Roles"}
          <Badge variant="secondary" className="ms-auto text-[10px]">
            {(rows as any[]).length} {isArabic ? "تعيين" : "assignments"}
          </Badge>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5 me-1" />
            CSV
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs text-muted-foreground">
              {isArabic ? "معرّف المستخدم" : "User ID (UUID)"}
            </label>
            <Input
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              {isArabic ? "الدور" : "Role"}
            </label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {isArabic ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => addMut.mutate()} disabled={!newId || addMut.isPending}>
            {addMut.isPending && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
            {isArabic ? "إضافة" : "Assign"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ROLES.map((r) => (
            <Badge
              key={r}
              variant={roleFilter === r ? "default" : "outline"}
              className="cursor-pointer text-[10px]"
              onClick={() => setRoleFilter(roleFilter === r ? "all" : r)}
            >
              {isArabic ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en} · {roleCounts[r] ?? 0}
            </Badge>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isArabic ? "بحث بمعرّف المستخدم…" : "Search by user ID…"}
            className="h-8 text-xs pr-7"
          />
        </div>

        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-start p-2">User ID</th>
                <th className="text-start p-2">{isArabic ? "الدور" : "Role"}</th>
                <th className="text-start p-2">{isArabic ? "منذ" : "Since"}</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="p-6 text-center">
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  </td>
                </tr>
              )}
              {filtered.map((r: any) => (
                <tr key={r.id} className="border-b hover:bg-muted/20">
                  <td className="p-2 font-mono text-[10px]">{r.user_id}</td>
                  <td className="p-2">
                    <Select
                      value={r.role}
                      onValueChange={(v) =>
                        updateMut.mutate({ id: r.id, role: v as AppRole })
                      }
                    >
                      <SelectTrigger className="h-7 w-[160px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {isArabic ? ROLE_LABELS[role].ar : ROLE_LABELS[role].en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-[10px] text-muted-foreground">
                    {r.created_at
                      ? new Date(r.created_at).toLocaleDateString("ar-EG")
                      : "—"}
                  </td>
                  <td className="p-2 text-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => delMut.mutate(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    {isArabic ? "لا توجد بيانات" : "No roles assigned"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
