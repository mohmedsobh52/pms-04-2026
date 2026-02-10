
# خطة ربط زر إضافة المقاول وإنشاء شاشة المستخلصات

## الجزء الأول: توحيد زر إضافة المقاول الفرعي

### المشكلة
يوجد زران منفصلان لإضافة المقاولين:
1. في `SubcontractorManagement.tsx` (شاشة مقاولي الباطن)
2. في `TenderSubcontractorsTab.tsx` (شاشة التسعير / Start Pricing)

عند إضافة مقاول في إحدى الشاشتين لا يظهر في الأخرى.

### الحل
- **في `TenderSubcontractorsTab.tsx`**: عند إضافة مقاول جديد من شاشة التسعير، يتم حفظه أيضاً في جدول `subcontractors` في قاعدة البيانات حتى يظهر في شاشة المقاولين
- **في `SubcontractorManagement.tsx`**: عند إضافة مقاول جديد يصبح متاحاً فوراً في شاشة التسعير (هذا يعمل حالياً لأن `TenderSubcontractorsTab` يقرأ من جدول `subcontractors`)
- إضافة `loadAvailableSubcontractors()` بعد كل عملية حفظ لتحديث القائمة

### الملفات المتأثرة
| الملف | التغيير |
|-------|---------|
| `src/components/tender/TenderSubcontractorsTab.tsx` | حفظ المقاول الجديد في جدول `subcontractors` عند الإنشاء |

---

## الجزء الثاني: شاشة المستخلصات (Progress Certificates / Invoices)

### المفهوم
إنشاء شاشة جديدة لإدارة مستخلصات المقاولين ومقاولي الباطن. المستخلص يحتوي على البنود المرفوعة على البرنامج مقسمة حسب كل مشروع، مع تتبع الكميات المنفذة والمبالغ المستحقة.

### هيكل الشاشة

```text
صفحة المستخلصات
├── اختيار المشروع (فلتر)
├── اختيار المقاول / مقاول الباطن
├── ملخص إحصائي (بطاقات)
│   ├── إجمالي العقد
│   ├── المنصرف حتى تاريخه
│   ├── المتبقي
│   └── نسبة الإنجاز
├── جدول المستخلصات السابقة
└── إنشاء مستخلص جديد
    ├── بنود المشروع (تلقائي من project_items)
    ├── الكمية السابقة (من المستخلصات السابقة)
    ├── الكمية الحالية (إدخال)
    ├── الكمية الإجمالية
    ├── المبلغ المستحق
    ├── الخصومات (احتجاز، دفعة مقدمة)
    └── صافي المستحق
```

### جدول قاعدة البيانات الجديد

**`progress_certificates`** - المستخلصات:

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف |
| user_id | uuid | المستخدم |
| project_id | uuid | المشروع |
| contract_id | uuid (nullable) | العقد المرتبط |
| contractor_name | text | اسم المقاول |
| certificate_number | integer | رقم المستخلص |
| period_from | date | من تاريخ |
| period_to | date | إلى تاريخ |
| total_work_done | numeric | إجمالي الأعمال |
| previous_work_done | numeric | أعمال سابقة |
| current_work_done | numeric | أعمال حالية |
| retention_amount | numeric | مبلغ الاحتجاز |
| advance_deduction | numeric | خصم دفعة مقدمة |
| other_deductions | numeric | خصومات أخرى |
| net_amount | numeric | صافي المستحق |
| status | text | الحالة (draft/submitted/approved/paid) |
| notes | text | ملاحظات |
| created_at | timestamptz | تاريخ الإنشاء |

**`progress_certificate_items`** - بنود المستخلص:

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف |
| certificate_id | uuid | المستخلص |
| project_item_id | uuid (nullable) | بند المشروع |
| item_number | text | رقم البند |
| description | text | الوصف |
| unit | text | الوحدة |
| contract_quantity | numeric | الكمية التعاقدية |
| unit_price | numeric | سعر الوحدة |
| previous_quantity | numeric | الكمية السابقة |
| current_quantity | numeric | الكمية الحالية |
| total_quantity | numeric | الكمية الإجمالية |
| current_amount | numeric | المبلغ الحالي |
| created_at | timestamptz | تاريخ الإنشاء |

### الملفات الجديدة والمعدلة

| الملف | الإجراء |
|-------|---------|
| `src/pages/ProgressCertificatesPage.tsx` | **جديد** - صفحة المستخلصات |
| `src/components/progress-certificates/ProgressCertificateForm.tsx` | **جديد** - نموذج إنشاء مستخلص |
| `src/components/progress-certificates/CertificateItemsTable.tsx` | **جديد** - جدول بنود المستخلص |
| `src/components/progress-certificates/CertificateSummary.tsx` | **جديد** - ملخص المستخلص |
| `src/App.tsx` | **تعديل** - إضافة مسار `/progress-certificates` |
| `src/components/tender/TenderSubcontractorsTab.tsx` | **تعديل** - ربط حفظ المقاول |

---

## التفاصيل التقنية

### 1. شاشة المستخلصات الرئيسية (`ProgressCertificatesPage.tsx`)

**المميزات:**
- فلتر حسب المشروع والمقاول
- عرض قائمة المستخلصات السابقة مع الحالة
- زر إنشاء مستخلص جديد
- حساب تراكمي للكميات السابقة من المستخلصات المعتمدة
- تصدير PDF

**التدفق:**
1. المستخدم يختار المشروع
2. يتم تحميل المقاولين المرتبطين بهذا المشروع (من `contracts` و `subcontractors`)
3. يختار المقاول
4. تظهر المستخلصات السابقة
5. عند إنشاء مستخلص جديد: تُحمّل البنود تلقائياً من `project_items`
6. يدخل المستخدم الكميات المنفذة في هذه الفترة
7. يحسب النظام: الكمية الإجمالية = السابقة + الحالية، المبلغ = الكمية الحالية x سعر الوحدة
8. تُحسب الخصومات (احتجاز + دفعة مقدمة)
9. يُحفظ المستخلص

### 2. نموذج المستخلص (`ProgressCertificateForm.tsx`)

```typescript
// البيانات الأساسية
- رقم المستخلص (تلقائي)
- الفترة (من - إلى)
- المقاول
- المشروع

// جدول البنود
- يُحمّل تلقائياً من project_items
- الكميات السابقة تُحسب من المستخلصات المعتمدة السابقة
- المستخدم يدخل الكمية الحالية فقط
- الباقي يُحسب تلقائياً
```

### 3. ربط مع باقي الشاشات

- **شاشة العقود**: رابط سريع لعرض مستخلصات العقد
- **شاشة المقاولين**: رابط لمستخلصات المقاول
- **شاشة المشروع**: تاب أو رابط للمستخلصات

---

## خطوات التنفيذ

1. إنشاء جداول قاعدة البيانات (`progress_certificates` و `progress_certificate_items`) مع سياسات RLS
2. تعديل `TenderSubcontractorsTab.tsx` لحفظ المقاول في جدول `subcontractors`
3. إنشاء `ProgressCertificatesPage.tsx` مع واجهة المستخلصات
4. إنشاء مكونات المستخلص الفرعية (النموذج، الجدول، الملخص)
5. إضافة المسار في `App.tsx`
6. إضافة رابط المستخلصات في شاشات المقاولين والعقود
