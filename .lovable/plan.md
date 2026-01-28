

# خطة إصلاح مشكلة رفع الملفات - Foreign Key Constraint Error

## تحليل المشكلة

### الخطأ الظاهر
```
insert or update on table "project_attachments" violates foreign key constraint "project_attachments_project_id_fkey"
```

### السبب الجذري
الـ Foreign Key في جدول `project_attachments` يشير إلى الجدول الخاطئ:

| الحالة الحالية | الحالة المطلوبة |
|---------------|----------------|
| `project_attachments.project_id` → `saved_projects(id)` | `project_attachments.project_id` → `project_data(id)` |

### لماذا يحدث الخطأ؟
- المشروع `84eadb52-5ab6-491c-9afc-aa8dca200ee7` موجود في جدول `project_data`
- لكن الـ Foreign Key يبحث عنه في جدول `saved_projects`
- المشروع غير موجود في `saved_projects`
- لذلك الإدراج يفشل!

---

## الحل المطلوب

### تغيير واحد: تحديث Foreign Key Constraint

إزالة الـ constraint القديم وإنشاء constraint جديد يشير إلى `project_data`:

```sql
-- إزالة الـ Foreign Key القديم
ALTER TABLE public.project_attachments 
DROP CONSTRAINT project_attachments_project_id_fkey;

-- إنشاء Foreign Key جديد يشير إلى project_data
ALTER TABLE public.project_attachments
ADD CONSTRAINT project_attachments_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES project_data(id) ON DELETE CASCADE;
```

---

## توضيح التغيير

### قبل

```text
project_attachments
└── project_id → saved_projects(id) ❌ خاطئ
```

### بعد

```text
project_attachments
└── project_id → project_data(id) ✅ صحيح
```

---

## لماذا `project_data` وليس `saved_projects`؟

| الجدول | الغرض |
|--------|-------|
| `project_data` | المشاريع الرئيسية المحفوظة في قاعدة البيانات (المستخدمة في التطبيق) |
| `saved_projects` | نسخ قديمة من المشاريع المحفوظة (legacy) |

صفحة تفاصيل المشروع (`/projects/:id`) تستخدم `project_data`، لذلك يجب أن يشير الـ foreign key إليه.

---

## الملفات/الجداول المتأثرة

| النوع | الاسم | التغيير |
|-------|------|---------|
| Database | `project_attachments` | تحديث Foreign Key Constraint |

---

## النتيجة المتوقعة

### قبل الإصلاح
- ❌ رفع الملفات يفشل بخطأ Foreign Key
- ❌ لا يمكن إضافة مستندات للمشاريع

### بعد الإصلاح
- ✅ رفع الملفات يعمل بنجاح
- ✅ الملفات تُربط بالمشروع الصحيح
- ✅ حذف المشروع يحذف الملفات تلقائياً (CASCADE)

---

## خطوات الاختبار

1. فتح صفحة تفاصيل المشروع
2. الذهاب لتبويب Documents
3. النقر على "Upload File"
4. اختيار ملف
5. التحقق من رفع الملف بنجاح
6. التحقق من ظهور الملف في القائمة

