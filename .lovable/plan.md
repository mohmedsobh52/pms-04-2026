

# إصلاح العناصر غير التفاعلية في صفحة إنشاء المستخلص الجديد

## المشكلة

حقول التاريخ، زر الحفظ، ومربع الملاحظات لا تستجيب للنقر في صفحة `/progress-certificates/new`. السبب هو أن ملف `dialog-custom.css` يحتوي على قواعد CSS معقدة تتحكم في `z-index` و `pointer-events`، والصفحة الجديدة لا تستخدم أي من الفئات (classes) الوقائية الموجودة مسبقا في النظام.

## التحليل

ملف `dialog-custom.css` يحتوي على فئات CSS وقائية جاهزة:
- `form-card-safe` - تحمي عناصر النماذج داخل البطاقات (inputs, textareas, selects)
- `form-actions-safe` - تحمي أزرار الإجراءات (Save, Cancel)

صفحة `NewCertificatePage.tsx` لا تستخدم أيا من هذه الفئات، مما يجعل عناصرها تقع تحت طبقات CSS أخرى.

## الحل

إضافة الفئات الوقائية الموجودة مسبقا إلى العناصر في `NewCertificatePage.tsx`:

### التغييرات في `src/pages/NewCertificatePage.tsx`:

1. **الحاوية الرئيسية** (سطر 239): إضافة `form-card-safe` إلى `div` الرئيسي
   - يحمي كل عناصر النموذج (date inputs, textarea, select triggers)

2. **حقول التاريخ** (أسطر 354-363): ستصبح تفاعلية تلقائيا بفضل `form-card-safe` على الحاوية الأب

3. **مربع الملاحظات** (سطر 452): نفس الأمر - محمي بالفئة على الحاوية

4. **أزرار الإجراءات** (سطر 457): إضافة `form-actions-safe` إلى `div` أزرار Cancel و Save

| الموقع | التغيير |
|--------|---------|
| سطر 239 - div الرئيسي | إضافة class `form-card-safe` |
| سطر 457 - div الأزرار | إضافة class `form-actions-safe` |

### ملف واحد يتأثر

`src/pages/NewCertificatePage.tsx`

### لماذا سيعمل

1. الفئة `form-card-safe` تضيف `pointer-events: auto !important` و `z-index` مناسب لكل inputs و textareas و buttons داخلها
2. الفئة `form-actions-safe` تضيف `z-index: 65` و `pointer-events: auto !important` للأزرار
3. هذه الفئات مستخدمة بنجاح في صفحات أخرى في المشروع (Settings, Tender)
4. لا حاجة لإضافة قواعد CSS جديدة - فقط استخدام ما هو موجود

