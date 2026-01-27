
# خطة ربط تقرير مراقبة التكاليف (Cost Control Report) مع البرنامج وجدول الكميات

## نظرة عامة

ربط شاشة Cost Control Report بقاعدة البيانات لجلب البيانات الحقيقية من المشاريع المحفوظة وبنود الكميات (project_items)، مع إمكانية تحديث بيانات التقدم وحساب مؤشرات EVM تلقائياً.

---

## التغييرات المطلوبة

### 1. إضافة Project Selector ودمج Supabase

**الملف:** `src/pages/CostControlReportPage.tsx`

سيتم إضافة:
- Dropdown لاختيار المشروع من `project_data`
- جلب بنود المشروع من `project_items` 
- تحويل البنود إلى Activities بناءً على الـ `category` و `subcategory`
- حساب EVM metrics من البيانات الحقيقية

```typescript
// State جديد
const [projects, setProjects] = useState<ProjectData[]>([]);
const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
const [isLoadingProjects, setIsLoadingProjects] = useState(true);
const [isLoadingItems, setIsLoadingItems] = useState(false);
const [useRealData, setUseRealData] = useState(false);

// جلب المشاريع
useEffect(() => {
  const fetchProjects = async () => {
    const { data } = await supabase
      .from('project_data')
      .select('id, name, currency, total_value, items_count, created_at')
      .order('created_at', { ascending: false });
    setProjects(data || []);
  };
  fetchProjects();
}, []);

// جلب بنود المشروع المختار
useEffect(() => {
  if (!selectedProjectId) return;
  const fetchItems = async () => {
    const { data } = await supabase
      .from('project_items')
      .select('*')
      .eq('project_id', selectedProjectId)
      .order('sort_order');
    setProjectItems(data || []);
  };
  fetchItems();
}, [selectedProjectId]);
```

---

### 2. تحويل BOQ Items إلى EVM Activities

سيتم إنشاء دالة `convertItemsToActivities` لتحويل بنود الكميات:

```typescript
const convertItemsToActivities = (items: ProjectItem[]): EVMActivity[] => {
  // تجميع البنود حسب category
  const groupedByCategory = items.reduce((acc, item) => {
    const category = mapCategoryToDiscipline(item.category);
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ProjectItem[]>);

  // تحويل كل مجموعة إلى activity
  return Object.entries(groupedByCategory).flatMap(([discipline, categoryItems], index) => {
    const pv = categoryItems.reduce((sum, i) => sum + (i.total_price || 0), 0);
    const progress = calculateProgress(categoryItems); // من progress_history أو افتراضي
    const ev = pv * (progress / 100);
    const ac = calculateActualCost(categoryItems);
    
    return {
      sn: index + 1,
      activity: getCategoryLabel(categoryItems[0].category),
      activityAr: getCategoryLabelAr(categoryItems[0].category),
      discipline,
      pv, ev, ac,
      // ... باقي حسابات EVM
    };
  });
};
```

---

### 3. Mapping Categories إلى Disciplines

```typescript
const CATEGORY_TO_DISCIPLINE: Record<string, string> = {
  // CIVIL
  'excavation': 'CIVIL',
  'concrete': 'CIVIL',
  'reinforcement': 'CIVIL',
  'foundations': 'CIVIL',
  'structural': 'CIVIL',
  
  // MECHANICAL
  'plumbing': 'MECHANICAL',
  'hvac': 'MECHANICAL',
  'firefighting': 'MECHANICAL',
  'drainage': 'MECHANICAL',
  
  // ELECTRICAL
  'electrical': 'ELECTRICAL',
  'lighting': 'ELECTRICAL',
  'low_current': 'ELECTRICAL',
  
  // ARCHITECTURAL
  'finishing': 'ARCHITECTURAL',
  'doors': 'ARCHITECTURAL',
  'windows': 'ARCHITECTURAL',
  'cladding': 'ARCHITECTURAL',
  
  // GENERAL
  'general': 'GENERAL',
  'preliminaries': 'GENERAL',
};

const mapCategoryToDiscipline = (category: string | null): string => {
  if (!category) return 'GENERAL';
  const normalized = category.toLowerCase().replace(/[\s-_]/g, '');
  for (const [key, discipline] of Object.entries(CATEGORY_TO_DISCIPLINE)) {
    if (normalized.includes(key)) return discipline;
  }
  return 'GENERAL';
};
```

---

### 4. إضافة Progress Tracking

سيتم ربط بيانات التقدم من `project_progress_history`:

```typescript
// جلب تاريخ التقدم
const fetchProgressHistory = async (projectId: string) => {
  const { data } = await supabase
    .from('project_progress_history')
    .select('*')
    .eq('project_id', projectId)
    .order('record_date', { ascending: false })
    .limit(1);
  
  return data?.[0] || null;
};

// حساب التقدم
const calculateProgress = (items: ProjectItem[], progressData?: any) => {
  if (progressData?.actual_progress) return progressData.actual_progress;
  
  // حساب افتراضي من البنود المسعرة
  const pricedItems = items.filter(i => i.unit_price && i.unit_price > 0);
  return (pricedItems.length / items.length) * 100 * 0.6; // افتراضي 60% من نسبة التسعير
};
```

---

### 5. تحديث واجهة المستخدم

#### أ. إضافة Project Selector في الـ Header:

```tsx
<div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600...">
  {/* ... existing header content ... */}
  
  {/* Project Selector - NEW */}
  <div className="mt-4 flex items-center gap-4">
    <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
      <SelectTrigger className="w-[300px] bg-white/10 border-white/20 text-white">
        <SelectValue placeholder={isArabic ? "اختر مشروع..." : "Select Project..."} />
      </SelectTrigger>
      <SelectContent>
        {projects.map(p => (
          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    
    {/* Toggle للتبديل بين البيانات النموذجية والحقيقية */}
    <div className="flex items-center gap-2">
      <Switch checked={useRealData} onCheckedChange={setUseRealData} />
      <span className="text-white/80 text-sm">
        {isArabic ? "بيانات حقيقية" : "Real Data"}
      </span>
    </div>
  </div>
</div>
```

#### ب. تحديث الجدول لعرض بيانات BOQ:

```tsx
// عمود إضافي لعدد البنود
<TableHead>{isArabic ? "عدد البنود" : "Items Count"}</TableHead>

// في الصف
<TableCell className="text-center">
  <Badge variant="outline">{activity.itemsCount || '-'}</Badge>
</TableCell>
```

---

### 6. إضافة Edit Progress Dialog

لتحديث نسبة التقدم:

```tsx
const [editProgressDialog, setEditProgressDialog] = useState<{
  open: boolean;
  activity: EVMActivity | null;
}>({ open: false, activity: null });

const handleUpdateProgress = async (activityCode: string, newProgress: number) => {
  // تحديث في project_progress_history
  await supabase.from('project_progress_history').upsert({
    project_id: selectedProjectId,
    actual_progress: newProgress,
    record_date: new Date().toISOString(),
    user_id: user.id,
  });
  
  // إعادة جلب البيانات
  refetchItems();
};
```

---

### 7. حفظ التقرير وتصديره

إضافة زر لحفظ التقرير:

```typescript
const handleSaveReport = async () => {
  if (!selectedProjectId) return;
  
  // حفظ في جدول جديد أو تحديث project_data.analysis_data
  await supabase
    .from('project_data')
    .update({
      analysis_data: {
        ...existingData,
        evm_report: {
          generated_at: new Date().toISOString(),
          totals,
          activities: filteredActivities,
        }
      }
    })
    .eq('id', selectedProjectId);
    
  toast.success(isArabic ? 'تم حفظ التقرير' : 'Report saved');
};
```

---

## ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/CostControlReportPage.tsx` | إضافة Supabase integration, project selector, real data conversion |
| `src/hooks/useAuth.tsx` | استخدام (موجود) |
| `src/integrations/supabase/client.ts` | استخدام (موجود) |

---

## البنية الجديدة للصفحة

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Header Banner                               │
│   Cost Control Report          [Project Selector ▼] [⚡ Real]  │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  Discipline  │   🔹 Loading from project_items...              │
│  ☑ GENERAL   │   OR                                            │
│  ☑ CIVIL     │   🔹 82 Activities (Sample Data)                │
│  ☐ MECH      │                                                  │
│              │    ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  Activity    │    │  PV  │ │  EV  │ │  AC  │ │ EAC  │ │ ETC  │  │
│  (from BOQ)  │    │ Real │ │ Data │ │ From │ │  DB  │ │      │  │
│              │    └──────┘ └──────┘ └──────┘ └──────┘ └──────┘  │
│              │                                                  │
│              │    ┌───────────────────────────────────────────┐ │
│              │    │        CHART (Real Project Data)          │ │
│              │    └───────────────────────────────────────────┘ │
│              │                                                  │
│              │    ┌───────────────────────────────────────────┐ │
│              │    │   TABLE (Linked to project_items)         │ │
│              │    │   + Edit Progress ✏️ button                │ │
│              │    │   + Items Count column                     │ │
│              │    └───────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────┘
```

---

## تدفق البيانات

```text
project_data                  project_items               project_progress_history
    │                              │                              │
    │ (1) Select Project          │                              │
    ▼                              │                              │
┌───────────┐                      │                              │
│  Project  │◄─────────────────────┤ (2) Fetch Items             │
│  Selector │                      │                              │
└─────┬─────┘                      ▼                              │
      │                    ┌──────────────┐                       │
      │                    │  BOQ Items   │◄──────────────────────┤
      │                    │ (category,   │  (3) Get Progress %   │
      │                    │  unit_price, │                       │
      │                    │  quantity)   │                       │
      │                    └──────┬───────┘                       │
      │                           │                               │
      │                           ▼                               │
      │                    ┌──────────────┐                       │
      │                    │   Convert    │                       │
      │                    │  to EVM      │                       │
      │                    │  Activities  │                       │
      │                    └──────┬───────┘                       │
      │                           │                               │
      │                           ▼                               │
      │                    ┌──────────────┐                       │
      └───────────────────►│  Calculate   │                       │
                           │  EVM Metrics │                       │
                           │  (PV,EV,AC)  │                       │
                           └──────┬───────┘                       │
                                  │                               │
                                  ▼                               │
                           ┌──────────────┐                       │
                           │   Display    │──────────────────────►│
                           │   Report     │  (4) Save Progress    │
                           └──────────────┘                       │
```

---

## النتيجة المتوقعة

```text
✅ اختيار أي مشروع محفوظ من الـ Dropdown
✅ تحميل بنود BOQ تلقائياً وتجميعها حسب Category
✅ حساب مؤشرات EVM من البيانات الحقيقية
✅ إمكانية التبديل بين البيانات النموذجية والحقيقية
✅ تحديث نسبة التقدم وحفظها في قاعدة البيانات
✅ ربط الجدول مباشرة ببنود الكميات
✅ تصدير Excel مع البيانات الحقيقية
✅ دعم ثنائي اللغة
```

---

## القسم التقني

### Interface Updates:

```typescript
interface ProjectData {
  id: string;
  name: string;
  currency: string | null;
  total_value: number | null;
  items_count: number | null;
  created_at: string;
}

interface ProjectItem {
  id: string;
  project_id: string;
  item_number: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
}

// Extended EVMActivity for real data
interface EVMActivityExtended extends EVMActivity {
  itemsCount?: number;
  items?: ProjectItem[];
  isEditable?: boolean;
}
```

### EVM Calculations:

```typescript
const calculateEVMFromItems = (items: ProjectItem[], progressPercent: number) => {
  const pv = items.reduce((sum, i) => sum + (i.total_price || 0), 0);
  const ev = pv * (progressPercent / 100);
  const costVarianceFactor = 1.015; // افتراضي 1.5% تجاوز
  const ac = ev * costVarianceFactor;
  
  const cv = ev - ac;
  const sv = ev - pv;
  const cpi = ac > 0 ? ev / ac : 1;
  const spi = pv > 0 ? ev / pv : 0;
  
  const bac = pv;
  const eac1 = cpi > 0 ? bac / cpi : bac;
  const eac2 = ac + (bac - ev);
  const eac3 = cpi > 0 && spi > 0 ? ac + ((bac - ev) / (cpi * spi)) : bac;
  const eacByPert = (eac1 + 4 * eac2 + eac3) / 6;
  const etc = eacByPert - ac;
  const tcpi = (bac - ev) > 0 ? (bac - ev) / (bac - ac) : 0;
  
  return { pv, ev, ac, cv, sv, cpi, spi, eacByPert, etc, tcpi };
};
```
