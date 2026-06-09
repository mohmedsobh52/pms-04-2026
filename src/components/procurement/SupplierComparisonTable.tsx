import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Sparkles, Trophy, Loader2 } from "lucide-react";

interface SupplierOffer {
  supplier: string;
  unitPrice: number;
  unit: string;
  date: string;
  quotationId: string;
  notes?: string;
}

interface Props {
  isArabic?: boolean;
}

export function SupplierComparisonTable({ isArabic }: Props) {
  const [query, setQuery] = useState("");
  const [offers, setOffers] = useState<SupplierOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string>("");

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setAiRecommendation("");
    try {
      const { data: quotes } = await supabase
        .from("price_quotations")
        .select("id, supplier_name, quotation_date, ai_analysis, status")
        .eq("status", "analyzed")
        .order("quotation_date", { ascending: false })
        .limit(100);

      const matched: SupplierOffer[] = [];
      const q = query.toLowerCase();
      for (const row of quotes || []) {
        const analysis: any = typeof row.ai_analysis === "string" ? safeJson(row.ai_analysis) : row.ai_analysis;
        const items = Array.isArray(analysis?.items) ? analysis.items : [];
        for (const it of items) {
          const desc = String(it?.description ?? "").toLowerCase();
          const price = Number(it?.unit_price ?? it?.unitPrice ?? 0);
          if (price > 0 && desc.includes(q)) {
            matched.push({
              supplier: row.supplier_name || "—",
              unitPrice: price,
              unit: String(it?.unit ?? ""),
              date: row.quotation_date || "",
              quotationId: row.id,
              notes: it?.notes,
            });
          }
        }
      }
      matched.sort((a, b) => a.unitPrice - b.unitPrice);
      setOffers(matched);
      if (matched.length === 0) toast.info(isArabic ? "لا توجد عروض مطابقة" : "No matching offers");
    } catch (e) {
      console.error(e);
      toast.error(isArabic ? "خطأ في البحث" : "Search error");
    } finally {
      setLoading(false);
    }
  };

  const recommend = async () => {
    if (offers.length === 0) return;
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("recommend-supplier", {
        body: { itemDescription: query, offers, isArabic },
      });
      if (error) throw error;
      setAiRecommendation(data?.recommendation || "");
    } catch (e: any) {
      toast.error(e?.message || (isArabic ? "خطأ في التوصية" : "AI error"));
    } finally {
      setAiBusy(false);
    }
  };

  const best = offers[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            {isArabic ? "مقارنة الموردين" : "Supplier Comparison"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder={isArabic ? "اكتب وصف البند للبحث..." : "Item description to search..."}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
          />
          <Button onClick={search} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 me-1" />}
            {isArabic ? "بحث" : "Search"}
          </Button>
          <Button variant="outline" onClick={recommend} disabled={aiBusy || offers.length === 0}>
            {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 me-1" />}
            {isArabic ? "توصية AI" : "AI Recommend"}
          </Button>
        </div>

        {offers.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "المورد" : "Supplier"}</TableHead>
                  <TableHead>{isArabic ? "السعر" : "Price"}</TableHead>
                  <TableHead>{isArabic ? "الوحدة" : "Unit"}</TableHead>
                  <TableHead>{isArabic ? "التاريخ" : "Date"}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((o, i) => {
                  const diff = best ? ((o.unitPrice - best.unitPrice) / best.unitPrice) * 100 : 0;
                  return (
                    <TableRow key={i} className={i === 0 ? "bg-primary/5" : ""}>
                      <TableCell className="font-medium">{o.supplier}</TableCell>
                      <TableCell className="font-bold">{o.unitPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{o.unit}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.date}</TableCell>
                      <TableCell>
                        {i === 0 ? (
                          <Badge className="gap-1"><Trophy className="h-3 w-3" />{isArabic ? "الأفضل" : "Best"}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-destructive">+{diff.toFixed(1)}%</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {aiRecommendation && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm whitespace-pre-wrap">
                <div className="flex items-center gap-2 font-semibold text-primary mb-1">
                  <Sparkles className="h-4 w-4" />
                  {isArabic ? "توصية الذكاء الاصطناعي" : "AI Recommendation"}
                </div>
                {aiRecommendation}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function safeJson(s: string) {
  try { return JSON.parse(s); } catch { return null; }
}
