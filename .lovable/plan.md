
# خطة إصلاح أخطاء صفحة التقارير

## المشاكل المكتشفة

### 1. تحذير React Ref
```
Warning: Function components cannot be given refs. 
Check the render method of `ExportTab`.
```
السبب: استخدام مكون `Select` بشكل قد يمرر ref بشكل غير صحيح.

### 2. PriceAnalysisTab لا يجلب البنود ديناميكياً
- تم تحديث `ExportTab` سابقاً ليجلب البنود من `project_items` عندما لا توجد في `analysis_data`
- لكن `PriceAnalysisTab` لا يزال يعتمد فقط على `getProjectItems` بدون جلب من قاعدة البيانات
- هذا يجعل الأزرار معطلة رغم وجود البيانات

### 3. عدم تناسق في جلب البيانات
- `ReportsTab` يجلب البنود للمشاريع التي تحتاجها
- لكن `PriceAnalysisTab` يستخدم `items` من `useMemo` دون fallback

---

## الحل المقترح

### ملف: `src/components/reports/PriceAnalysisTab.tsx`

**التغييرات:**

1. إضافة state لـ `dynamicItems` و `isLoadingItems` مثل ExportTab
2. إضافة `useEffect` لجلب البنود من `project_items` عند الحاجة
3. استخدام `dynamicItems` بدلاً من `items` المحلي
4. إضافة مؤشر تحميل وتعطيل الأزرار أثناء الجلب

```typescript
// إضافة state جديد
const [dynamicItems, setDynamicItems] = useState<any[]>([]);
const [isLoadingItems, setIsLoadingItems] = useState(false);

// إضافة useEffect لجلب البنود
useEffect(() => {
  const fetchItems = async () => {
    if (!selectedProject) {
      setDynamicItems([]);
      return;
    }
    
    // أولاً: تحقق من analysis_data
    const localItems = getProjectItems(selectedProject);
    if (localItems.length > 0) {
      setDynamicItems(localItems);
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

// استخدام dynamicItems
const items = dynamicItems;
const hasData = items.length > 0 && !isLoadingItems;
```

### ملف: `src/components/reports/ExportTab.tsx`

**التغييرات:**

1. إزالة ref warning بإضافة `forwardRef` للـ Select wrapper أو تصحيح استخدامه

---

## ملخص الملفات والتغييرات

| الملف | التغيير |
|-------|---------|
| `PriceAnalysisTab.tsx` | إضافة جلب ديناميكي للبنود من قاعدة البيانات |
| `ExportTab.tsx` | تصحيح تحذير React ref |

---

## النتيجة المتوقعة

```
قبل الإصلاح:
❌ تحذير ref في console
❌ أزرار Price Analysis معطلة للمشاريع من project_data
❌ لا توجد بيانات رغم وجودها في قاعدة البيانات

بعد الإصلاح:
✅ لا تحذيرات في console
✅ جميع الأزرار تعمل بشكل صحيح
✅ البيانات تُجلب من المصدر الصحيح تلقائياً
✅ مؤشر تحميل أثناء جلب البيانات
```
