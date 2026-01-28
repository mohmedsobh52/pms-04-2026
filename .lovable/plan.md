
# خطة ربط شاشة التسعير التلقائي بأزرار الإجراءات

## المشكلات المحددة

### 1. شاشة التسعير التلقائي (الصورة الأولى)
الشاشة الموجودة في الصورة الأولى **غير موجودة** حالياً في صفحة `ProjectDetailsPage.tsx`. 

الدالة الحالية `handleAutoPricing` تقوم فقط بـ:
```typescript
const estimatedPrice = Math.round(Math.random() * 100 + 10);
```
أي تعيين أسعار عشوائية بدون أي منطق ذكي أو واجهة مستخدم!

### 2. زر Quick Price
يعمل ويفتح dialog بسيط لإدخال السعر **يدوياً**، ولكنه غير مربوط بمكتبة الأسعار المحلية (`material_prices`, `labor_rates`, `equipment_rates`).

### 3. زر Edit  
يعمل بشكل صحيح ويفتح `EditItemDialog`.

### 4. "Edited price" (السعر المعدل)
غير موجود كخيار منفصل في القائمة الحالية.

---

## الحل المقترح

### 1. إنشاء مكون AutoPriceDialog جديد
إنشاء dialog للتسعير التلقائي يحتوي على:
- شريط تحديد الحد الأدنى للثقة (50%, 30%, 70%, 80%)
- عرض ما سيحدث عند التطبيق
- زر معاينة لعرض النتائج قبل التطبيق
- زر إلغاء وتطبيق

### 2. ربط Quick Price بمكتبة الأسعار
تحديث زر "Quick Price" ليعرض اقتراحات من:
- جدول `material_prices`
- جدول `labor_rates`
- جدول `equipment_rates`

### 3. إضافة حالة "Edited Price"
إضافة badge لعرض البنود التي تم تعديل سعرها يدوياً.

---

## التغييرات التفصيلية

### ملف جديد: `src/components/project-details/AutoPriceDialog.tsx`

```tsx
interface AutoPriceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: ProjectItem[];
  onApplyPricing: (pricedItems: { id: string; price: number }[]) => void;
  isArabic: boolean;
  currency: string;
}

// يحتوي على:
// - Slider للحد الأدنى للثقة (30%, 50%, 70%, 80%)
// - شرح ما سيحدث (مطابقة البنود، تطبيق الأسعار، حساب الإجمالي)
// - زر معاينة يعرض النتائج المتوقعة
// - جدول معاينة للبنود مع الأسعار المقترحة والثقة
// - زر إلغاء وتطبيق
```

### تحديث: `src/pages/ProjectDetailsPage.tsx`

#### 1. إضافة state جديد:
```typescript
const [showAutoPriceDialog, setShowAutoPriceDialog] = useState(false);
```

#### 2. تحديث handleAutoPricing:
```typescript
const handleAutoPricing = () => {
  // فتح dialog التسعير التلقائي بدلاً من التسعير المباشر
  setShowAutoPriceDialog(true);
};
```

#### 3. تحديث handleQuickPrice لعرض اقتراحات:
```typescript
// استخدام findAllMatchingPrices من useMaterialPrices
// لعرض اقتراحات الأسعار من المكتبة
```

### تحديث: `src/components/project-details/ProjectBOQTab.tsx`

#### إضافة خيار جديد في القائمة المنسدلة:
```tsx
<DropdownMenuItem 
  onClick={() => onEditedPrice?.(item)}
  className="gap-2"
  disabled={!item.is_price_edited}
>
  <CheckCircle className="w-4 h-4" />
  {isArabic ? "عرض السعر المعدل" : "View Edited Price"}
</DropdownMenuItem>
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/project-details/AutoPriceDialog.tsx` | **إنشاء جديد** - dialog التسعير التلقائي |
| `src/pages/ProjectDetailsPage.tsx` | إضافة state + تحديث handleAutoPricing + إضافة useMaterialPrices |
| `src/components/project-details/ProjectBOQTab.tsx` | تحديث القائمة المنسدلة |

---

## تفاصيل AutoPriceDialog

### واجهة المستخدم:
```
┌─────────────────────────────────────────────────────┐
│                 ✨ التسعير التلقائي                  │
├─────────────────────────────────────────────────────┤
│  تسعير البنود تلقائياً من مكتبة الأسعار السعودية 2025  │
│                                                      │
│  الحد الأدنى للثقة                                   │
│  ┌──────────────────────────────────────────────┐   │
│  │ [50]  %  │ 30% │ 50% │ 70% │ 80% │           │   │
│  └──────────────────────────────────────────────┘   │
│  البنود ذات الثقة الأعلى من هذا الحد سيتم تسعيرها    │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ ✨ ما الذي سيحدث:                             │   │
│  │ • مطابقة أوصاف البنود مع مواد المكتبة        │   │
│  │ • تطبيق أسعار السوق السعودي 2025            │   │
│  │ • حساب الإجمالي لكل بند                      │   │
│  │ • البنود المسعرة مسبقاً لن تتأثر             │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│          [إلغاء]        [معاينة ✨]                  │
└─────────────────────────────────────────────────────┘
```

### منطق التسعير:
1. جلب جميع البنود غير المسعرة
2. لكل بند، البحث في `material_prices` باستخدام `findMatchingPrice`
3. حساب درجة الثقة بناءً على:
   - تطابق الاسم والوصف
   - تطابق الفئة
   - حداثة السعر
   - التحقق من المصدر
4. تصفية البنود حسب الحد الأدنى للثقة
5. عرض المعاينة للمستخدم
6. تطبيق الأسعار عند الموافقة

---

## النتيجة المتوقعة

### قبل التطبيق:
- زر "Auto Price" يقوم بتعيين أسعار عشوائية
- زر "Quick Price" يفتح dialog بسيط للإدخال اليدوي
- لا توجد معاينة للأسعار قبل التطبيق

### بعد التطبيق:
- زر "Auto Price" يفتح dialog متكامل مع خيارات الثقة
- زر "Quick Price" يعرض اقتراحات من مكتبة الأسعار
- معاينة كاملة للأسعار قبل التطبيق
- تسعير ذكي من قاعدة بيانات `material_prices`

---

## خطوات التنفيذ

1. **إنشاء AutoPriceDialog.tsx** مع واجهة المستخدم الكاملة
2. **تحديث ProjectDetailsPage.tsx** لإضافة dialog جديد وتحديث logic
3. **تحديث Quick Price dialog** لعرض اقتراحات من المكتبة
4. **اختبار التكامل** مع مكتبة الأسعار المحلية
