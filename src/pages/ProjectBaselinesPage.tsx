import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell as PageLayout } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Flag, Save, RefreshCw, Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { ClaimsPageHeader } from "@/components/claims/ClaimsNav";
import { downloadCsv } from "@/lib/claims";

interface BaselineRow {
  id: string;
  project_id: string;
  name: string;
  notes: string | null;
  is_current: boolean;
  total_value: number;
  items_count: number;
  currency: string;
  snapshot: any;
  created_at: string;
}

interface ItemSnap { item_number: string; description: string; quantity: number; total_price: number }

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function ProjectBaselinesPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [baselines, setBaselines] = useState<BaselineRow[]>([]);
  const [items, setItems] = useState<ItemSnap[]>([]);
  const [claimsTotal, setClaimsTotal] = useState(0);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const fmt = (n: number) =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(n || 0);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("saved_projects").select("id, name").order("updated_at", { ascending: false });
      const list = (data || []) as { id: string; name: string }[];
      setProjects(list);
      setProjectId((p) => p || list[0]?.id || "");
    })();
  }, [user]);

  const load = useCallback(async () => {
    if (!projectId) return;
    setBusy(true);
    const [blRes, itemsRes, claimsRes] = await Promise.all([
      (supabase.from("project_baselines") as any)
        .select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("project_items")
        .select("item_number, description, quantity, total_price")
        .eq("project_id", projectId).limit(5000),
      supabase.from("claims")
        .select("approved_amount, claimed_amount, status").eq("project_id", projectId),
    ]);
    setBaselines((blRes.data || []) as BaselineRow[]);
    setItems(((itemsRes.data || []) as any[]).map((i) => ({
      item_number: i.item_number ?? "",
      description: i.description ?? "",
      quantity: Number(i.quantity || 0),
      total_price: Number(i.total_price || 0),
    })));
    setClaimsTotal(
      ((claimsRes.data || []) as any[]).reduce(
        (s, c) => s + Number(c.approved_amount || c.claimed_amount || 0), 0,
      ),
    );
    setBusy(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const currentTotal = useMemo(() => items.reduce((s, i) => s + i.total_price, 0), [items]);
  const current = useMemo(() => baselines.find((b) => b.is_current) || baselines[0] || null, [baselines]);

  const diffRows = useMemo(() => {
    if (!current) return [];
    const snapItems: ItemSnap[] = Array.isArray(current.snapshot?.items) ? current.snapshot.items : [];
    const byKey = new Map(snapItems.map((i) => [i.item_number || i.description, i]));
    const rows: { key: string; description: string; base: number; now: number; delta: number; kind: string }[] = [];
    for (const i of items) {
      const key = i.item_number || i.description;
      const b = byKey.get(key);
      const base = b ? b.total_price : 0;
      if (!b) rows.push({ key, description: i.description, base: 0, now: i.total_price, delta: i.total_price, kind: "added" });
      else if (Math.abs(base - i.total_price) > 0.5) rows.push({ key, description: i.description, base, now: i.total_price, delta: i.total_price - base, kind: "changed" });
      byKey.delete(key);
    }
    for (const [key, b] of byKey) {
      rows.push({ key, description: b.description, base: b.total_price, now: 0, delta: -b.total_price, kind: "removed" });
    }
    return rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [current, items]);

  const saveBaseline = async () => {
    if (!user || !projectId) return;
    setBusy(true);
    await (supabase.from("project_baselines") as any)
      .update({ is_current: false }).eq("project_id", projectId);
    const { error } = await (supabase.from("project_baselines") as any).insert({
      project_id: projectId,
      user_id: user.id,
      name: name.trim() || `${isArabic ? "خط أساس" : "Baseline"} ${new Date().toISOString().slice(0, 10)}`,
      notes: notes.trim() || null,
      is_current: true,
      total_value: currentTotal,
      items_count: items.length,
      snapshot: { items, captured_at: new Date().toISOString() },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setName(""); setNotes("");
    toast.success(isArabic ? "تم اعتماد خط الأساس" : "Baseline captured");
    load();
  };

  const setCurrent = async (id: string) => {
    await (supabase.from("project_baselines") as any).update({ is_current: false }).eq("project_id", projectId);
    await (supabase.from("project_baselines") as any).update({ is_current: true }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase.from("project_baselines") as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const exportDiff = () => {
    const headers = isArabic
      ? ["البند", "الوصف", "خط الأساس", "الحالي", "الفرق", "النوع"]
      : ["Item", "Description", "Baseline", "Current", "Variance", "Type"];
    const csv = "\uFEFF" + [headers, ...diffRows.map((r) => [r.key, r.description, r.base, r.now, r.delta, r.kind])]
      .map((r) => r.map(esc).join(",")).join("\n");
    downloadCsv(csv, `baseline-variance-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const baseTotal = current ? Number(current.total_value || 0) : 0;
  const variance = currentTotal - baseTotal;
  const variancePct = baseTotal ? (variance / baseTotal) * 100 : 0;

  return (
    <PageLayout>
      <div className="space-y-4">
        <ClaimsPageHeader
          icon={Flag}
          title={isArabic ? "خط الأساس ومقارنة التغييرات" : "Project baseline & change control"}
          subtitle={isArabic
            ? "اعتمد خط أساس للمشروع وقارن التغييرات وأثر المطالبات عليه"
            : "Capture a baseline and compare changes and claim impact against it"}
          actions={
            <>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-9 w-[240px]">
                  <SelectValue placeholder={isArabic ? "اختر المشروع" : "Select project"} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
                <RefreshCw className="h-4 w-4" />{isArabic ? "تحديث" : "Refresh"}
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { l: isArabic ? "قيمة خط الأساس" : "Baseline value", v: fmt(baseTotal) },
            { l: isArabic ? "القيمة الحالية" : "Current value", v: fmt(currentTotal) },
            { l: isArabic ? "الفرق" : "Variance", v: fmt(variance) },
            { l: isArabic ? "نسبة التغير" : "Change %", v: `${variancePct.toFixed(1)}%` },
            { l: isArabic ? "أثر المطالبات" : "Claims impact", v: fmt(claimsTotal) },
          ].map((k) => (
            <Card key={k.l}><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="text-xl font-bold tabular-nums">{k.v}</p>
            </CardContent></Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{isArabic ? "اعتماد خط أساس جديد" : "Capture new baseline"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>{isArabic ? "الاسم" : "Name"}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isArabic ? "خط الأساس المعتمد" : "Approved baseline"} />
              </div>
              <div className="space-y-1.5">
                <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button onClick={saveBaseline} disabled={busy || !projectId} className="w-full gap-1.5">
                <Save className="h-4 w-4" />{isArabic ? "حفظ خط الأساس" : "Save baseline"}
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">{isArabic ? "خطوط الأساس المحفوظة" : "Saved baselines"}</CardTitle></CardHeader>
            <CardContent>
              {baselines.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">{isArabic ? "لا يوجد خط أساس بعد" : "No baseline yet"}</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{isArabic ? "الاسم" : "Name"}</TableHead>
                    <TableHead>{isArabic ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isArabic ? "القيمة" : "Value"}</TableHead>
                    <TableHead>{isArabic ? "البنود" : "Items"}</TableHead>
                    <TableHead />
                  </TableRow></TableHeader>
                  <TableBody>
                    {baselines.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">
                          {b.name}{" "}
                          {b.is_current && <Badge variant="outline" className="ms-1 bg-primary/10 text-primary border-primary/20">{isArabic ? "المعتمد" : "Current"}</Badge>}
                        </TableCell>
                        <TableCell>{b.created_at.slice(0, 10)}</TableCell>
                        <TableCell className="tabular-nums">{fmt(Number(b.total_value))}</TableCell>
                        <TableCell className="tabular-nums">{b.items_count}</TableCell>
                        <TableCell className="text-end">
                          {!b.is_current && (
                            <Button variant="ghost" size="sm" onClick={() => setCurrent(b.id)}>
                              {isArabic ? "اعتماد" : "Set current"}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => remove(b.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-base">{isArabic ? "مقارنة التغييرات مقابل خط الأساس" : "Change comparison vs baseline"}</CardTitle>
            <Button variant="outline" size="sm" onClick={exportDiff} disabled={!diffRows.length} className="gap-1.5">
              <Download className="h-4 w-4" />CSV
            </Button>
          </CardHeader>
          <CardContent>
            {!current ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{isArabic ? "اعتمد خط أساس أولاً" : "Capture a baseline first"}</p>
            ) : diffRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{isArabic ? "لا توجد تغييرات عن خط الأساس" : "No changes vs baseline"}</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{isArabic ? "البند" : "Item"}</TableHead>
                  <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                  <TableHead>{isArabic ? "خط الأساس" : "Baseline"}</TableHead>
                  <TableHead>{isArabic ? "الحالي" : "Current"}</TableHead>
                  <TableHead>{isArabic ? "الفرق" : "Variance"}</TableHead>
                  <TableHead>{isArabic ? "النوع" : "Type"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {diffRows.slice(0, 200).map((r) => (
                    <TableRow key={r.key + r.kind}>
                      <TableCell>{r.key}</TableCell>
                      <TableCell className="max-w-[320px] truncate">{r.description}</TableCell>
                      <TableCell className="tabular-nums">{fmt(r.base)}</TableCell>
                      <TableCell className="tabular-nums">{fmt(r.now)}</TableCell>
                      <TableCell className={`tabular-nums ${r.delta > 0 ? "text-destructive" : "text-success"}`}>{fmt(r.delta)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {r.kind === "added" ? (isArabic ? "مضاف" : "Added")
                            : r.kind === "removed" ? (isArabic ? "محذوف" : "Removed")
                            : (isArabic ? "معدّل" : "Changed")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
