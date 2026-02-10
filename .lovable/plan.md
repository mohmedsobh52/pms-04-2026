
# تنفيذ الخطة المعتمدة: تطوير زر "مستخلص جديد"

هذه الخطة تم اعتمادها مسبقاً وسيتم تنفيذها الآن.

## التغييرات في ملف `src/pages/ProgressCertificatesPage.tsx`

### 1. تغيير مصدر المشاريع
- استبدال `saved_projects` بـ `project_data` في `fetchData`

### 2. إضافة States جديدة
- `formContractId` - العقد المختار
- `availableContracts` - العقود المتاحة
- `previousCertsSummary` - ملخص المستخلصات السابقة
- `advancePercentage` - نسبة الدفعة المقدمة من العقد

### 3. إضافة دوال جديدة
- `loadContractsForSelection` - تحميل العقود بناءً على المشروع والمقاول
- `loadPreviousCertsSummary` - تحميل ملخص المستخلصات السابقة
- تحديث `handleProjectChange` و `handleContractorChange` لاستدعاء الدوال الجديدة

### 4. تحديث واجهة نافذة الإنشاء
- إضافة قائمة منسدلة لاختيار العقد (بعد المشروع والمقاول)
- إضافة قسم "ملخص المستخلصات السابقة" (عدد، إجمالي سابق، آخر مستخلص)
- تحديث حقل الدفعة المقدمة ليعرض النسبة من العقد مع الحساب التلقائي
- إضافة عرض قيمة العقد كمرجع

### 5. تحديث دالة الحفظ
- إضافة `contract_id: formContractId || null` في insert

### 6. تحديث `resetForm`
- إضافة تصفير الحقول الجديدة

## التفاصيل التقنية

### التعبئة التلقائية من العقد
عند اختيار عقد:
- `formRetention` = `contract.retention_percentage` او 10
- `advancePercentage` = `contract.advance_payment_percentage` او 0
- `formAdvanceDeduction` = `currentWorkDone * advancePercentage / 100` (يتحدث تلقائياً عبر useEffect)

### ملخص المستخلصات السابقة
يعرض:
- عدد المستخلصات السابقة
- إجمالي الأعمال السابقة
- إجمالي المبالغ المدفوعة
- آخر مستخلص (رقم، تاريخ، حالة)

### ربط العقود
```
contracts WHERE contractor_name = selected AND project_id = selected
```
