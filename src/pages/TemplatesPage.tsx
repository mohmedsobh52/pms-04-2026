import { useEffect, useState } from "react";
import { BOQTemplates } from "@/components/BOQTemplates";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Layers, TrendingUp, FolderTree, ListChecks } from "lucide-react";
import { ColorLegend } from "@/components/ui/color-code";
import { supabase } from "@/integrations/supabase/client";

interface TplRow {
  id: string;
  name: string;
  category: string | null;
  usage_count: number | null;
  items: any;
  is_public: boolean | null;
}

const TemplatesPage = () => {
  const { analysisData, setAnalysisData } = useAnalysisData();
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const [rows, setRows] = useState<TplRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("boq_templates")
        .select("id,name,category,usage_count,items,is_public");
      if (data) setRows(data as TplRow[]);
    })();
  }, []);

  const total = rows.length;
  const totalUsage = rows.reduce((s, r) => s + (r.usage_count || 0), 0);
  const totalItems = rows.reduce(
    (s, r) => s + (Array.isArray(r.items) ? r.items.length : 0),
    0,
  );
  const publicCount = rows.filter((r) => r.is_public).length;

  const catMap = new Map<string, number>();
  rows.forEach((r) => {
    const c = r.category || (isArabic ? "غير مصنف" : "Uncategorized");
    catMap.set(c, (catMap.get(c) || 0) + 1);
  });
  const categories = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
  const maxCat = categories[0]?.[1] || 1;

  const topUsed = [...rows]
    .filter((r) => (r.usage_count || 0) > 0)
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, 5);

  return (
    <PageLayout>
      <ColorLegend type="category" isArabic={isArabic} className="mb-4" />
      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "إجمالي القوالب" : "Total Templates"}
              </p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "مرات الاستخدام" : "Total Uses"}
              </p>
              <p className="text-2xl font-bold">{totalUsage}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ListChecks className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "إجمالي البنود" : "Total Items"}
              </p>
              <p className="text-2xl font-bold">{totalItems}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FolderTree className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "قوالب عامة" : "Public Templates"}
              </p>
              <p className="text-2xl font-bold">{publicCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              {isArabic ? "التصنيفات" : "Categories"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {isArabic ? "لا توجد بيانات" : "No data"}
              </p>
            )}
            {categories.slice(0, 6).map(([cat, count]) => (
              <div key={cat} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{cat}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <Progress value={(count / maxCat) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {isArabic ? "الأكثر استخداماً" : "Most Used"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topUsed.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {isArabic ? "لا توجد بيانات" : "No data"}
              </p>
            )}
            {topUsed.map((t, i) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="shrink-0">
                    #{i + 1}
                  </Badge>
                  <span className="text-sm truncate">{t.name}</span>
                </div>
                <Badge variant="secondary">{t.usage_count}×</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <BOQTemplates
        currentItems={analysisData?.items || []}
        onUseTemplate={(items) => {
          setAnalysisData((prev) =>
            prev ? { ...prev, items } : { items, summary: {} },
          );
          toast({
            title: isArabic ? "تم تطبيق القالب" : "Template Applied",
            description: isArabic
              ? "تم استيراد بنود القالب"
              : "Template items imported",
          });
        }}
      />
    </PageLayout>
  );
};

export default TemplatesPage;
