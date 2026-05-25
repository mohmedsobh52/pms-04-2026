import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Search, History } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { normalizeHistoricalItems } from "@/lib/historical-data-utils";
import { MaterialHistoryDialog } from "./MaterialHistoryDialog";

interface HistoricalFile {
  id: string;
  project_name: string;
  project_date: string | null;
  currency: string;
  items: any[];
  created_at: string;
}

interface Props {
  files: HistoricalFile[];
}

// Aggregate average unit price per (normalized item key) per month
function makeKey(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
}

export function PriceTrendsTab({ files }: Props) {
  const [query, setQuery] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyKeyword, setHistoryKeyword] = useState("");

  // Build a list of all unique materials (by description) with their occurrences
  const materials = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const f of files) {
      const items = normalizeHistoricalItems(Array.isArray(f.items) ? f.items : []);
      for (const it of items) {
        const lbl = (it.description_ar || it.description || "").trim();
        if (!lbl) continue;
        const k = makeKey(lbl);
        const cur = map.get(k);
        if (cur) cur.count += 1;
        else map.set(k, { label: lbl, count: 1 });
      }
    }
    return Array.from(map.entries())
      .map(([k, v]) => ({ key: k, label: v.label, count: v.count }))
      .filter((m) => m.count >= 2)
      .sort((a, b) => b.count - a.count);
  }, [files]);

  const filteredMaterials = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? materials.filter((m) => m.label.toLowerCase().includes(q)) : materials).slice(0, 30);
  }, [materials, query]);

  // Aggregate top 5 most-recurring materials into chart data by month
  const trendData = useMemo(() => {
    const top = filteredMaterials.slice(0, 5);
    if (top.length === 0) return { rows: [] as any[], topKeys: [] as { key: string; label: string }[] };

    const byMonth = new Map<string, Record<string, { sum: number; n: number }>>();
    for (const f of files) {
      const date = f.project_date || f.created_at;
      if (!date) continue;
      const d = new Date(date);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const items = normalizeHistoricalItems(Array.isArray(f.items) ? f.items : []);
      for (const it of items) {
        const k = makeKey(it.description_ar || it.description || "");
        if (!top.find((t) => t.key === k)) continue;
        if (!it.unit_price) continue;
        const monthEntry = byMonth.get(month) || {};
        const cur = monthEntry[k] || { sum: 0, n: 0 };
        cur.sum += it.unit_price;
        cur.n += 1;
        monthEntry[k] = cur;
        byMonth.set(month, monthEntry);
      }
    }

    const rows = Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, entry]) => {
        const row: Record<string, any> = { month };
        for (const t of top) {
          const v = entry[t.key];
          if (v) row[t.key] = +(v.sum / v.n).toFixed(2);
        }
        return row;
      });

    return { rows, topKeys: top.map((t) => ({ key: t.key, label: t.label })) };
  }, [files, filteredMaterials]);

  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--chart-2, 142 76% 36%))",
    "hsl(var(--chart-3, 24 95% 53%))",
    "hsl(var(--chart-4, 280 65% 60%))",
    "hsl(var(--chart-5, 198 93% 60%))",
  ];

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            تطور أسعار المواد عبر الوقت
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن مادة لعرض اتجاه سعرها..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          {trendData.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              لا توجد بيانات كافية. تحتاج المادة للظهور في ملفين على الأقل.
            </p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData.rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value) =>
                      trendData.topKeys.find((t) => t.key === value)?.label.slice(0, 30) || value
                    }
                  />
                  {trendData.topKeys.map((t, i) => (
                    <Line
                      key={t.key}
                      type="monotone"
                      dataKey={t.key}
                      stroke={colors[i % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">المواد الأكثر تكراراً</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMaterials.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد نتائج</p>
          ) : (
            <div className="grid gap-2">
              {filteredMaterials.map((m) => (
                <div
                  key={m.key}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium">{m.label}</p>
                  </div>
                  <Badge variant="secondary">{m.count} ظهور</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 mr-2"
                    onClick={() => {
                      setHistoryKeyword(m.label);
                      setHistoryOpen(true);
                    }}
                  >
                    <History className="w-3 h-3" />
                    سجل
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <MaterialHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        keyword={historyKeyword}
        files={files}
      />
    </div>
  );
}
