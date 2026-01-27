

# خطة إصلاح أزرار التصدير في تبويب Export

## المشكلة

أزرار التصدير (PDF, Print, Excel) داخل تبويب Export لا تعمل عند الضغط عليها.

## تحليل السبب

بعد مراجعة الكود، تبين أن:

1. **جميع الأزرار تحتوي على `disabled={!selectedProjectId}`** - يعني أنها تتطلب اختيار مشروع أولاً
2. **الدوال تتحقق من وجود البيانات**:
```typescript
if (!selectedProject?.analysis_data?.items) {
  toast.error("لا توجد بيانات للتصدير");
  return;
}
```

3. **مصدر البيانات**: المشاريع تأتي من `ReportsTab` الذي يجلب البيانات من `saved_projects` و `project_data`، لكن بنية `analysis_data` قد تختلف

## الحلول المقترحة

### 1. تحسين التحقق من البيانات

تعديل `ExportTab.tsx` للتعامل مع بنيات البيانات المختلفة:

```typescript
// التحقق من البيانات بشكل أفضل
const getProjectItems = () => {
  const data = selectedProject?.analysis_data;
  if (!data) return null;
  
  // دعم بنيات البيانات المختلفة
  return data.items || data.boq_items || data.analysisData?.items || [];
};

const handleExportComprehensivePDF = () => {
  const items = getProjectItems();
  if (!items || items.length === 0) {
    toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
    return;
  }
  // ... باقي الكود
};
```

### 2. إضافة تسجيل للتصحيح

إضافة console.log لتتبع المشكلة:

```typescript
const handleExportComprehensivePDF = () => {
  console.log("Selected Project:", selectedProject);
  console.log("Analysis Data:", selectedProject?.analysis_data);
  console.log("Items:", selectedProject?.analysis_data?.items);
  // ...
};
```

### 3. تحسين رسائل الخطأ

عرض رسالة توضيحية للمستخدم عند عدم وجود بيانات:

```typescript
{selectedProjectId && !selectedProject?.analysis_data?.items && (
  <Alert variant="warning">
    <AlertDescription>
      {isArabic 
        ? "هذا المشروع لا يحتوي على بيانات BOQ للتصدير" 
        : "This project has no BOQ data to export"}
    </AlertDescription>
  </Alert>
)}
```

---

## التعديلات المطلوبة

| الملف | التغيير |
|-------|---------|
| `src/components/reports/ExportTab.tsx` | تحسين التحقق من البيانات + إضافة دالة `getProjectItems` |

---

## التغييرات التفصيلية

### ExportTab.tsx

```typescript
// إضافة دالة للحصول على العناصر بشكل موحد
const getProjectItems = () => {
  if (!selectedProject?.analysis_data) return [];
  
  const data = selectedProject.analysis_data;
  
  // دعم بنيات البيانات المختلفة
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.boq_items)) return data.boq_items;
  if (data.analysisData && Array.isArray(data.analysisData.items)) {
    return data.analysisData.items;
  }
  
  return [];
};

const items = getProjectItems();
const hasData = items.length > 0;

// تحديث جميع الدوال لاستخدام getProjectItems
const handleExportComprehensivePDF = () => {
  const items = getProjectItems();
  if (items.length === 0) {
    toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
    return;
  }
  // ... باقي الكود يستخدم items
};

// تحديث الأزرار
<Button 
  onClick={handleExportComprehensivePDF}
  disabled={!selectedProjectId || !hasData}
  className="bg-primary hover:bg-primary/90"
>
  <FileDown className="h-4 w-4 mr-2" />
  PDF
</Button>
```

---

## النتيجة المتوقعة

```text
✅ دعم بنيات البيانات المختلفة (items, boq_items, analysisData.items)
✅ رسائل خطأ واضحة عند عدم وجود بيانات
✅ تعطيل الأزرار عند عدم وجود بيانات قابلة للتصدير
✅ عمل جميع أزرار التصدير بشكل صحيح
```

