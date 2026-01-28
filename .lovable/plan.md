
# خطة إصلاح أزرار Quick Price و Detailed Price و Edit

## تحليل المشكلة

### السبب الجذري
من خلال فحص Console logs، يظهر خطأ:
```
Warning: Function components cannot be given refs. 
Check the render method of `QuickPriceDialog`.
```

هذا الخطأ يحدث لأن:
1. **مكون `QuickPriceDialog`** لم يتم تغليفه بـ `memo` و `forwardRef` مثل `EditItemDialog` و `DetailedPriceDialog`
2. **مكون `DialogFooter`** في `dialog.tsx` لا يدعم `forwardRef`، مما يسبب مشاكل مع Radix UI

### المشكلة في الواجهة
عند النقر على أي من الأزرار (Quick Price, Detailed Price, Edit):
- يتم استدعاء `onClick` handler بشكل صحيح
- يتم تعيين الـ state (`setSelectedItemForQuickPrice`, `setShowQuickPriceDialog`)
- لكن Dialog لا يظهر بسبب خطأ ref warning الذي يتسبب في مشاكل rendering

---

## الحل المقترح

### التغيير 1: تحديث `QuickPriceDialog.tsx`
تغليف المكون بـ `memo` لمنع مشاكل ref مع Radix UI:

```typescript
// قبل
export function QuickPriceDialog({ ... }: QuickPriceDialogProps) {
  // ...
}

// بعد
function QuickPriceDialogComponent({ ... }: QuickPriceDialogProps) {
  // ...
}

const QuickPriceDialog = memo(QuickPriceDialogComponent);
QuickPriceDialog.displayName = "QuickPriceDialog";

export { QuickPriceDialog };
```

### التغيير 2: تحديث `DialogFooter` في `dialog.tsx`
إضافة `forwardRef` لدعم Radix UI refs:

```typescript
// قبل
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);

// بعد
const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref}
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} 
    {...props} 
  />
));
```

### التغيير 3: تحديث `DialogHeader` في `dialog.tsx`
إضافة `forwardRef` للاتساق:

```typescript
const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref}
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} 
    {...props} 
  />
));
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/project-details/QuickPriceDialog.tsx` | إضافة `memo` wrapper |
| `src/components/ui/dialog.tsx` | إضافة `forwardRef` لـ `DialogHeader` و `DialogFooter` |

---

## التغييرات التفصيلية

### ملف 1: `src/components/project-details/QuickPriceDialog.tsx`

**السطر 1**: إضافة `memo` للـ imports
```typescript
import { useState, useMemo, memo } from "react";
```

**السطر 31**: تغيير اسم الدالة
```typescript
function QuickPriceDialogComponent({
```

**نهاية الملف**: إضافة wrapper
```typescript
// Wrap with memo to prevent ref warnings with Radix UI
const QuickPriceDialog = memo(QuickPriceDialogComponent);
QuickPriceDialog.displayName = "QuickPriceDialog";

export { QuickPriceDialog };
```

### ملف 2: `src/components/ui/dialog.tsx`

**السطر 54-57**: تحديث `DialogHeader`
```typescript
const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref}
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} 
    {...props} 
  />
));
DialogHeader.displayName = "DialogHeader";
```

**السطر 59-62**: تحديث `DialogFooter`
```typescript
const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref}
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} 
    {...props} 
  />
));
DialogFooter.displayName = "DialogFooter";
```

---

## النتيجة المتوقعة

### قبل الإصلاح:
- ❌ النقر على Quick Price لا يفتح dialog
- ❌ النقر على Detailed Price لا يفتح dialog  
- ❌ النقر على Edit لا يفتح dialog
- ⚠️ ظهور warning في Console

### بعد الإصلاح:
- ✓ النقر على Quick Price يفتح dialog التسعير السريع
- ✓ النقر على Detailed Price يفتح dialog التسعير المفصل
- ✓ النقر على Edit يفتح dialog التعديل
- ✓ لا توجد warnings في Console

---

## خطوات الاختبار

| الخطوة | النتيجة المتوقعة |
|-------|----------------|
| 1. فتح صفحة تفاصيل المشروع | - |
| 2. النقر على BOQ tab | ظهور جدول البنود |
| 3. النقر على زر ⋮ لأي بند | فتح القائمة المنسدلة |
| 4. النقر على Quick Price | فتح dialog التسعير السريع ✓ |
| 5. إغلاق dialog | - |
| 6. النقر على Detailed Price | فتح dialog التسعير المفصل ✓ |
| 7. إغلاق dialog | - |
| 8. النقر على Edit | فتح dialog التعديل ✓ |
