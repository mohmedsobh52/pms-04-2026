import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Plus, FileSpreadsheet, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addHistoricalSuggestion } from "@/lib/historical-suggestions";
import { normalizeHistoricalItems } from "@/lib/historical-data-utils";

interface HistoricalFile {
  id: string;
  project_name: string;
  project_date: string | null;
  currency: string;
  items: any[];
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Description / keyword to match across files */
  keyword: string;
  files: HistoricalFile[];
}

interface Occurrence {
  fileId: string;
  projectName: string;
  date: string;
  currency: string;
  itemNumber: string;
  description: string;
  description_ar: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export function MaterialHistoryDialog({ open, onOpenChange, keyword, files }: Props) {
  const { toast } = useToast();

  const occurrences = useMemo<Occurrence[]>(() => {
    if (!keyword.trim()) return [];
    const q = keyword.trim().toLowerCase();
    const out: Occurrence[] = [];
    for (const f of files) {
      const items = normalizeHistoricalItems(Array.isArray(f.items) ? f.items : []);
      for (const it of items) {
        const hay = `${it.description} ${it.description_ar} ${it.item_number} ${it.item_code}`.toLowerCase();
        if (hay.includes(q)) {
          out.push({
            fileId: f.id,
            projectName: f.project_name,
            date: f.project_date || f.created_at,
            currency: f.currency || "SAR",
            itemNumber: it.item_number,
            description: it.description,
            description_ar: it.description_ar,
            unit: it.unit,
            quantity: it.quantity,
            unit_price: it.unit_price,
            total_price: it.total_price,
          });
        }
      }
    }
    return out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [keyword, files]);

  const chartData = useMemo(
    () =>
      occurrences.map((o) => ({
        date: o.date ? new Date(o.date).toLocaleDateString("en-CA") : "—",
        price: Number(o.unit_price) || 0,
        project: o.projectName,
      })),
    [occurrences],
  );

  const stats = useMemo(() => {
    if (occurrences.length === 0) return null;
    const prices = occurrences.map((o) => o.unit_price).filter((p) => p > 0);
    if (prices.length === 0) return null;
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const first = prices[0];
    const last = prices[prices.length - 1];
    const change = first ? ((last - first) / first) * 100 : 0;
    return { avg, min, max, change, count: prices.length };
  }, [occurrences]);

  const handleAddSuggestion = (o: Occurrence) => {
    addHistoricalSuggestion({
      source_file_id: o.fileId,
      source_project_name: o.projectName,
      source_project_date: o.date,
      item_number: o.itemNumber,
      description: o.description,
      description_ar: o.description_ar,
      unit: o.unit,
      quantity: o.quantity,
      unit_price: o.unit_price,
      total_price: o.total_price,
      currency: o.currency,
    });
    toast({
      title: "✅ تمت إضافة الاقتراح",
      description: `سعر ${o.unit_price.toLocaleString()} ${o.currency} متاح الآن في الاقتراحات`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            سجل تغييرات السعر — {keyword || "—"}
          </DialogTitle>
        </DialogHeader>

        {occurrences.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            لا توجد سجلات سابقة لهذا البند
          </p>
        ) : (
          <div className="space-y-4">
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Badge variant="outline" className="justify-center py-2">
                  ظهور: {stats.count}
                </Badge>
                <Badge variant="outline" className="justify-center py-2">
                  متوسط: {stats.avg.toFixed(2)}
                </Badge>
                <Badge variant="outline" className="justify-center py-2">
                  أدنى: {stats.min.toFixed(2)}
                </Badge>
                <Badge variant="outline" className="justify-center py-2">
                  أعلى: {stats.max.toFixed(2)}
                </Badge>
                <Badge
                  variant={stats.change >= 0 ? "default" : "secondary"}
                  className="justify-center py-2"
                >
                  تغير: {stats.change >= 0 ? "+" : ""}
                  {stats.change.toFixed(1)}%
                </Badge>
              </div>
            )}

            {chartData.length > 1 && (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <ScrollArea className="h-[40vh] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المشروع</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>الوحدة</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {occurrences.map((o, i) => (
                    <TableRow key={`${o.fileId}-${i}`}>
                      <TableCell className="whitespace-nowrap text-xs">
                        <Calendar className="w-3 h-3 inline ml-1" />
                        {o.date ? new Date(o.date).toLocaleDateString("ar-SA") : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <FileSpreadsheet className="w-3 h-3 inline ml-1" />
                        {o.projectName}
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate text-xs">
                        {o.description_ar || o.description}
                      </TableCell>
                      <TableCell className="text-xs">{o.unit}</TableCell>
                      <TableCell className="font-bold">
                        {o.unit_price.toLocaleString()} {o.currency}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddSuggestion(o)}
                          className="gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          اقتراح
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
