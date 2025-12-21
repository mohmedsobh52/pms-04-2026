import { useState } from "react";
import { Download, ChevronDown, ChevronUp, Package, Layers, DollarSign, BarChart3, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DataCharts } from "./DataCharts";
import { ProjectTimeline } from "./ProjectTimeline";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
  notes?: string;
}

interface WBSItem {
  code: string;
  title: string;
  level: number;
  parent_code?: string;
  items: string[];
}

interface AnalysisData {
  analysis_type: string;
  items?: BOQItem[];
  wbs?: WBSItem[];
  summary?: {
    total_items: number;
    total_value?: number;
    categories: string[];
    currency?: string;
  };
}

interface AnalysisResultsProps {
  data: AnalysisData;
  wbsData?: AnalysisData;
}

export function AnalysisResults({ data, wbsData }: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<"items" | "wbs" | "summary" | "charts" | "timeline">("items");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setExpandedCategories(newSet);
  };

  const groupedItems = data.items?.reduce((acc, item) => {
    const category = item.category || "غير مصنف";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, BOQItem[]>) || {};

  const exportToCSV = () => {
    if (!data.items) return;

    const headers = ["رقم البند", "الوصف", "الوحدة", "الكمية", "سعر الوحدة", "الإجمالي", "الفئة", "ملاحظات"];
    const rows = data.items.map(item => [
      item.item_number,
      item.description,
      item.unit,
      item.quantity.toString(),
      item.unit_price?.toString() || "",
      item.total_price?.toString() || "",
      item.category || "",
      item.notes || ""
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "boq_analysis.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: "items", label: "العناصر", icon: <Package className="w-4 h-4" /> },
    { id: "wbs", label: "WBS", icon: <Layers className="w-4 h-4" /> },
    { id: "summary", label: "الملخص", icon: <DollarSign className="w-4 h-4" /> },
    { id: "charts", label: "الرسوم", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "timeline", label: "الجدول الزمني", icon: <CalendarDays className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="glass-card overflow-hidden animate-slide-up">
      <div className="border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
            <Download className="w-4 h-4" />
            تصدير CSV
          </Button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === "items" && (
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium">{category}</span>
                    <span className="text-sm text-muted-foreground">({items.length} عنصر)</span>
                  </div>
                  {expandedCategories.has(category) ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                {expandedCategories.has(category) && (
                  <div className="divide-y divide-border">
                    {items.map((item, idx) => (
                      <div key={idx} className="p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                                {item.item_number}
                              </span>
                            </div>
                            <p className="text-sm">{item.description}</p>
                          </div>
                          <div className="text-left shrink-0">
                            <p className="font-medium">
                              {item.quantity} {item.unit}
                            </p>
                            {item.total_price && (
                              <p className="text-sm text-muted-foreground">
                                {item.total_price.toLocaleString()} {data.summary?.currency || ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "wbs" && wbsData?.wbs && (
          <div className="space-y-2">
            {wbsData.wbs.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-4 rounded-xl border border-border hover:border-primary/30 transition-colors",
                  item.level === 1 && "bg-muted/50",
                  item.level === 2 && "mr-8",
                  item.level === 3 && "mr-16"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                    {item.code}
                  </span>
                  <span className="font-medium">{item.title}</span>
                </div>
                {item.items.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    العناصر: {item.items.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "summary" && data.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">إجمالي العناصر</p>
              <p className="text-3xl font-display font-bold text-primary">
                {data.summary.total_items}
              </p>
            </div>
            {data.summary.total_value && (
              <div className="p-6 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                <p className="text-sm text-muted-foreground mb-1">إجمالي القيمة</p>
                <p className="text-3xl font-display font-bold text-success">
                  {data.summary.total_value.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">{data.summary.currency}</p>
              </div>
            )}
            <div className="p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 col-span-1 md:col-span-2">
              <p className="text-sm text-muted-foreground mb-2">الفئات</p>
              <div className="flex flex-wrap gap-2">
                {data.summary.categories.map((cat, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "charts" && data.items && (
          <DataCharts items={data.items} summary={data.summary} />
        )}

        {activeTab === "timeline" && wbsData?.wbs && (
          <ProjectTimeline wbsData={wbsData.wbs} />
        )}
      </div>
    </div>
  );
}
