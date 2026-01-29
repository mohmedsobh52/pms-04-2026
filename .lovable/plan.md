
# خطة إصلاح مشكلة رفع الملفات في صفحة المرفقات

## تشخيص المشكلة

### السبب الجذري
صفحة `AttachmentsPage.tsx` تجلب المشاريع من جدول `saved_projects`، بينما جدول `project_attachments` يتطلب `project_id` من جدول `project_data`.

### البيانات الفعلية
```text
مشروع "الدلم":
├── في saved_projects: 921a8167-cd66-4cec-b196-0c35eadac7a9 ← (الـ URL الحالي)
└── في project_data:   706395e9-7ec9-4da9-aed5-36ff68e952c2 ← (المطلوب)

عند محاولة الحفظ:
project_attachments.project_id → يجب أن يكون من project_data
                               → الكود يرسل ID من saved_projects
                               → ❌ Foreign Key Violation!
```

## الحل المقترح

### التغيير المطلوب في `src/pages/AttachmentsPage.tsx`

تغيير مصدر البيانات من `saved_projects` إلى `project_data`:

```typescript
// السطر 39-43 - قبل:
const { data, error } = await supabase
  .from("saved_projects")
  .select("id, name")
  .eq("user_id", user.id)

// بعد:
const { data, error } = await supabase
  .from("project_data")
  .select("id, name")
  .eq("user_id", user.id)
```

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `src/pages/AttachmentsPage.tsx` | تغيير جدول البيانات من `saved_projects` إلى `project_data` |

## النتيجة المتوقعة

```text
بعد التغيير:
┌─────────────────────────┐
│   project_data          │ ← AttachmentsPage يجلب المشاريع
└─────────────────────────┘
           │
           ▼ project_id (صحيح)
┌─────────────────────────┐
│  project_attachments    │ ← يحفظ الملفات بنجاح
└─────────────────────────┘

✅ رفع الملفات سيعمل بدون أخطاء
✅ الملفات ستُربط بالمشروع الصحيح
```

## ملاحظة مهمة

المشاريع القديمة الموجودة فقط في `saved_projects` لن تظهر في القائمة. يُنصح بإنشاء مشروع جديد من صفحة Fast Extraction أو التأكد من وجود المشروع في `project_data`.
