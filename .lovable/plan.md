
# خطة حل مشكلة ملفات المشروع وحفظ الكميات المستخرجة

## المشاكل المحددة

### المشكلة 1: الملفات لا تظهر في Project Files
بعد تحليل الكود، وجدت أن الملفات تُحفظ بشكل صحيح في جدول `project_attachments`، لكن يجب التحقق من العلاقة مع جدول `saved_projects` vs `project_data`.

### المشكلة 2: الكميات المستخرجة لا تُحفظ مع الملفات
- نتائج تحليل المخططات (`drawingResults`) تبقى في حالة محلية فقط
- لا يتم تمريرها إلى مكون `FastExtractionProjectSelector`
- لا يتم حفظها في عمود `analysis_result` في جدول `project_attachments`

## الحل المقترح

### التغييرات في FastExtractionPage.tsx

```text
- تمرير drawingResults إلى FastExtractionProjectSelector
- Props الجديدة: drawingResults للكميات المستخرجة
```

### التغييرات في FastExtractionProjectSelector.tsx

```text
1. استقبال drawingResults كـ prop جديد
2. عند حفظ الملفات، ربط نتائج التحليل بكل ملف
3. تحديث payload الإدراج ليشمل:
   - is_analyzed: true (إذا كان الملف مُحلل)
   - analysis_result: JSON بالكميات المستخرجة
```

### هيكل البيانات المحفوظة

```typescript
// لكل ملف في project_attachments
{
  file_name: "المخططات.pdf",
  category: "drawings",
  is_analyzed: true,
  analysis_result: {
    success: true,
    quantities: [
      { item_number: "1", description: "...", quantity: 100, unit: "m²" },
      // ... المزيد من البنود
    ],
    drawing_info: { title: "...", type: "civil", scale: "1:100" },
    summary: { totalItems: 25, categories: ["civil", "structural"] }
  }
}
```

## تفاصيل التنفيذ

### 1. تعديل FastExtractionPage.tsx (السطور 250-252)

```typescript
// قبل
<FastExtractionProjectSelector files={files} />

// بعد
<FastExtractionProjectSelector 
  files={files} 
  drawingResults={drawingResults}
/>
```

### 2. تعديل FastExtractionProjectSelector.tsx

#### إضافة Props جديدة:
```typescript
interface FastExtractionProjectSelectorProps {
  files: UploadedFile[];
  drawingResults?: DrawingAnalysisResult[]; // جديد
}
```

#### تعديل دالة handleSave:
```typescript
// ربط نتائج التحليل بكل ملف
const attachments = successFiles.map((file) => {
  // البحث عن نتيجة تحليل هذا الملف
  const analysisResult = drawingResults?.find(r => 
    r.fileName === file.name || r.fileId === file.id
  );
  
  return {
    project_id: projectId,
    user_id: user.id,
    file_name: file.name,
    file_path: file.storagePath!,
    file_type: file.type,
    file_size: file.size,
    category: file.category || "general",
    // إضافة نتائج التحليل
    is_analyzed: !!analysisResult?.success,
    analysis_result: analysisResult ? {
      success: analysisResult.success,
      quantities: analysisResult.quantities,
      drawing_info: analysisResult.drawingInfo,
      summary: analysisResult.summary
    } : null
  };
});
```

### 3. تحسين عرض الملفات في ProjectFilesViewer

- إضافة مؤشر للملفات التي تحتوي على كميات مستخرجة
- عرض عدد البنود المستخرجة بجانب كل ملف

## النتيجة المتوقعة

```text
بعد التغييرات:
1. ✅ الملفات المرفوعة تظهر في Project Files
2. ✅ الكميات المستخرجة تُحفظ مع كل ملف
3. ✅ يمكن عرض الكميات لاحقاً من صفحة الملفات
4. ✅ مؤشر بصري يوضح الملفات المحللة
```

## الملفات المطلوب تعديلها

| الملف | نوع التغيير |
|-------|-------------|
| `src/pages/FastExtractionPage.tsx` | تمرير drawingResults |
| `src/components/FastExtractionProjectSelector.tsx` | استقبال وحفظ نتائج التحليل |
| `src/components/ProjectFilesViewer.tsx` | عرض حالة التحليل |
