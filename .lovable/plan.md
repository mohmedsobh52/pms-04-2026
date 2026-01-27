
# خطة إصلاح أزرار التصدير (PDF/Excel)

## تشخيص المشكلة

### الأعراض
- أزرار PDF/Excel معطلة (disabled) رغم وجود مشاريع
- ظهور رسالة "لا توجد بيانات للتصدير"
- الأزرار لا تستجيب للنقرات

### السبب الجذري
بعد فحص قاعدة البيانات والكود، اكتشفت أن:

1. **مصدران منفصلان للبيانات**:
   - `saved_projects`: يحتوي على `analysis_data` (JSON كامل)
   - `project_data`: لا يحتوي على `analysis_data`، بل يخزن البنود في جدول منفصل `project_items`

2. **المشكلة في ReportsTab**:
   - يجلب من `project_data` و `saved_projects`
   - لكن مشاريع `project_data` لا تحتوي على `analysis_data`
   - فيصبح `hasData = false` والأزرار معطلة

3. **البيانات الفعلية موجودة**:
   - مشروع "الدلم" له 485 بند في `project_items`
   - مشروع "مشروع الشاطئ" له 130 بند
   - لكن لم يتم جلبها لأن الكود يعتمد على `analysis_data` فقط

---

## الحل المقترح

### 1. تحديث ReportsTab لجلب project_items

عندما يكون المشروع من `project_data` (بدون analysis_data)، يجب جلب البنود من `project_items`:

```typescript
// في fetchProjects()
// بعد جلب المشاريع، نضيف analysis_data للمشاريع من project_data
for (const project of projectData) {
  if (!project.analysis_data) {
    const { data: items } = await supabase
      .from("project_items")
      .select("*")
      .eq("project_id", project.id);
    
    project.analysis_data = {
      items: items || [],
      summary: {
        total_value: project.total_value || 0,
        total_items: project.items_count || 0,
        currency: project.currency || 'SAR'
      }
    };
  }
}
```

### 2. تحديث ExportTab لدعم جلب البنود ديناميكياً

إضافة دالة لجلب البنود من `project_items` عند الحاجة:

```typescript
const fetchProjectItems = async (projectId: string) => {
  const { data } = await supabase
    .from("project_items")
    .select("*")
    .eq("project_id", projectId)
    .order("item_number");
  return data || [];
};
```

### 3. دعم البيانات من مصادر متعددة

تحديث `getProjectItems()` للتحقق من:
1. `analysis_data.items` (saved_projects)
2. جدول `project_items` (project_data)

---

## التغييرات التفصيلية

### ملف: `src/components/projects/ReportsTab.tsx`

**التغيير 1**: إضافة جلب project_items للمشاريع بدون analysis_data

```typescript
const fetchProjects = async () => {
  // ... الكود الحالي ...
  
  // إضافة: جلب البنود للمشاريع من project_data
  for (const p of projectData) {
    if (!p.analysis_data) {
      const { data: items } = await supabase
        .from("project_items")
        .select("*")
        .eq("project_id", p.id);
      
      p.analysis_data = {
        items: items || [],
        summary: {
          total_value: p.total_value || 0,
          total_items: p.items_count || 0,
          currency: p.currency || 'SAR'
        }
      };
    }
  }
  // ... باقي الكود ...
};
```

### ملف: `src/components/reports/ExportTab.tsx`

**التغيير 1**: إضافة جلب البنود ديناميكياً عند تغيير المشروع

```typescript
const [dynamicItems, setDynamicItems] = useState<any[]>([]);
const [isLoadingItems, setIsLoadingItems] = useState(false);

// جلب البنود عند تغيير المشروع
useEffect(() => {
  const fetchItems = async () => {
    if (!selectedProject) return;
    
    // أولاً: تحقق من analysis_data
    const items = getProjectItems(selectedProject);
    if (items.length > 0) {
      setDynamicItems(items);
      return;
    }
    
    // ثانياً: جلب من project_items
    setIsLoadingItems(true);
    const { data } = await supabase
      .from("project_items")
      .select("*")
      .eq("project_id", selectedProject.id)
      .order("item_number");
    
    setDynamicItems(data || []);
    setIsLoadingItems(false);
  };
  
  fetchItems();
}, [selectedProject]);
```

**التغيير 2**: استخدام dynamicItems بدلاً من projectItems

```typescript
// تغيير hasData للاستخدام الديناميكي
const hasData = dynamicItems.length > 0;

// تحديث كل دوال التصدير لاستخدام dynamicItems
const handleExportBOQ = () => {
  if (dynamicItems.length === 0) { ... }
  exportBOQToExcel(dynamicItems, selectedProject?.name || "Project");
};
```

**التغيير 3**: إضافة مؤشر تحميل

```typescript
{isLoadingItems && (
  <div className="flex items-center gap-2 text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" />
    {isArabic ? "جاري تحميل البيانات..." : "Loading data..."}
  </div>
)}
```

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `ReportsTab.tsx` | جلب project_items للمشاريع بدون analysis_data |
| `ExportTab.tsx` | إضافة جلب ديناميكي للبنود + مؤشر تحميل |

---

## النتيجة المتوقعة

```
قبل الإصلاح:
❌ الأزرار معطلة للمشاريع من project_data
❌ hasData: false رغم وجود 485 بند

بعد الإصلاح:
✅ الأزرار تعمل لجميع المشاريع
✅ البيانات تُجلب من المصدر الصحيح تلقائياً
✅ مؤشر تحميل واضح أثناء جلب البيانات
✅ دعم كامل لـ saved_projects و project_data
```

---

## تفاصيل تقنية إضافية

### تنسيق البيانات المتوقع
```typescript
// من saved_projects.analysis_data
{ items: [...], summary: { total_value, currency } }

// من project_items (يتم تحويله)
[{ item_number, description, unit, quantity, unit_price, total_price, category }]
```

### الأولوية في جلب البيانات
1. `analysis_data.items` (إذا موجود)
2. `analysis_data.boq_items` (بديل)
3. `project_items` جدول منفصل (fallback)
