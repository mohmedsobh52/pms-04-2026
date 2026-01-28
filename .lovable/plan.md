
# خطة إصلاح مشكلة ظهور الـ Dialogs خلف الواجهة الرئيسية

## تحليل المشكلة الجذري

### المشكلة الحقيقية
من الصورة المرفقة، يظهر dialog "Auto Pricing" **خلف** واجهة Project Details الرئيسية. هذه ليست مشكلة في focus management (التي تم إصلاحها)، بل مشكلة **z-index**.

### السبب الجذري

#### 1. تعارض في z-index values

**في `src/components/ui/dialog.tsx` (السطر 22 و 39):**
```typescript
// DialogOverlay
className="fixed inset-0 z-50 bg-black/80"

// DialogContent  
className="fixed left-[50%] top-[50%] z-50 grid w-full..."
```

**في `src/components/ui/dialog-custom.css` (السطر 182-188):**
```css
[data-radix-dialog-content] {
  z-index: 100 !important;
}

[data-radix-dialog-overlay] {
  z-index: 99 !important;
}
```

**المشكلة:**
- الـ base classes في `dialog.tsx` تستخدم `z-50`
- الـ CSS override يحاول فرض `z-99` و `z-100` بـ `!important`
- لكن CSS specificity والـ Tailwind classes قد لا تطبق القيم بشكل صحيح
- النتيجة: Dialog يظهر بـ `z-50` بدلاً من `z-100`، مما يجعله خلف عناصر أخرى في الصفحة

#### 2. عناصر الصفحة قد تملك z-index أعلى

من `dialog-custom.css`، أرى أن:
- `.tabs-navigation-safe` له `z-index: 55`
- `.project-actions-section` له `z-index: 60`
- `.tender-card-header button` له `z-index: 65`
- `[data-radix-select-content]` له `z-index: 70`

**إذا كان Dialog على `z-50`، فهو أقل من معظم هذه العناصر!**

---

## الحل المطلوب

### التغيير: تحديث `src/components/ui/dialog.tsx`

تحديث z-index values في الـ base classes مباشرة بدلاً من الاعتماد على CSS override:

```typescript
// DialogOverlay - السطر 22
className="fixed inset-0 z-[99] bg-black/80"  // تغيير من z-50 إلى z-[99]

// DialogContent - السطر 39
className="fixed left-[50%] top-[50%] z-[100] grid w-full..."  // تغيير من z-50 إلى z-[100]
```

**لماذا `z-[99]` و `z-[100]` وليس `z-99` و `z-100`؟**
- Tailwind CSS لا يدعم `z-99` و `z-100` بشكل افتراضي
- نستخدم arbitrary values syntax: `z-[99]` و `z-[100]`
- هذا يضمن أن القيم تُطبق بشكل صحيح في Tailwind

**ملاحظة مهمة:**
- لا نحتاج لتعديل `dialog-custom.css` لأن القيم الجديدة في `dialog.tsx` ستُطبق مباشرة
- القيم في CSS ستبقى كـ fallback إضافي

---

## التسلسل الهرمي الجديد لـ z-index

| العنصر | z-index | الوصف |
|--------|---------|-------|
| **Dialog Overlay** | **99** | الخلفية المعتمة للـ dialog |
| **Dialog Content** | **100** | محتوى الـ dialog نفسه |
| Select/Dropdown Content | 70 | القوائم المنسدلة |
| Action Buttons | 60-65 | أزرار الإجراءات |
| Navigation Tabs | 55-56 | تبويبات التنقل |
| Base UI Elements | 10-50 | العناصر الأساسية |

**الآن Dialog سيكون دائماً في المقدمة!**

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/ui/dialog.tsx` | تحديث z-index في DialogOverlay و DialogContent من `z-50` إلى `z-[99]` و `z-[100]` |

---

## النتيجة المتوقعة

### قبل الإصلاح
- ❌ Auto Price dialog يظهر خلف الواجهة الرئيسية
- ❌ Detailed Price dialog يظهر خلف الواجهة الرئيسية
- ❌ Quick Price dialog قد يظهر خلف الواجهة
- ❌ Edit dialog قد يظهر خلف الواجهة

### بعد الإصلاح
- ✅ جميع الـ dialogs تظهر **في المقدمة دائماً**
- ✅ الخلفية المعتمة (overlay) تغطي الواجهة بالكامل
- ✅ لا يمكن التفاعل مع الواجهة الرئيسية أثناء فتح dialog
- ✅ Dialog content يكون دائماً قابل للنقر والتفاعل

---

## خطوات الاختبار

1. **فتح صفحة تفاصيل المشروع**
2. **الذهاب لتبويب BOQ**
3. **النقر على زر "Auto Price"**
   - ✅ التحقق من ظهور dialog في المقدمة
   - ✅ التحقق من أن الخلفية معتمة وتغطي الواجهة
   - ✅ التحقق من عدم إمكانية النقر على الواجهة الرئيسية
4. **إغلاق dialog**
5. **النقر على ⋮ لأي بند → Quick Price**
   - ✅ نفس التحققات أعلاه
6. **النقر على ⋮ لأي بند → Detailed Price**
   - ✅ نفس التحققات أعلاه
7. **النقر على ⋮ لأي بند → Edit**
   - ✅ نفس التحققات أعلاه
8. **داخل Detailed Price، النقر على "إضافة مادة/عمالة/معدة"**
   - ✅ التحقق من ظهور الـ sub-dialogs في المقدمة أيضاً

---

## التفاصيل التقنية

### لماذا z-[99] و z-[100]؟

**Tailwind CSS Default z-index Scale:**
```
z-0, z-10, z-20, z-30, z-40, z-50, z-auto
```

**Tailwind لا يدعم `z-99` أو `z-100` افتراضياً!**

لذلك نستخدم **Arbitrary Values Syntax**:
```typescript
z-[99]  // يُترجم إلى: z-index: 99;
z-[100] // يُترجم إلى: z-index: 100;
```

### لماذا لا نستخدم !important؟

- الـ CSS في `dialog-custom.css` يستخدم `!important` لكنه قد لا يُطبق بسبب specificity issues
- تحديث القيم مباشرة في component classes أكثر موثوقية
- Tailwind يُطبق الـ classes بشكل صحيح دون الحاجة لـ `!important`

### هل نحتاج لإزالة CSS overrides؟

**لا!** نترك CSS في `dialog-custom.css` كما هو:
- يعمل كـ **fallback إضافي**
- لا يضر الإبقاء عليه
- قد يفيد في حالات edge cases غير متوقعة

---

## ملخص التغيير

### الملف: `src/components/ui/dialog.tsx`

#### السطر 22: DialogOverlay z-index
```typescript
// قبل:
className={cn(
  "fixed inset-0 z-50 bg-black/80",
  className,
)}

// بعد:
className={cn(
  "fixed inset-0 z-[99] bg-black/80",
  className,
)}
```

#### السطر 39: DialogContent z-index
```typescript
// قبل:
className={cn(
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
  className,
)}

// بعد:
className={cn(
  "fixed left-[50%] top-[50%] z-[100] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
  className,
)}
```

**هذا كل شيء!** تغيير بسيط جداً لكنه يحل المشكلة بشكل نهائي.
