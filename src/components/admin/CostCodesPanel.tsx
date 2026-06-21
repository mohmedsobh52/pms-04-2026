import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export function CostCodesPanel() {
  const { isAdmin } = useUserRoles();
  const { isArabic } = useLanguage();
  const qc = useQueryClient();
  const [form, setForm] = useState({ code: "", name: "", category: "", description: "" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["cost-codes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cost_codes" as any).select("*").order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cost_codes" as any).insert(form);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isArabic ? "تمت الإضافة" : "Added"); setForm({ code: "", name: "", category: "", description: "" }); qc.invalidateQueries({ queryKey: ["cost-codes"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cost_codes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cost-codes"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{isArabic ? "أكواد التكلفة" : "Cost Codes"}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Input placeholder={isArabic ? "الكود" : "Code"} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Input placeholder={isArabic ? "الاسم" : "Name"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder={isArabic ? "الفئة" : "Category"} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input placeholder={isArabic ? "الوصف" : "Description"} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Button onClick={() => addMut.mutate()} disabled={!form.code || !form.name || addMut.isPending}>
              {addMut.isPending ? <Loader2 className="h-4 w-4 me-1.5 animate-spin" /> : <Plus className="h-4 w-4 me-1.5" />}
              {isArabic ? "إضافة" : "Add"}
            </Button>
          </div>
        )}
        <div className="border rounded-md">
          <table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/40">
              <th className="text-start p-2">Code</th><th className="text-start p-2">{isArabic ? "الاسم" : "Name"}</th>
              <th className="text-start p-2">{isArabic ? "الفئة" : "Category"}</th><th className="text-start p-2">{isArabic ? "الوصف" : "Description"}</th>
              {isAdmin && <th className="p-2"></th>}
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="p-6 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></td></tr>}
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2 font-mono">{r.code}</td><td className="p-2">{r.name}</td>
                  <td className="p-2">{r.category ?? "—"}</td><td className="p-2 text-muted-foreground">{r.description ?? "—"}</td>
                  {isAdmin && <td className="p-2 text-end"><Button size="icon" variant="ghost" onClick={() => delMut.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></td>}
                </tr>
              ))}
              {!isLoading && rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{isArabic ? "لا توجد أكواد" : "No cost codes"}</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
