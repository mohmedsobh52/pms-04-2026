
# خطة إصلاح أزرار تبويب "Price Analysis"

## المشكلة

أزرار PDF و Excel و View في تبويب "تحليل الأسعار" لا تستجيب للنقر بسبب تعارض `z-index` و `pointer-events` مع عناصر Radix UI.

## تحليل السبب

1. الأزرار موجودة داخل `Card > CardContent` بدون حماية `z-index`
2. لا تستخدم الـ Cards الحالية classes الحماية مثل `tender-card-safe`
3. Dialog overlay قد يحجب التفاعل مع الأزرار

## الحل المقترح

### 1. إضافة CSS classes جديدة للحماية

**ملف:** `src/components/ui/dialog-custom.css`

إضافة قواعد جديدة لحماية أزرار التقارير:

```css
/* ============================================
   REPORTS CARD PROTECTION
   Ensure report action buttons are always clickable
   ============================================ */

.reports-card-safe {
  position: relative;
  z-index: 10;
}

.reports-card-safe button,
.reports-card-safe .report-action-btn {
  position: relative;
  z-index: 65;
  pointer-events: auto !important;
  cursor: pointer !important;
}

/* Card actions container */
.card-actions-safe {
  position: relative;
  z-index: 60;
  pointer-events: auto !important;
}

.card-actions-safe button {
  position: relative;
  z-index: 65;
  pointer-events: auto !important;
  cursor: pointer !important;
}
```

### 2. تحديث `PriceAnalysisTab.tsx`

**التغييرات:**

1. إضافة class `reports-card-safe` للـ Cards الخاصة بالتقارير (سطر 615)
2. إضافة class `card-actions-safe` للـ div الذي يحتوي على الأزرار (سطر 630)
3. إضافة classes الحماية للأزرار نفسها

**من:**
```tsx
<Card key={card.id} className="border-border hover:shadow-md transition-shadow">
  ...
  <CardContent className="pt-2">
    <div className="flex justify-end">
      {card.actions}
    </div>
  </CardContent>
</Card>
```

**إلى:**
```tsx
<Card key={card.id} className="border-border hover:shadow-md transition-shadow reports-card-safe">
  ...
  <CardContent className="pt-2">
    <div className="flex justify-end card-actions-safe">
      {card.actions}
    </div>
  </CardContent>
</Card>
```

3. تحديث الأزرار في `reportCards` لإضافة classes الحماية:

**من:**
```tsx
<Button 
  variant="outline" 
  size="sm" 
  disabled={!hasData || isLoadingItems}
  onClick={() => handleExportPriceComparison('pdf')}
>
```

**إلى:**
```tsx
<Button 
  variant="outline" 
  size="sm" 
  disabled={!hasData || isLoadingItems}
  onClick={() => handleExportPriceComparison('pdf')}
  className="relative z-[65] pointer-events-auto"
>
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/ui/dialog-custom.css` | إضافة CSS classes جديدة للحماية |
| `src/components/reports/PriceAnalysisTab.tsx` | إضافة classes للـ Cards والأزرار |

---

## التغييرات التفصيلية

### `dialog-custom.css`

إضافة قواعد جديدة في نهاية الملف:

```css
/* REPORTS CARD PROTECTION */
.reports-card-safe {
  position: relative;
  z-index: 10;
}

.reports-card-safe button,
.reports-card-safe .report-action-btn {
  position: relative;
  z-index: 65;
  pointer-events: auto !important;
  cursor: pointer !important;
}

.card-actions-safe {
  position: relative;
  z-index: 60;
  pointer-events: auto !important;
}

.card-actions-safe button {
  position: relative;
  z-index: 65;
  pointer-events: auto !important;
  cursor: pointer !important;
}
```

### `PriceAnalysisTab.tsx`

**تغيير 1:** تحديث الأزرار في مصفوفة `reportCards` (سطر 375-455):

- زر PDF في "Price Comparison": إضافة `className="relative z-[65] pointer-events-auto"`
- زر Excel في "Price Comparison": إضافة `className="relative z-[65] pointer-events-auto"`
- زر PDF في "Balance Report": إضافة `className="gap-2 relative z-[65] pointer-events-auto"`
- زر View في "Variance Analysis": إضافة `className="relative z-[65] pointer-events-auto"`

**تغيير 2:** تحديث الـ Card الرئيسي (سطر 615):

```tsx
<Card key={card.id} className="border-border hover:shadow-md transition-shadow reports-card-safe">
```

**تغيير 3:** تحديث div الأزرار (سطر 630):

```tsx
<div className="flex justify-end card-actions-safe">
```

---

## النتيجة المتوقعة

### قبل الإصلاح:
- أزرار PDF و Excel و View لا تستجيب للنقر
- المستخدم لا يستطيع تصدير التقارير

### بعد الإصلاح:
- جميع أزرار التصدير تعمل فوراً
- تقارير PDF و Excel يتم تحميلها بنجاح
- حوار "Variance Analysis" يفتح بدون مشاكل

---

## ملاحظات تقنية

1. **z-index hierarchy:**
   - Dialog Overlay: z-99
   - Dialog Content: z-100
   - Report Buttons: z-65
   - Card Actions: z-60
   - Card Safe: z-10

2. **pointer-events:**
   - جميع الأزرار تستخدم `pointer-events: auto !important`
   - هذا يضمن أن الأزرار تستجيب للنقر حتى لو كان هناك overlay شفاف

3. **التوافق:**
   - التغييرات متوافقة مع معايير المشروع الحالية
   - تستخدم نفس الأنماط المُستخدمة في تبويبات Tender
