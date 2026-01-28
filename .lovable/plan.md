
# خطة إصلاح خانات التعبئة في صفحة إنشاء مشروع جديد

## المشكلة

حقول الإدخال (Input و Textarea) في صفحة `/projects/new` لا تستجيب للنقر أو الكتابة، رغم أن القوائم المنسدلة (Select) تعمل.

## تحليل السبب الجذري

في ملف `dialog-custom.css`، الـ CSS class `.form-card-safe` يحتوي على:

```css
.form-card-safe input,
.form-card-safe textarea,
.form-card-safe button:not([data-radix-select-trigger]) {
  position: relative;
  z-index: 20;  /* ❌ منخفض جداً */
  pointer-events: auto !important;
}
```

**المشاكل:**
1. `z-index: 20` منخفض جداً مقارنة بـ `z-index: 55` للـ Select triggers
2. لا يوجد `cursor: text` للـ inputs مما قد يؤثر على UX
3. قد تكون هناك طبقات أخرى تتداخل مع الحقول

---

## الحل

### ملف: `src/components/ui/dialog-custom.css`

**تحديث قواعد `.form-card-safe`:**

| العنصر | z-index الحالي | z-index المقترح |
|--------|----------------|-----------------|
| `.form-card-safe` | 10 | 10 (بدون تغيير) |
| `input, textarea` | 20 | **45** |
| `button` | 20 | 45 |
| `SelectTrigger` | 55 | 55 (بدون تغيير) |

**الكود المحدث:**

```css
.form-card-safe {
  position: relative;
  z-index: 10;
}

.form-card-safe [data-radix-select-trigger] {
  position: relative;
  z-index: 55;
  pointer-events: auto !important;
  cursor: pointer !important;
}

.form-card-safe input,
.form-card-safe textarea {
  position: relative;
  z-index: 45;  /* ← رفع من 20 إلى 45 */
  pointer-events: auto !important;
  cursor: text !important;  /* ← إضافة جديدة */
}

.form-card-safe button:not([data-radix-select-trigger]) {
  position: relative;
  z-index: 45;  /* ← رفع من 20 إلى 45 */
  pointer-events: auto !important;
  cursor: pointer !important;
}

.form-card-safe label {
  pointer-events: auto !important;
  cursor: pointer !important;
}
```

---

### ملف: `src/pages/NewProjectPage.tsx` (اختياري)

إضافة classes صريحة للـ Input fields للتأكد من عملها:

```tsx
<Input
  id="name"
  value={formData.name}
  onChange={(e) => handleInputChange("name", e.target.value)}
  placeholder={...}
  required
  className="h-11 text-base relative z-[45] pointer-events-auto"  /* ← إضافة */
/>
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/ui/dialog-custom.css` | تحديث z-index للـ inputs و textareas من 20 إلى 45، إضافة `cursor: text` |
| `src/pages/NewProjectPage.tsx` | (اختياري) إضافة classes صريحة للحقول |

---

## التغييرات التفصيلية

### `dialog-custom.css` - تحديث قسم FORM CARD PROTECTION

**من:**
```css
.form-card-safe input,
.form-card-safe textarea,
.form-card-safe button:not([data-radix-select-trigger]) {
  position: relative;
  z-index: 20;
  pointer-events: auto !important;
}
```

**إلى:**
```css
.form-card-safe input,
.form-card-safe textarea {
  position: relative;
  z-index: 45;
  pointer-events: auto !important;
  cursor: text !important;
}

.form-card-safe input:focus,
.form-card-safe textarea:focus {
  z-index: 50;
  outline: none;
}

.form-card-safe button:not([data-radix-select-trigger]):not([data-radix-popover-trigger]) {
  position: relative;
  z-index: 45;
  pointer-events: auto !important;
  cursor: pointer !important;
}
```

---

## تسلسل z-index النهائي

| العنصر | z-index |
|--------|---------|
| Dialog Content | 100 |
| Dialog Overlay | 99 |
| Select Content | 70 |
| Form Actions Buttons | 65 |
| Form Actions Container | 60 |
| Select Trigger | 55 |
| Navigation Buttons | 51 |
| Input/Textarea (focused) | 50 |
| Input/Textarea | 45 |
| Breadcrumb Links | 46 |
| Breadcrumb | 45 |
| Form Card | 10 |

---

## النتيجة المتوقعة

| الحقل | قبل | بعد |
|-------|-----|-----|
| Project Name | ❌ لا يعمل | ✅ يعمل |
| Project Description | ❌ لا يعمل | ✅ يعمل |
| Project Location | ❌ لا يعمل | ✅ يعمل |
| Client Name | ❌ لا يعمل | ✅ يعمل |
| Estimated Value | ❌ لا يعمل | ✅ يعمل |
| Currency Select | ✅ يعمل | ✅ يعمل |
| Project Type Select | ✅ يعمل | ✅ يعمل |
| Date Pickers | ✅ يعمل | ✅ يعمل |

---

## ملاحظات تقنية

1. **سبب اختيار z-index: 45**: 
   - أعلى من Breadcrumbs (45-46)
   - أقل من Select Triggers (55)
   - لا يتعارض مع Dialog Overlays (99)

2. **cursor: text**: يُحسن تجربة المستخدم بإظهار مؤشر الكتابة عند التمرير فوق الحقول

3. **:focus z-index: 50**: يضمن أن الحقل النشط يظهر فوق العناصر الأخرى
