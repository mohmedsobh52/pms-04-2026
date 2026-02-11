

# خطة إصلاح وتطوير شاشات المستخلصات وعروض الأسعار

## المشاكل المكتشفة

### 1. خطأ حرج: قيد المفتاح الأجنبي (FK) في جدول المستخلصات
عمود `project_id` في جدول `progress_certificates` مرتبط بجدول `saved_projects` (القديم)، بينما الكود يستخدم `project_data` (الجديد). هذا يعني أن **حفظ أي مستخلص جديد سيفشل** بسبب انتهاك قيد FK.

**الحل**: تعديل قاعدة البيانات لتغيير FK من `saved_projects` إلى `project_data`.

### 2. شاشة عروض الأسعار (Quotations) تغلق تلقائياً
مكون `QuotationUpload` يستورد `pdfjs-dist` مباشرة على مستوى الملف (سطر 19). إذا فشل تحميل المكتبة أو إعداد الـ worker، تنهار الشاشة بالكامل. المكون أيضاً لا يتعامل مع حالة عدم تسجيل الدخول (user = null) بشكل سليم مما يسبب أخطاء.

**الحل**: إضافة حماية ضد الأخطاء ومعالجة حالة عدم وجود مستخدم.

### 3. زر "New Certificate" - يعمل لكن الحفظ يفشل
الزر يفتح النافذة بنجاح، لكن عملية الحفظ تفشل بسبب مشكلة FK المذكورة أعلاه.

---

## التغييرات المطلوبة

### تغيير 1: تعديل قاعدة البيانات (Migration)

```sql
ALTER TABLE progress_certificates 
  DROP CONSTRAINT progress_certificates_project_id_fkey;

ALTER TABLE progress_certificates 
  ADD CONSTRAINT progress_certificates_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES project_data(id);
```

### تغيير 2: إصلاح شاشة عروض الأسعار

**ملف: `src/components/QuotationUpload.tsx`**
- تغيير استيراد `pdfjs-dist` من استيراد ثابت إلى استيراد ديناميكي (dynamic import) داخل الدوال التي تحتاجه
- إضافة معالجة لحالة عدم وجود مستخدم مسجل (عرض رسالة بدلاً من الانهيار)

**ملف: `src/pages/QuotationsPage.tsx`**
- إضافة ErrorBoundary حول المكونات لمنع انهيار الصفحة

### تغيير 3: التأكد من عمل زر "New Certificate"

بعد إصلاح FK، الكود الحالي سيعمل بشكل صحيح. سأضيف أيضاً:
- رسالة تنبيه واضحة عند عدم تسجيل الدخول
- معالجة أفضل للأخطاء في عمليات الحفظ

---

## ملخص الملفات المتأثرة

| الملف | نوع التعديل |
|-------|-------------|
| Migration SQL | تغيير FK من `saved_projects` إلى `project_data` |
| `src/components/QuotationUpload.tsx` | استيراد ديناميكي لـ pdfjs-dist + حماية null |
| `src/pages/QuotationsPage.tsx` | إضافة ErrorBoundary |
| `src/pages/ProgressCertificatesPage.tsx` | تحسين معالجة الأخطاء |

## ملاحظات
- تصدير PDF للمستخلص **موجود بالفعل** ويعمل (زر Download في كل صف + زر في نافذة العرض)
- ربط المقاولين بين الشاشات **موجود بالفعل** عبر جدول `subcontractors` الموحد
- ربط العقود **موجود بالفعل** في نافذة الإنشاء

