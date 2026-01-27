

# خطة نقل شاشة التقارير إلى شاشة المشاريع

## نظرة عامة

نقل كامل محتوى صفحة التقارير (`ReportsPage`) إلى صفحة المشاريع (`SavedProjectsPage`) كتبويب جديد "التقارير"، مع تحديد المسارات الفرعية لكل شاشة.

---

## الوضع الحالي

```text
/projects                    → SavedProjectsPage.tsx
├── Tab: المشاريع المحفوظة (projects)
└── Tab: تحليل BOQ (analyze)

/reports                     → ReportsPage.tsx (صفحة منفصلة)
├── Tab: التصدير (export)
├── Tab: تحليل الأسعار (price-analysis)
├── Tab: مقارنة المشاريع (comparison)
├── Tab: ملخص (summary)
├── Tab: الأخيرة (recent)
└── Tab: متقدم (advanced)
```

---

## الهيكل الجديد

```text
/projects                    → SavedProjectsPage.tsx (الشاشة الرئيسية)
├── Tab: المشاريع المحفوظة (projects)
├── Tab: تحليل BOQ (analyze)
└── Tab: التقارير (reports)         ← تبويب جديد
    ├── Sub-Tab: التصدير
    ├── Sub-Tab: تحليل الأسعار
    ├── Sub-Tab: مقارنة المشاريع
    ├── Sub-Tab: ملخص
    ├── Sub-Tab: الأخيرة
    └── Sub-Tab: متقدم

/reports → Redirect to /projects?tab=reports
```

---

## خريطة المسارات

| المسار | الوصف | الشاشة |
|--------|-------|--------|
| `/` | الصفحة الرئيسية | HomePage |
| `/projects` | إدارة المشاريع والتقارير | SavedProjectsPage |
| `/projects?tab=projects` | المشاريع المحفوظة | SavedProjectsPage → Tab projects |
| `/projects?tab=analyze` | تحليل BOQ | SavedProjectsPage → Tab analyze |
| `/projects?tab=reports` | التقارير | SavedProjectsPage → Tab reports |
| `/projects/new` | مشروع جديد | NewProjectPage |
| `/projects/:id` | تفاصيل المشروع | ProjectDetailsPage |
| `/projects/:id/pricing` | التسعير | TenderSummaryPage |
| `/dashboard` | لوحة التحكم | DashboardPage |
| `/fast-extraction` | الاستخراج السريع | FastExtractionPage |
| `/library` | المكتبة | LibraryPage |
| `/contracts` | العقود | ContractsPage |
| `/settings` | الإعدادات | SettingsPage |

---

## التعديلات المطلوبة

### 1. إنشاء مكون ReportsTab

**الملف الجديد:** `src/components/projects/ReportsTab.tsx`

مكون يجمع كل محتوى صفحة التقارير في تبويب واحد:

```typescript
// استيراد كل مكونات التقارير
import { ExportTab } from "@/components/reports/ExportTab";
import { PriceAnalysisTab } from "@/components/reports/PriceAnalysisTab";
import { ProjectSummaryTab } from "@/components/reports/ProjectSummaryTab";
import { RecentProjectsTab } from "@/components/reports/RecentProjectsTab";
import { ProjectsComparisonExport } from "@/components/reports/ProjectsComparisonExport";
import { AdvancedReportsTab } from "@/components/reports/AdvancedReportsTab";
import { ReportsStatCards } from "@/components/reports/ReportsStatCards";

interface ReportsTabProps {
  isArabic: boolean;
}

export function ReportsTab({ isArabic }: ReportsTabProps) {
  // State للتبويبات الفرعية
  const [subTab, setSubTab] = useState("export");
  
  // جلب المشاريع والإحصائيات
  // ...
}
```

---

### 2. تعديل SavedProjectsPage.tsx

إضافة تبويب التقارير:

```typescript
// إضافة تبويب ثالث
<TabsList className="grid w-full sm:w-auto grid-cols-3">
  <TabsTrigger value="projects">
    <FolderOpen className="w-4 h-4" />
    {isArabic ? "المشاريع" : "Projects"}
  </TabsTrigger>
  <TabsTrigger value="analyze">
    <FileUp className="w-4 h-4" />
    {isArabic ? "تحليل BOQ" : "Analyze BOQ"}
  </TabsTrigger>
  <TabsTrigger value="reports">
    <BarChart3 className="w-4 h-4" />
    {isArabic ? "التقارير" : "Reports"}
  </TabsTrigger>
</TabsList>

<TabsContent value="reports">
  <ReportsTab isArabic={isArabic} />
</TabsContent>
```

---

### 3. تحديث التوجيه في App.tsx

```typescript
// تغيير مسار التقارير لإعادة التوجيه
<Route path="/reports" element={<Navigate to="/projects?tab=reports" replace />} />
```

---

### 4. تحديث البحث الشامل

تعديل `useGlobalSearch.tsx`:

```typescript
// تحديث رابط التقارير
{
  id: 'reports',
  label: 'Reports',
  labelAr: 'التقارير',
  href: '/projects?tab=reports',
  icon: 'BarChart3',
}
```

---

### 5. تحديث Navigation وHeader

تعديل روابط التقارير في:
- `UnifiedHeader.tsx` → تغيير `/reports` إلى `/projects?tab=reports`
- `MainDashboard.tsx` → تغيير زر التقارير

---

## ملخص الملفات

| الملف | التغيير |
|-------|---------|
| `src/components/projects/ReportsTab.tsx` | **جديد** - مكون تبويب التقارير |
| `src/pages/SavedProjectsPage.tsx` | إضافة تبويب Reports |
| `src/App.tsx` | إعادة توجيه `/reports` |
| `src/hooks/useGlobalSearch.tsx` | تحديث رابط التقارير |
| `src/components/UnifiedHeader.tsx` | تحديث رابط Reports |
| `src/components/MainDashboard.tsx` | تحديث زر Reports |

---

## النتيجة المتوقعة

```text
✅ تبويب "التقارير" داخل صفحة المشاريع
✅ جميع تبويبات التقارير الفرعية (6 تبويبات)
✅ إحصائيات المشاريع والقيم
✅ إعادة توجيه المسار القديم /reports
✅ تحديث كل روابط التقارير في التطبيق
✅ دعم URL parameter للوصول المباشر
```

---

## القسم التقني

### هيكل المكون الجديد

```typescript
// src/components/projects/ReportsTab.tsx

interface ReportsTabProps {
  isArabic: boolean;
  projects: ProjectData[];
  tenderData: TenderPricing[];
  loading: boolean;
  onRefresh: () => void;
}

export function ReportsTab({ 
  isArabic, 
  projects, 
  tenderData, 
  loading, 
  onRefresh 
}: ReportsTabProps) {
  const [subTab, setSubTab] = useState("export");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // تصفية المشاريع
  const filteredProjects = useMemo(() => { ... }, [projects, statusFilter, searchQuery]);

  // حساب الإحصائيات
  const stats = useMemo(() => { ... }, [projects, tenderData]);

  // التبويبات الفرعية
  const subTabs = [
    { value: "export", label: isArabic ? "التصدير" : "Export", icon: FileDown },
    { value: "price-analysis", label: isArabic ? "تحليل الأسعار" : "Price Analysis", icon: BarChart3 },
    { value: "comparison", label: isArabic ? "مقارنة المشاريع" : "Compare", icon: GitCompare },
    { value: "summary", label: isArabic ? "ملخص" : "Summary", icon: FileText },
    { value: "recent", label: isArabic ? "الأخيرة" : "Recent", icon: Clock },
    { value: "advanced", label: isArabic ? "متقدم" : "Advanced", icon: Settings2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">
            {isArabic ? "التقارير" : "Reports"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Search & Filter controls */}
        </div>
      </div>

      {/* Stats Cards */}
      <ReportsStatCards {...stats} />

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          {subTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="export">
          <ExportTab projects={filteredProjects} isLoading={loading} />
        </TabsContent>
        {/* ... باقي التبويبات */}
      </Tabs>
    </div>
  );
}
```

### تحديث SavedProjectsPage

```typescript
// الإضافات المطلوبة

// 1. استيراد المكون الجديد
import { ReportsTab } from "@/components/projects/ReportsTab";
import { BarChart3 } from "lucide-react";

// 2. تحديث قراءة URL parameter
const initialTab = searchParams.get("tab") || "projects";

// 3. إضافة state للبيانات المشتركة
const [tenderData, setTenderData] = useState<TenderPricing[]>([]);

// 4. جلب بيانات التسعير مع المشاريع
const fetchTenderData = async () => {
  const { data } = await supabase
    .from("tender_pricing")
    .select("project_id, contract_value, total_direct_costs, total_indirect_costs, profit_margin")
    .eq("user_id", user.id);
  setTenderData(data || []);
};

// 5. إضافة التبويب الثالث
<TabsTrigger value="reports" className="gap-2">
  <BarChart3 className="w-4 h-4" />
  {isArabic ? "التقارير" : "Reports"}
</TabsTrigger>

<TabsContent value="reports">
  <ReportsTab 
    isArabic={isArabic} 
    projects={projects}
    tenderData={tenderData}
    loading={isLoading}
    onRefresh={fetchProjects}
  />
</TabsContent>
```

### تحديث App.tsx

```typescript
// تغيير السطر 107
<Route path="/reports" element={<Navigate to="/projects?tab=reports" replace />} />
```

### تحديث UnifiedHeader.tsx

```typescript
// تغيير رابط التقارير (السطر المضاف سابقاً)
<Link to="/projects?tab=reports">
  <Button variant={...} size="sm" className="...">
    <FileBarChart className="w-4 h-4" />
    {isArabic ? "التقارير" : "Reports"}
  </Button>
</Link>
```

### تحديث MainDashboard.tsx

```typescript
// تغيير زر التقارير
<Button onClick={() => navigate("/projects?tab=reports")} className="...">
  <BarChart3 className="w-4 h-4" />
  {isArabic ? "التقارير" : "Reports"}
</Button>
```

