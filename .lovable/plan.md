

# تطوير زر "مستخلص جديد" في شاشة المستخلصات

## المشاكل الحالية

1. **المشاريع تُحمّل من `saved_projects`** بدلاً من `project_data` (الجدول المعتمد)
2. **لا يوجد ربط بالعقود** - حقل `contract_id` موجود في الجدول لكنه لا يُستخدم
3. **الدفعة المقدمة تُدخل يدوياً** بدلاً من استيرادها تلقائياً من العقد
4. **نسبة الاحتجاز يدوية** بدلاً من جلبها من العقد
5. **لا يوجد عرض للمستخلصات السابقة** للمقاول نفسه

## التغييرات المطلوبة

### ملف واحد: `src/pages/ProgressCertificatesPage.tsx`

---

### 1. إصلاح مصدر البيانات

| البيان | الحالي | الجديد |
|--------|--------|--------|
| المشاريع | `saved_projects` | `project_data` |
| المقاولين | `subcontractors` فقط | `subcontractors` + `contracts` |

### 2. إضافة ربط العقود

عند اختيار المقاول والمشروع:
- تحميل العقود المرتبطة بهذا المقاول والمشروع من جدول `contracts`
- عرض قائمة منسدلة لاختيار العقد
- عند اختيار العقد يتم تعبئة تلقائية:
  - **نسبة الاحتجاز** من `contracts.retention_percentage`
  - **نسبة الدفعة المقدمة** من `contracts.advance_payment_percentage`
  - **قيمة العقد** للعرض كمرجع

### 3. حساب خصم الدفعة المقدمة تلقائياً

```text
خصم الدفعة المقدمة = الأعمال الحالية x نسبة الدفعة المقدمة من العقد
```

مع إمكانية التعديل اليدوي.

### 4. إضافة قسم "المستخلصات السابقة"

عند اختيار المقاول والمشروع، عرض ملخص:
- عدد المستخلصات السابقة
- إجمالي الأعمال السابقة المعتمدة
- إجمالي المبالغ المدفوعة
- آخر مستخلص (رقمه وتاريخه وحالته)

### 5. تحسين هيكل النافذة

النافذة الجديدة ستكون مقسمة إلى أقسام واضحة:

| القسم | المحتوى |
|-------|---------|
| المشروع والمقاول | اختيار مشروع، اختيار مقاول، اختيار عقد (تلقائي) |
| ملخص المستخلصات السابقة | عدد المستخلصات، إجمالي سابق، آخر مستخلص |
| فترة المستخلص | من تاريخ، إلى تاريخ |
| بنود المشروع | جدول البنود مع الكميات السابقة والحالية |
| الخصومات | احتجاز (من العقد)، دفعة مقدمة (محسوبة)، أخرى |
| الملخص المالي | الأعمال الحالية، السابقة، الإجمالي، الخصومات، صافي المستحق |
| ملاحظات | حقل نصي |

### 6. حفظ `contract_id`

عند الحفظ، يتم تسجيل `contract_id` في جدول `progress_certificates` لربط المستخلص بالعقد.

---

## التفاصيل التقنية

### States الجديدة

```typescript
const [formContractId, setFormContractId] = useState("");
const [availableContracts, setAvailableContracts] = useState([]);
const [previousCertsSummary, setPreviousCertsSummary] = useState(null);
const [advancePercentage, setAdvancePercentage] = useState(0);
```

### دالة تحميل العقود

عند تغيير المقاول أو المشروع:

```typescript
// جلب العقود المرتبطة بالمقاول والمشروع
const contracts = await supabase
  .from("contracts")
  .select("id, contract_number, contract_title, retention_percentage, advance_payment_percentage, contract_value")
  .eq("contractor_name", selectedContractor)
  .eq("project_id", selectedProjectId);
```

### دالة ملخص المستخلصات السابقة

```typescript
// جلب المستخلصات السابقة المعتمدة/المدفوعة
const prevCerts = await supabase
  .from("progress_certificates")
  .select("certificate_number, status, current_work_done, net_amount, period_to")
  .eq("project_id", projectId)
  .eq("contractor_name", contractor)
  .in("status", ["approved", "paid"])
  .order("certificate_number", { ascending: false });
```

### تعبئة تلقائية من العقد

عند اختيار العقد:
- `formRetention` = `contract.retention_percentage` او 10 كقيمة افتراضية
- `advancePercentage` = `contract.advance_payment_percentage` او 0
- `formAdvanceDeduction` = `currentWorkDone * advancePercentage / 100` (يتم تحديثه تلقائياً)

### تحديث دالة الحفظ

إضافة `contract_id: formContractId || null` عند الـ insert.

---

## خطوات التنفيذ

1. تغيير مصدر المشاريع من `saved_projects` إلى `project_data`
2. إضافة states للعقود والمستخلصات السابقة
3. إنشاء دالة تحميل العقود المرتبطة
4. إنشاء دالة ملخص المستخلصات السابقة
5. تحديث `handleProjectChange` و `handleContractorChange` لتحميل العقود والملخص
6. إضافة اختيار العقد مع التعبئة التلقائية
7. إضافة قسم ملخص المستخلصات السابقة في النافذة
8. تحديث حساب خصم الدفعة المقدمة ليكون تلقائياً
9. تحديث دالة `handleCreateCertificate` لحفظ `contract_id`

