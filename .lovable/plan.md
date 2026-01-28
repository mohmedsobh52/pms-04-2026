
# خطة إصلاح مشكلة القوائم المنسدلة داخل Dialog

## تحليل المشكلة

من فحص الكود والصورة المرفقة، يتضح أن:

### المشكلة الجذرية
عند فتح dropdown (Unit أو Category) داخل "Edit Item" dialog:
- **Dialog Content** له `z-index: 100`
- **Select Dropdown** له `z-index: 70`
- **النتيجة**: القائمة المنسدلة تظهر **خلف** الـ Dialog!

### الملفات المتأثرة

| الملف | المشكلة |
|-------|---------|
| `src/components/ui/select.tsx` | `z-[70]` أقل من Dialog (`z-[100]`) |
| `src/components/ui/dialog-custom.css` | `z-index: 70` في السطر 93 |

---

## الحل المطلوب

### التغيير 1: تحديث `src/components/ui/select.tsx`

رفع z-index للـ SelectContent ليكون أعلى من Dialog:

```typescript
// السطر 68-69 - قبل:
className={cn(
  "relative z-[70] max-h-96 min-w-[8rem] ..."

// بعد:
className={cn(
  "relative z-[150] max-h-96 min-w-[8rem] ..."
```

**لماذا `z-[150]`؟**
- Dialog Overlay = `z-[99]`
- Dialog Content = `z-[100]`
- Select Dropdown = **`z-[150]`** (أعلى من الكل!)

### التغيير 2: تحديث `src/components/ui/dialog-custom.css`

تحديث CSS override للـ Select داخل Dialogs:

```css
/* السطر 92-94 - قبل: */
[data-radix-select-content] {
  z-index: 70 !important;
}

/* بعد: */
[data-radix-select-content] {
  z-index: 150 !important;
}
```

---

## التسلسل الهرمي الجديد لـ z-index

| العنصر | z-index القديم | z-index الجديد |
|--------|----------------|----------------|
| Base UI Elements | 10-50 | 10-50 |
| Navigation Tabs | 55-56 | 55-56 |
| Action Buttons | 60-65 | 60-65 |
| **Select/Dropdown Content** | **70** | **150** |
| Dialog Overlay | 99 | 99 |
| Dialog Content | 100 | 100 |

**الآن Select Dropdown سيظهر دائماً فوق Dialog!**

---

## ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/ui/select.tsx` | تغيير `z-[70]` إلى `z-[150]` |
| `src/components/ui/dialog-custom.css` | تغيير `z-index: 70` إلى `z-index: 150` |

---

## النتيجة المتوقعة

### قبل الإصلاح
- القوائم المنسدلة للوحدة (Unit) لا تعمل داخل Edit Item
- القوائم المنسدلة للفئة (Category) لا تعمل داخل Edit Item
- القوائم المنسدلة في جميع الـ dialogs لا تعمل

### بعد الإصلاح
- جميع القوائم المنسدلة تظهر بشكل صحيح فوق الـ Dialog
- يمكن اختيار القيم من القوائم بسهولة
- لا تعارض في z-index

---

## خطوات الاختبار

1. فتح صفحة تفاصيل المشروع
2. الذهاب لتبويب BOQ
3. النقر على ⋮ لأي بند → Edit
4. **في Edit Item dialog:**
   - النقر على dropdown الوحدة (Unit) → يجب أن تظهر القائمة
   - النقر على dropdown الفئة (Category) → يجب أن تظهر القائمة
   - اختيار قيمة من كل قائمة
5. اختبار Auto Price dialog → التحقق من أن dropdowns تعمل
6. اختبار Quick Price dialog → التحقق من أن dropdowns تعمل
7. اختبار Detailed Price dialog → التحقق من أن dropdowns تعمل
