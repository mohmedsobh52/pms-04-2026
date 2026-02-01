

# خطة إصلاح زر Fast Extraction الذي لا يعمل

## ملخص المشكلة

عند الضغط على زر "Fast Extraction" في تبويب المرفقات (Attachments) داخل صفحة المشاريع، **لا يحدث أي شيء** رغم أن المستخدم مسجل دخول.

## التحليل الفني

بعد فحص الكود، تم اكتشاف المشاكل التالية:

### المشكلة 1: CSS يحجب النقر على الزر

الملف `dialog-custom.css` يحتوي على قاعدة CSS تؤثر على العناصر:

```css
[data-state="closed"] {
  animation-duration: 0ms !important;
}
```

هذا قد يتداخل مع أزرار أخرى. لكن الأهم أن **زر Fast Extraction ليس لديه حماية CSS** مثل الأزرار الأخرى في المشروع.

### المشكلة 2: الزر غير محمي بـ CSS Classes

الأزرار الأخرى في المشروع تستخدم classes مثل:
- `project-actions-section`
- `card-actions-safe`
- `tabs-navigation-safe`

لكن زر Fast Extraction لا يستخدم أي من هذه الـ classes.

### المشكلة 3: عنصر Card يحجب الزر

الـ `Card` component في السطر 121-157 قد يحجب الزر بسبب طريقة ترتيب العناصر:

```typescript
<div className="flex flex-wrap items-center gap-3">
  <Button ...>Fast Extraction</Button>
  
  {!showFastExtraction && (
    <Card className="flex-1 min-w-[280px] ...">  // ← هذا قد يحجب الزر
      ...
    </Card>
  )}
</div>
```

### المشكلة 4: Sheet/Dialog overlay قد يكون نشطاً

`FastExtractionPanel` يستخدم `ProjectFilesViewer` الذي يستخدم `Sheet` component. إذا لم يُغلق بشكل صحيح، قد يترك overlay غير مرئي يحجب النقر.

## خطة الإصلاح

### التغيير 1: إضافة CSS protection للزر

```typescript
// في AttachmentsTab.tsx
<div className="flex flex-wrap items-center gap-3 card-actions-safe">
  <Button
    onClick={() => setShowFastExtraction(!showFastExtraction)}
    variant={showFastExtraction ? "secondary" : "default"}
    className={cn(
      "gap-2 shadow-sm transition-all z-60",  // إضافة z-60
      "pointer-events-auto",                   // ضمان قابلية النقر
      showFastExtraction && "bg-primary/10 border-primary/30"
    )}
  >
```

### التغيير 2: إضافة console.log للتشخيص (مؤقت)

```typescript
const handleFastExtractionToggle = () => {
  console.log("Fast Extraction button clicked, current state:", showFastExtraction);
  setShowFastExtraction(!showFastExtraction);
};
```

### التغيير 3: إصلاح ترتيب العناصر (z-index)

```css
/* في dialog-custom.css */
.attachments-actions-safe {
  position: relative;
  z-index: 65;
  pointer-events: auto !important;
}

.attachments-actions-safe button {
  position: relative;
  z-index: 70;
  pointer-events: auto !important;
  cursor: pointer !important;
}
```

### التغيير 4: إضافة onOpenAutoFocus prevention للـ Sheet

```typescript
// في FastExtractionPanel.tsx - ProjectFilesViewer
<Sheet open={showProjectFiles} onOpenChange={...}>
  <SheetContent
    onOpenAutoFocus={(e) => e.preventDefault()}
    onCloseAutoFocus={(e) => e.preventDefault()}
    ...
  >
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/projects/AttachmentsTab.tsx` | إضافة CSS class للحماية + z-index للزر |
| `src/components/ui/dialog-custom.css` | إضافة `.attachments-actions-safe` class |
| `src/components/fast-extraction/FastExtractionPanel.tsx` | إضافة focus prevention للـ Sheet |
| `src/components/ProjectFilesViewer.tsx` | إضافة focus prevention للـ Sheet |

## الكود النهائي

### AttachmentsTab.tsx (التغييرات)

```typescript
// سطر 93-116 - إضافة class للحماية ومعالج منفصل للزر
return (
  <div className="space-y-6">
    {/* Quick Actions Bar - مع حماية CSS */}
    <div className="flex flex-wrap items-center gap-3 attachments-actions-safe">
      <Button
        onClick={() => {
          console.log("Toggle Fast Extraction:", !showFastExtraction);
          setShowFastExtraction(!showFastExtraction);
        }}
        variant={showFastExtraction ? "secondary" : "default"}
        className={cn(
          "gap-2 shadow-sm transition-all",
          "relative z-[70] pointer-events-auto",
          showFastExtraction && "bg-primary/10 border-primary/30"
        )}
      >
```

### dialog-custom.css (الإضافات)

```css
/* Attachments tab actions protection */
.attachments-actions-safe {
  position: relative;
  z-index: 65;
  pointer-events: auto;
}

.attachments-actions-safe button {
  position: relative;
  z-index: 70;
  pointer-events: auto !important;
  cursor: pointer !important;
}
```

### ProjectFilesViewer.tsx (التغييرات)

```typescript
// سطر 206 - إضافة focus prevention
<SheetContent 
  side={isArabic ? "left" : "right"} 
  className="w-full sm:max-w-lg"
  onOpenAutoFocus={(e) => e.preventDefault()}
  onCloseAutoFocus={(e) => e.preventDefault()}
>
```

## سبب هذا الحل

1. **z-index Protection**: يضمن أن الزر يظهر فوق أي عناصر قد تحجبه
2. **pointer-events: auto**: يتجاوز أي قواعد CSS قد تمنع النقر
3. **Focus Prevention**: يمنع Sheet من احتجاز الـ focus بعد الإغلاق
4. **Console Log**: للتأكد من أن onClick يُنفذ (يُزال بعد الإصلاح)

## مخطط التدفق

```text
قبل الإصلاح:
┌─────────────────┐     ┌──────────────────────┐
│ زر Fast Extract │ ──► │ onClick لا يُنفذ      │
│ (بدون حماية)    │     │ (محجوب بـ overlay)    │
└─────────────────┘     └──────────────────────┘

بعد الإصلاح:
┌─────────────────────────────┐     ┌──────────────────────┐
│ زر Fast Extract             │ ──► │ onClick يُنفذ        │
│ z-index: 70                 │     │ showFastExtraction   │
│ pointer-events: auto        │     │ يتغير لـ true        │
│ class: attachments-actions  │     └──────────────────────┘
└─────────────────────────────┘              │
                                             ▼
                               ┌──────────────────────┐
                               │ FastExtractionPanel  │
                               │ يظهر بشكل صحيح       │
                               └──────────────────────┘
```

## ملاحظات للاختبار

بعد التنفيذ، يجب اختبار:
1. الضغط على زر Fast Extraction - يجب أن تظهر اللوحة
2. الضغط على X أو "Close Extraction" - يجب أن تختفي اللوحة
3. التبديل بين الوضعين عدة مرات
4. فتح Project Files Viewer ثم إغلاقه - يجب أن يبقى الزر يعمل

