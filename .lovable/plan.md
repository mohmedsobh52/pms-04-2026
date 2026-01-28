

# خطة إصلاح مشكلة ظهور الـ Dialogs في الخلفية

## تحليل المشكلة

من فحص الـ Console logs، يظهر الخطأ التالي:
```
Warning: Function components cannot be given refs.
Check the render method of `ProjectDetailsPage`.
    at AutoPriceDialog
```

### السبب الجذري
عند استخدام Radix UI Dialog مع React، يحاول Radix تمرير refs للمكونات. إذا لم يتم التعامل معها بشكل صحيح:
1. يحدث خطأ ref warning في Console
2. Dialog لا يُعرض بشكل صحيح (يظهر في الخلفية أو لا يظهر أصلاً)
3. Focus trapping يتعطل

### حالة الـ Dialogs الحالية

| Dialog | `memo` wrapper | `onOpenAutoFocus` | الحالة |
|--------|----------------|-------------------|--------|
| `QuickPriceDialog` | مُضاف | مُضاف | يعمل |
| `EditItemDialog` | مُضاف | مُضاف | يعمل |
| `DetailedPriceDialog` | مُضاف | **مفقود** | يظهر في الخلفية |
| `AutoPriceDialog` | **مفقود** | **مفقود** | يظهر في الخلفية |

---

## الحل المطلوب

### الملف 1: `src/components/project-details/AutoPriceDialog.tsx`

#### التغييرات:
1. إضافة `memo` للـ imports
2. تغيير اسم الدالة إلى `AutoPriceDialogComponent`
3. إضافة `onOpenAutoFocus` و `onCloseAutoFocus` في `DialogContent`
4. تغليف المكون بـ `memo` وتصديره

```typescript
// السطر 1: إضافة memo
import { useState, useMemo, memo } from "react";

// السطر 47: تغيير اسم الدالة
function AutoPriceDialogComponent({
  isOpen,
  onClose,
  // ...
}: AutoPriceDialogProps) {

// السطر 217-218: تحديث DialogContent
<DialogContent 
  className="max-w-3xl max-h-[80vh] overflow-hidden"
  onOpenAutoFocus={(e) => e.preventDefault()}
  onCloseAutoFocus={(e) => e.preventDefault()}
>

// نهاية الملف: إضافة wrapper
const AutoPriceDialog = memo(AutoPriceDialogComponent);
AutoPriceDialog.displayName = "AutoPriceDialog";

export { AutoPriceDialog };
```

### الملف 2: `src/components/pricing/DetailedPriceDialog.tsx`

#### التغيير:
إضافة `onOpenAutoFocus` و `onCloseAutoFocus` في `DialogContent`:

```typescript
// السطر 139: تحديث DialogContent
<DialogContent 
  className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
  onOpenAutoFocus={(e) => e.preventDefault()}
  onCloseAutoFocus={(e) => e.preventDefault()}
>
```

### الملف 3: `src/components/pricing/MaterialsSelectionTab.tsx`

#### التغيير:
إضافة `onOpenAutoFocus` و `onCloseAutoFocus` في `DialogContent`:

```typescript
<DialogContent 
  className="max-w-2xl"
  onOpenAutoFocus={(e) => e.preventDefault()}
  onCloseAutoFocus={(e) => e.preventDefault()}
>
```

### الملف 4: `src/components/pricing/LaborSelectionTab.tsx`

#### التغيير:
إضافة `onOpenAutoFocus` و `onCloseAutoFocus` في `DialogContent`:

```typescript
<DialogContent 
  className="max-w-2xl"
  onOpenAutoFocus={(e) => e.preventDefault()}
  onCloseAutoFocus={(e) => e.preventDefault()}
>
```

### الملف 5: `src/components/pricing/EquipmentSelectionTab.tsx`

#### التغيير:
إضافة `onOpenAutoFocus` و `onCloseAutoFocus` في `DialogContent`:

```typescript
<DialogContent 
  className="max-w-2xl"
  onOpenAutoFocus={(e) => e.preventDefault()}
  onCloseAutoFocus={(e) => e.preventDefault()}
>
```

---

## ملخص الملفات المتأثرة

| الملف | التغييرات |
|-------|-----------|
| `src/components/project-details/AutoPriceDialog.tsx` | إضافة `memo` + focus preventions |
| `src/components/pricing/DetailedPriceDialog.tsx` | إضافة focus preventions |
| `src/components/pricing/MaterialsSelectionTab.tsx` | إضافة focus preventions |
| `src/components/pricing/LaborSelectionTab.tsx` | إضافة focus preventions |
| `src/components/pricing/EquipmentSelectionTab.tsx` | إضافة focus preventions |

---

## النتيجة المتوقعة

| قبل الإصلاح | بعد الإصلاح |
|------------|------------|
| Auto Price dialog يظهر في الخلفية | Auto Price dialog يظهر في المقدمة |
| Detailed Price dialog يظهر في الخلفية | Detailed Price dialog يظهر في المقدمة |
| ظهور ref warnings في Console | لا توجد warnings |
| تعطل focus trapping | Focus يعمل بشكل صحيح |

---

## خطوات الاختبار

1. فتح صفحة تفاصيل المشروع
2. الذهاب لتبويب BOQ
3. النقر على "Auto Price" - التحقق من ظهور dialog في المقدمة
4. إغلاق dialog
5. النقر على زر ⋮ لأي بند → Quick Price - التحقق من ظهور dialog
6. إغلاق dialog
7. النقر على زر ⋮ لأي بند → Detailed Price - التحقق من ظهور dialog
8. داخل Detailed Price، اختبار إضافة مواد/عمالة/معدات - التحقق من ظهور dialogs الفرعية
9. التحقق من عدم وجود warnings في Console

