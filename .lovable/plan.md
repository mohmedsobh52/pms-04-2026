
# خطة إصلاح قائمة النقاط الثلاث (⋮) في جدول BOQ

## تشخيص المشكلة

### السبب الجذري
القائمة المنسدلة (DropdownMenu) في عمود الإجراءات بكل صف تستخدم `z-50` فقط، مما يجعلها تُحجب بواسطة:

```text
ترتيب الطبقات الحالي:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Select Dropdowns:          z-70   ✅ (محمي)
Project Actions:           z-60   ✅ (محمي)
Tabs Navigation:           z-55   ✅ (محمي)
Dialog Overlay:            z-50   ⚠️
DropdownMenu (row actions): z-50   ❌ (غير محمي - نفس مستوى Dialog!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**المشكلة**: بعد إغلاق Dialog، يظل overlay يحتفظ بـ `pointer-events` لفترة قصيرة مما يحجب DropdownMenu.

---

## الحل المقترح

### 1. رفع z-index لـ DropdownMenuContent في dropdown-menu.tsx

تغيير `z-50` إلى `z-[70]` لضمان ظهور القائمة فوق كل شيء.

**الملف:** `src/components/ui/dropdown-menu.tsx`

**السطر 64 - تغيير:**
```typescript
// قبل
"z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover..."

// بعد
"z-[70] min-w-[8rem] overflow-hidden rounded-md border bg-popover..."
```

### 2. إضافة CSS لحماية DropdownMenu في dialog-custom.css

```css
/* DropdownMenu - ensure it appears above everything */
[data-radix-dropdown-menu-content] {
  z-index: 70 !important;
  pointer-events: auto !important;
}

/* Ensure dropdown items are clickable */
[data-radix-dropdown-menu-item] {
  pointer-events: auto !important;
  cursor: pointer !important;
}

/* DropdownMenu trigger in table rows */
[data-radix-dropdown-menu-trigger] {
  pointer-events: auto !important;
  cursor: pointer !important;
}
```

---

## ملخص التغييرات

| الملف | السطر | التغيير |
|-------|-------|---------|
| `dropdown-menu.tsx` | 64 | تغيير `z-50` إلى `z-[70]` |
| `dropdown-menu.tsx` | 47 | تغيير `z-50` إلى `z-[70]` (للـ SubContent) |
| `dialog-custom.css` | جديد | إضافة CSS لحماية DropdownMenu |

---

## ترتيب الطبقات بعد الإصلاح

```text
ترتيب الطبقات الجديد:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Select Dropdowns:          z-[70]  ✅
DropdownMenu (row actions): z-[70]  ✅ (سيُضاف)
Project Actions:           z-[60]  ✅
Tabs Navigation:           z-55    ✅
Dialog Overlay:            z-50
Normal Content:            z-auto
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## الاختبار المطلوب

1. **النقر على النقاط الثلاث (⋮):**
   - النقر على الزر → يجب أن تظهر القائمة مع الخيارات
   
2. **اختيار خيار من القائمة:**
   - تسعير سريع → يجب أن يعمل
   - تسعير مفصل → يجب أن يعمل
   - تعديل → يجب أن يعمل
   - حذف → يجب أن يعمل

3. **اختبار بعد إغلاق Dialog:**
   - فتح dialog أي → إغلاقه → النقر على ⋮ → يجب أن تظهر القائمة فوراً
