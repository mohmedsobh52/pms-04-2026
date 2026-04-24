import { useEffect, useMemo, useState } from "react";
import {
  ListChecks,
  Sparkles,
  Loader2,
  RotateCcw,
  Filter,
  ArrowUpDown,
  Settings2,
  FileDown,
} from "lucide-react";
import { P6Export } from "@/components/P6Export";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { PageLayout } from "@/components/PageLayout";
import { ColorLegend } from "@/components/ui/color-code";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ProjectPlans } from "@/components/ProjectPlans";

interface ProjectOption {
  id: string;
  name: string;
}

interface ProjectItem {
  item_number?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

type DetailLevel = "summary" | "detailed";
type TimeUnit = "days" | "weeks";
type SortKey = "item_number" | "category" | "description";

const P6ExportPage = () => {
  const { analysisData } = useAnalysisData();
  const { isArabic } = useLanguage();
  const { toast } = useToast();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [progress, setProgress] = useState(0);

  // فلترة وفرز
  const [filterText, setFilterText] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("item_number");

  // خيارات التوليد
  const [detailLevel, setDetailLevel] = useState<DetailLevel>("detailed");
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("days");

  // محاكاة شريط التقدم أثناء التحميل
  useEffect(() => {
    if (!loadingProjects && !loadingItems) {
      setProgress(0);
      return;
    }
    setProgress(15);
    const t = setInterval(() => {
      setProgress((p) => (p < 85 ? p + 8 : p));
    }, 250);
    return () => {
      clearInterval(t);
      setProgress(100);
    };
  }, [loadingProjects, loadingItems]);

  // جلب المشاريع المحفوظة
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;

        const { data, error } = await supabase
          .from("saved_projects")
          .select("id, name")
          .eq("user_id", authData.user.id)
          .order("updated_at", { ascending: false });

        if (error) throw error;
        setProjects((data || []).map((p) => ({ id: p.id, name: p.name })));
      } catch (err) {
        console.error("Failed to load projects:", err);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  // جلب بنود المشروع المختار
  useEffect(() => {
    if (!selectedProjectId) {
      setProjectItems([]);
      return;
    }
    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const { data, error } = await supabase
          .from("project_items")
          .select("item_number, description, unit, quantity, unit_price, total_price, category")
          .eq("project_id", selectedProjectId)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        setProjectItems(data || []);
      } catch (err: any) {
        toast({
          title: isArabic ? "تعذّر تحميل البنود" : "Failed to load items",
          description: err?.message,
          variant: "destructive",
        });
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, [selectedProjectId, isArabic, toast]);

  // البنود الخام
  const rawItems = useMemo(() => {
    if (selectedProjectId && projectItems.length > 0) {
      return projectItems.map((it) => ({
        item_number: it.item_number || "",
        description: it.description || "",
        unit: it.unit || "",
        quantity: Number(it.quantity) || 0,
        unit_price: Number(it.unit_price) || 0,
        total_price: Number(it.total_price) || 0,
        category: it.category || "",
      }));
    }
    return (analysisData?.items || []).map((it: any) => ({
      item_number: it.item_number || "",
      description: it.description || "",
      unit: it.unit || "",
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unit_price) || 0,
      total_price: Number(it.total_price) || 0,
      category: it.category || "",
    }));
  }, [selectedProjectId, projectItems, analysisData]);

  // الفئات المتاحة
  const categories = useMemo(() => {
    const set = new Set<string>();
    rawItems.forEach((it) => it.category && set.add(it.category));
    return Array.from(set).sort();
  }, [rawItems]);

  // تطبيق فلترة وفرز
  const items = useMemo(() => {
    let result = [...rawItems];
    if (filterCategory !== "all") {
      result = result.filter((it) => it.category === filterCategory);
    }
    if (filterText.trim()) {
      const q = filterText.trim().toLowerCase();
      result = result.filter(
        (it) =>
          it.item_number.toLowerCase().includes(q) ||
          it.description.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const av = (a[sortBy] || "").toString();
      const bv = (b[sortBy] || "").toString();
      return av.localeCompare(bv, undefined, { numeric: true });
    });
    return result;
  }, [rawItems, filterCategory, filterText, sortBy]);

  const hasRawItems = rawItems.length > 0;
  const hasItems = items.length > 0;

  const handleReset = () => {
    setSelectedProjectId("");
    setProjectItems([]);
    setFilterText("");
    setFilterCategory("all");
    setSortBy("item_number");
    setDetailLevel("detailed");
    setTimeUnit("days");
    toast({
      title: isArabic ? "تمت إعادة التعيين" : "Reset complete",
      description: isArabic
        ? "تم مسح اختيار المشروع وتصفير البنود"
        : "Project selection cleared and items reset",
    });
  };

  const handleAIGenerate = () => {
    if (!selectedProjectId) {
      toast({
        title: isArabic ? "اختر مشروعاً أولاً" : "Select a project first",
        variant: "destructive",
      });
      return;
    }
    if (!hasItems) {
      toast({
        title: isArabic ? "لا توجد بنود BOQ" : "No BOQ items",
        description: isArabic
          ? "هذا المشروع لا يحتوي على بنود لتوليد خطة تنفيذ"
          : "This project has no items to generate an execution plan",
        variant: "destructive",
      });
      return;
    }
    setTimeout(() => {
      const btn = document.querySelector<HTMLButtonElement>(
        "[data-p6-generate-trigger]"
      );
      btn?.click();
    }, 100);
  };

  // تصدير خطة التنفيذ كـ PDF
  const handleExportPDF = () => {
    if (!hasItems) {
      toast({
        title: isArabic ? "لا توجد بيانات للتصدير" : "Nothing to export",
        variant: "destructive",
      });
      return;
    }
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      const projectName =
        projects.find((p) => p.id === selectedProjectId)?.name ||
        (isArabic ? "خطة تنفيذ" : "Execution Plan");

      doc.setFontSize(16);
      doc.text(`Execution Plan - ${projectName}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Detail: ${detailLevel} | Time Unit: ${timeUnit}`, 14, 22);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

      const head =
        detailLevel === "summary"
          ? [["#", "Item", "Description", "Qty", "Unit"]]
          : [["#", "Item", "Description", "Category", "Qty", "Unit", "Unit Price", "Total"]];

      const body = items.map((it, idx) =>
        detailLevel === "summary"
          ? [idx + 1, it.item_number, it.description, it.quantity, it.unit]
          : [
              idx + 1,
              it.item_number,
              it.description,
              it.category || "-",
              it.quantity,
              it.unit,
              it.unit_price?.toLocaleString() || "-",
              it.total_price?.toLocaleString() || "-",
            ]
      );

      autoTable(doc, {
        startY: 34,
        head,
        body,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [99, 102, 241] },
      });

      const fileName = `execution-plan-${projectName.replace(/\s+/g, "-")}-${Date.now()}.pdf`;
      doc.save(fileName);
      toast({
        title: isArabic ? "تم التصدير" : "Exported",
        description: fileName,
      });
    } catch (err: any) {
      toast({
        title: isArabic ? "فشل التصدير" : "Export failed",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  return (
    <PageLayout>
      {/* Header */}
      <div
        className="rounded-2xl border border-border bg-gradient-to-br from-card to-card/50 p-6 mb-6 shadow-sm"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ListChecks className="w-7 h-7 text-primary" />
              {isArabic ? "خطة التنفيذ" : "Execution Plan"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isArabic
                ? "إدارة وتخطيط مراحل تنفيذ المشروع"
                : "Manage and plan project execution phases"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              disabled={loadingProjects}
            >
              <SelectTrigger className="w-full sm:w-64 bg-background">
                <SelectValue
                  placeholder={
                    loadingProjects
                      ? isArabic ? "جارٍ التحميل..." : "Loading..."
                      : isArabic ? "اختر المشروع" : "Select project"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {projects.length === 0 && !loadingProjects ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    {isArabic ? "لا توجد مشاريع محفوظة" : "No saved projects"}
                  </div>
                ) : (
                  projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Button
              onClick={handleAIGenerate}
              disabled={loadingItems || !hasItems}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loadingItems ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isArabic ? "توليد بالذكاء الاصطناعي" : "Generate with AI"}
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!selectedProjectId && !filterText && filterCategory === "all"}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {isArabic ? "إعادة تعيين" : "Reset"}
            </Button>

            {hasItems && (
              <Button
                variant="outline"
                onClick={handleExportPDF}
                className="gap-2"
              >
                <FileDown className="w-4 h-4" />
                {isArabic ? "تصدير PDF" : "Export PDF"}
              </Button>
            )}
          </div>
        </div>

        {/* شريط التقدم */}
        {(loadingProjects || loadingItems) && (
          <div className="mt-4 space-y-2" dir={isArabic ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                {loadingProjects
                  ? isArabic ? "جارٍ تحميل المشاريع..." : "Loading projects..."
                  : isArabic ? "جارٍ تحميل البنود..." : "Loading items..."}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </div>

      {/* خيارات قبل التوليد + فلترة/فرز */}
      {hasRawItems && (
        <div
          className="rounded-2xl border border-border bg-card p-4 mb-6 shadow-sm space-y-4"
          dir={isArabic ? "rtl" : "ltr"}
        >
          {/* خيارات التوليد */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Settings2 className="w-4 h-4 text-primary" />
              {isArabic ? "إعدادات التوليد" : "Generation Settings"}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isArabic ? "مستوى التفاصيل:" : "Detail Level:"}
              </span>
              <Select value={detailLevel} onValueChange={(v) => setDetailLevel(v as DetailLevel)}>
                <SelectTrigger className="w-36 h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">{isArabic ? "مختصر" : "Summary"}</SelectItem>
                  <SelectItem value="detailed">{isArabic ? "مفصل" : "Detailed"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isArabic ? "الجدولة الزمنية:" : "Time Unit:"}
              </span>
              <Select value={timeUnit} onValueChange={(v) => setTimeUnit(v as TimeUnit)}>
                <SelectTrigger className="w-32 h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">{isArabic ? "أيام" : "Days"}</SelectItem>
                  <SelectItem value="weeks">{isArabic ? "أسابيع" : "Weeks"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* فلترة وفرز */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Filter className="w-4 h-4 text-primary" />
              {isArabic ? "فلترة وفرز" : "Filter & Sort"}
            </div>

            <Input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={isArabic ? "ابحث برقم البند أو الوصف..." : "Search by item # or description..."}
              className="w-full md:w-64 h-9 bg-background"
            />

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-48 h-9 bg-background">
                <SelectValue placeholder={isArabic ? "كل الفئات" : "All categories"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الفئات" : "All categories"}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="w-44 h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="item_number">{isArabic ? "حسب رقم البند" : "By item #"}</SelectItem>
                  <SelectItem value="category">{isArabic ? "حسب الفئة" : "By category"}</SelectItem>
                  <SelectItem value="description">{isArabic ? "حسب الوصف" : "By description"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Badge variant="secondary" className="ml-auto">
              {items.length} / {rawItems.length} {isArabic ? "بند" : "items"}
            </Badge>
          </div>
        </div>
      )}

      <ColorLegend type="category" isArabic={isArabic} className="mb-4" />

      {/* المحتوى */}
      {!hasItems ? (
        <div
          className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <ListChecks className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {isArabic ? "لا توجد خطة تنفيذ بعد" : "No execution plan yet"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            {isArabic
              ? 'اختر مشروعاً واضغط "توليد بالذكاء الاصطناعي" لإنشاء خطة تنفيذ تلقائية من بنود BOQ'
              : 'Select a project and click "Generate with AI" to automatically create an execution plan from BOQ items'}
          </p>
          <Button
            onClick={handleAIGenerate}
            disabled={!selectedProjectId || loadingItems}
            size="lg"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Sparkles className="w-4 h-4" />
            {isArabic ? "إنشاء خطة تنفيذ" : "Create Execution Plan"}
          </Button>
        </div>
      ) : (
        <P6Export
          key={selectedProjectId || "default"}
          items={items}
          currency={analysisData?.summary?.currency || "SAR"}
        />
      )}
    </PageLayout>
  );
};

export default P6ExportPage;
