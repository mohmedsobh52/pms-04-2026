

# تحويل حقول التاريخ الى ادخال يدوي بصيغة yyyy-MM-dd

## التغيير المطلوب

استبدال حقول التاريخ من نوع Calendar Popover الى حقول Input نصية يدوية بصيغة `yyyy-MM-dd`.

## التعديلات

### الملف: `src/pages/NewProjectPage.tsx`

1. **تغيير نوع البيانات في formData**: تحويل `startDate` و `endDate` من `Date | undefined` الى `string` (قيمة افتراضية `""`)

2. **استبدال Popover + Calendar** بـ `Input` عادي:
   - `type="date"` للحصول على تنسيق yyyy-MM-dd مباشرة من المتصفح
   - ايقونة CalendarIcon تبقى كـ label فقط
   - placeholder: `yyyy-mm-dd`

3. **تعديل حساب المدة (durationDays)**: استخدام `new Date(string)` بدلا من `.getTime()` مباشرة

4. **تعديل handleSubmit**: تحويل النص الى ISO string عند الحفظ باستخدام `new Date(formData.startDate).toISOString()`

5. **حذف imports غير مستخدمة**: ازالة `Calendar`, `Popover`, `PopoverContent`, `PopoverTrigger`, `cn` اذا لم تعد مستخدمة

### الشكل النهائي للحقل

```text
[CalendarIcon] Start Date
[📅  yyyy-mm-dd          ]   <-- input type="date"
```

حقل ادخال بسيط يسمح بالكتابة المباشرة او اختيار التاريخ من متصفح النظام.

