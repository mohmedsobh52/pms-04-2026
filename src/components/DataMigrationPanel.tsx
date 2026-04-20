import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Database, CheckCircle2, AlertTriangle, Play, FlaskConical } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TABLES = [
  "saved_projects",
  "project_data",
  "project_items",
  "item_costs",
  "item_pricing_details",
  "edited_boq_prices",
  "boq_templates",
  "historical_pricing_files",
  "material_prices",
  "labor_rates",
  "equipment_rates",
  "external_partners",
  "partner_contracts",
  "partner_performance",
  "partner_reviews",
  "contracts",
  "contract_milestones",
  "contract_payments",
  "contract_warranties",
  "contract_alert_settings",
  "maintenance_schedules",
  "cost_analysis",
  "cost_benefit_analysis",
  "comparison_reports",
  "attachment_folders",
  "evm_alert_settings",
  "ocr_extracted_texts",
  "offer_requests",
];

interface TableResult {
  fetched: number;
  inserted: number;
  errors: string[];
}

export const DataMigrationPanel = () => {
  const { isArabic } = useLanguage();
  const [running, setRunning] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [remapUserId, setRemapUserId] = useState(true);
  const [selected, setSelected] = useState<string[]>(TABLES);
  const [results, setResults] = useState<Record<string, TableResult> | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const toggleTable = (t: string) => {
    setSelected((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const selectAll = () => setSelected(TABLES);
  const clearAll = () => setSelected([]);

  const runMigration = async () => {
    if (selected.length === 0) {
      toast.error(isArabic ? "اختر جدولاً واحداً على الأقل" : "Select at least one table");
      return;
    }
    setRunning(true);
    setResults(null);
    setSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke("migrate-old-data", {
        body: { tables: selected, dryRun, remapUserId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Unknown error");

      setResults(data.results);
      const totalFetched = Object.values(data.results as Record<string, TableResult>)
        .reduce((s, r) => s + r.fetched, 0);
      const totalInserted = Object.values(data.results as Record<string, TableResult>)
        .reduce((s, r) => s + r.inserted, 0);
      const errCount = Object.values(data.results as Record<string, TableResult>)
        .reduce((s, r) => s + r.errors.length, 0);

      const msg = dryRun
        ? (isArabic
            ? `محاكاة: تم العثور على ${totalFetched} صفاً`
            : `Dry run: ${totalFetched} rows found`)
        : (isArabic
            ? `تم نقل ${totalInserted} من أصل ${totalFetched} صفاً (${errCount} خطأ)`
            : `Migrated ${totalInserted}/${totalFetched} rows (${errCount} errors)`);
      setSummary(msg);
      toast.success(msg);
    } catch (e: any) {
      const msg = e?.message ?? "Migration failed";
      toast.error(msg);
      setSummary(msg);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>
                {isArabic ? "نقل البيانات من النظام القديم" : "Migrate Data from Old System"}
              </CardTitle>
              <CardDescription>
                {isArabic
                  ? "استيراد جميع الصفوف من قاعدة البيانات القديمة إلى النظام الحالي"
                  : "Import all rows from the old database into the current system"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{isArabic ? "تحذير" : "Important"}</AlertTitle>
            <AlertDescription>
              {isArabic
                ? "ابدأ دائماً بـ \"محاكاة\" لمعرفة عدد الصفوف. سيتم تخطي الصفوف المكررة (نفس id). يُنصح بإعادة ربط الصفوف بحسابك الحالي."
                : "Always start with a Dry Run to preview row counts. Duplicate rows (same id) are skipped. Re-mapping to your current user is recommended."}
            </AlertDescription>
          </Alert>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <Checkbox checked={dryRun} onCheckedChange={(v) => setDryRun(!!v)} />
              <div>
                <p className="font-medium text-sm">
                  {isArabic ? "محاكاة فقط (Dry Run)" : "Dry Run only"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "احسب الصفوف بدون نسخ" : "Count rows without inserting"}
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <Checkbox checked={remapUserId} onCheckedChange={(v) => setRemapUserId(!!v)} />
              <div>
                <p className="font-medium text-sm">
                  {isArabic ? "إعادة ربط user_id بحسابي" : "Remap user_id to me"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "حتى تظهر البيانات لحسابك" : "So data appears under your account"}
                </p>
              </div>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">
                {isArabic ? "الجداول المختارة" : "Tables to migrate"} ({selected.length}/{TABLES.length})
              </Label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll}>
                  {isArabic ? "الكل" : "All"}
                </Button>
                <Button size="sm" variant="outline" onClick={clearAll}>
                  {isArabic ? "لا شيء" : "None"}
                </Button>
              </div>
            </div>
            <ScrollArea className="h-48 rounded-md border p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TABLES.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={selected.includes(t)}
                      onCheckedChange={() => toggleTable(t)}
                    />
                    <span className="font-mono">{t}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex gap-2">
            <Button onClick={runMigration} disabled={running} size="lg">
              {running ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : dryRun ? (
                <FlaskConical className="w-4 h-4 me-2" />
              ) : (
                <Play className="w-4 h-4 me-2" />
              )}
              {running
                ? (isArabic ? "جارٍ التنفيذ..." : "Running...")
                : dryRun
                  ? (isArabic ? "محاكاة" : "Dry Run")
                  : (isArabic ? "بدء النقل" : "Start Migration")}
            </Button>
          </div>

          {summary && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="font-medium">{summary}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isArabic ? "تفاصيل النتائج" : "Detailed Results"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(results).map(([table, r]) => (
                <div
                  key={table}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-sm truncate">{table}</span>
                    {r.errors.length > 0 && (
                      <Badge variant="destructive" className="shrink-0">
                        {r.errors.length} err
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant="outline">
                      {isArabic ? "وُجد" : "found"}: {r.fetched}
                    </Badge>
                    <Badge variant={r.inserted > 0 ? "default" : "outline"}>
                      {isArabic ? "نُقل" : "inserted"}: {r.inserted}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
