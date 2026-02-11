

# إصلاح نهائي لزر "New Certificate" باستخدام createPortal

## المشكلة
بعد 4 محاولات (Radix controlled, forwardRef, custom div, DialogTrigger) - جميعها فشلت. الضغط على الزر لا ينتج أي عنصر في DOM. السبب: الصفحة كبيرة (978 سطر) و Radix Dialog يفشل في mount المحتوى في بيئة المعاينة.

## الحل: فصل نموذج الإنشاء + createPortal

### الخطوة 1: إنشاء ملف جديد `src/components/certificates/CreateCertificateModal.tsx`

مكون منفصل يحتوي على:
- كل منطق النموذج (form state, items, calculations) داخلياً
- `ReactDOM.createPortal(content, document.body)` لعرض المحتوى مباشرة في body
- بدون Radix Dialog - modal نقي بـ HTML/CSS
- Props: `isOpen`, `onClose`, `onSave`, `projects`, `contractors`, `isArabic`, `userId`

البنية:
```text
if (!isOpen) return null;

return createPortal(
  <div className="fixed inset-0 z-[9999]">
    <div className="fixed inset-0 bg-black/80" onClick={onClose} />
    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                    w-full max-w-4xl max-h-[90vh] overflow-y-auto
                    bg-background border rounded-lg shadow-2xl p-6 z-[10000]">
      {/* محتوى النموذج بالكامل - نفس الكود الموجود حالياً */}
    </div>
  </div>,
  document.body
);
```

المكون سيتضمن داخلياً:
- جميع states النموذج (formProjectId, formContractor, formItems, etc.)
- دوال التحميل (loadProjectItems, loadContractsForSelection, loadPreviousCertsSummary)
- دالة الحفظ handleCreateCertificate
- دالة resetForm
- الحسابات (currentWorkDone, retentionAmount, netAmount)
- كل أقسام الفورم الستة الموجودة حالياً

### الخطوة 2: تبسيط `src/pages/ProgressCertificatesPage.tsx`

- إزالة كل كود Dialog الإنشاء (من سطر 658 إلى 904 تقريباً - حوالي 250 سطر)
- إزالة كل states النموذج من الصفحة الرئيسية (formProjectId, formContractor, formItems, etc.)
- إزالة الدوال المنقولة (loadProjectItems, loadContractsForSelection, etc.)
- إبقاء: state الـ `showCreateDialog` فقط + زر الفتح + المكون الجديد
- إبقاء: نافذة العرض (View Dialog) كما هي

الاستخدام الجديد:
```text
<Button onClick={() => setShowCreateDialog(true)}>
  <Plus className="h-4 w-4 mr-1" />
  {isArabic ? "مستخلص جديد" : "New Certificate"}
</Button>

<CreateCertificateModal
  isOpen={showCreateDialog}
  onClose={() => setShowCreateDialog(false)}
  onSave={() => { setShowCreateDialog(false); fetchData(); }}
  projects={projects}
  contractors={contractors}
  isArabic={isArabic}
  userId={user?.id}
/>
```

## الملفات

| الملف | التعديل |
|-------|---------|
| `src/components/certificates/CreateCertificateModal.tsx` | ملف جديد - نموذج الإنشاء مع createPortal |
| `src/pages/ProgressCertificatesPage.tsx` | إزالة ~250 سطر من Dialog + استبدالها بالمكون الجديد |

## لماذا سيعمل

1. **createPortal** يعرض المحتوى مباشرة في document.body - خارج شجرة React المعقدة
2. **مكون منفصل** يقلل حجم الصفحة من 978 إلى ~700 سطر
3. **بدون Radix Dialog** يتجنب مشاكل ref forwarding و context providers
4. **z-index: 9999** يضمن الظهور فوق كل شيء
5. نافذة العرض (View Dialog) تبقى كما هي لأنها لم تُختبر بعد

