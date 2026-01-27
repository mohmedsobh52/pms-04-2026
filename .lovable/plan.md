

# خطة حل مشكلة حقول الإدخال والقوائم المنسدلة في إعدادات الشركة

## المشكلة

حقول الإدخال (Inputs) والقوائم المنسدلة (Select/Dropdown) والمزلقات (Sliders) في صفحة الإعدادات غير نشطة ولا تستجيب للنقر.

---

## تحليل السبب

المشكلة تشبه ما تم حله سابقاً في الصفحات الأخرى - عناصر Radix UI overlay قد تُعيق pointer-events على العناصر التفاعلية.

---

## الحل المقترح

### 1. تحديث `src/components/CompanySettingsPanel.tsx`

إضافة classes حماية للعناصر التفاعلية داخل البطاقات:

**التغييرات:**

```tsx
// إضافة class حماية للبطاقات
<Card className="order-2 lg:order-1 relative z-10">
  {/* محتوى البطاقة */}
</Card>

// إضافة class للـ Select trigger لضمان تفعيله
<SelectTrigger className="relative z-20 pointer-events-auto">
  <SelectValue />
</SelectTrigger>

// إضافة class للـ Sliders
<Slider
  className="cursor-pointer relative z-20 pointer-events-auto"
/>
```

### 2. تحديث `src/components/ui/dialog-custom.css`

إضافة قواعد CSS جديدة لحماية حقول الإدخال والنماذج:

```css
/* Form elements protection in Settings page */
.settings-form-safe {
  position: relative;
  z-index: 10;
  pointer-events: auto !important;
}

.settings-form-safe input,
.settings-form-safe textarea,
.settings-form-safe button,
.settings-form-safe [data-radix-select-trigger] {
  position: relative;
  z-index: 20;
  pointer-events: auto !important;
  cursor: pointer !important;
}

/* Slider protection */
[data-radix-slider-root] {
  position: relative;
  z-index: 20;
  pointer-events: auto !important;
}

[data-radix-slider-thumb] {
  pointer-events: auto !important;
  cursor: grab !important;
}

[data-radix-slider-track] {
  pointer-events: auto !important;
}
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/CompanySettingsPanel.tsx` | إضافة classes حماية |
| `src/components/ui/dialog-custom.css` | إضافة قواعد CSS للنماذج |

---

## النتيجة المتوقعة

- جميع حقول الإدخال (Company Name, Phone, Email, etc.) تستجيب للنقر والكتابة
- القائمة المنسدلة (Default Currency) تفتح عند النقر
- المزلقات (Profit Margin, Overhead, etc.) تستجيب للسحب

