

# خطة اختبار شامل للتبويبات والقوائم المنسدلة وأزرار التنقل

## ملخص المشكلة

بعد فحص المشروع بالكامل، وجدت أن هناك **صفحات كثيرة** تحتوي على TabsList و Select dropdowns **غير محمية** بـ `tabs-navigation-safe` class، مما قد يسبب مشاكل z-index مشابهة للمشاكل التي أصلحناها.

---

## الصفحات المحمية حالياً ✅

| الصفحة | الملف | الحالة |
|--------|-------|--------|
| Project Details | `ProjectDetailsPage.tsx` | ✅ محمي |
| Saved Projects | `SavedProjectsPage.tsx` | ✅ محمي |
| Tender Summary | `TenderSummaryPage.tsx` | ✅ محمي |

---

## الصفحات التي تحتاج حماية ❌

### 1. صفحة التقارير (ReportsPage.tsx)
- **السطر 281**: `<TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">`
- **التبويبات**: Export, Price Analysis, Compare Projects, Summary, Recent, Advanced

### 2. صفحة العقود (ContractsPage.tsx)
- **السطر 204**: `<TabsList className="flex flex-wrap h-auto gap-1">`
- **التبويبات**: Contracts, Dashboard, Milestones, Payments, Timeline, Warranties, Maintenance, FIDIC, Alerts

### 3. صفحة المقاولين من الباطن (SubcontractorsPage.tsx)
- **السطر 193**: `<TabsList className="grid grid-cols-3 w-full md:w-auto">`
- **التبويبات**: Dashboard, Management, BOQ Link

### 4. صفحة عروض الأسعار (QuotationsPage.tsx)
- **السطر 13**: `<TabsList>`
- **التبويبات**: Upload Quotations, Compare Quotations

### 5. صفحة أدوات التحليل (AnalysisToolsPage.tsx)
- **السطر 38**: `<TabsList className="grid w-full grid-cols-4">`
- **التبويبات**: Cost Analysis, Cost Breakdown, BOQ Comparison, Market Rates

### 6. صفحة الأسعار التاريخية (HistoricalPricingPage.tsx)
- **السطر 670**: `<TabsList>`
- **التبويبات**: Files, Statistics

### 7. مكون المكتبة (LibraryDatabase.tsx)
- **السطر 134**: `<TabsList className="grid w-full grid-cols-3 h-12">`
- **التبويبات**: Materials, Labor, Equipment

---

## التغييرات المطلوبة

### الملف 1: src/pages/ReportsPage.tsx (سطر 281)
```typescript
// قبل
<TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">

// بعد
<TabsList className="w-full flex flex-wrap h-auto gap-1 p-1 tabs-navigation-safe">
```

### الملف 2: src/pages/ContractsPage.tsx (سطر 204)
```typescript
// قبل
<TabsList className="flex flex-wrap h-auto gap-1">

// بعد
<TabsList className="flex flex-wrap h-auto gap-1 tabs-navigation-safe">
```

### الملف 3: src/pages/SubcontractorsPage.tsx (سطر 193)
```typescript
// قبل
<TabsList className="grid grid-cols-3 w-full md:w-auto">

// بعد
<TabsList className="grid grid-cols-3 w-full md:w-auto tabs-navigation-safe">
```

### الملف 4: src/pages/QuotationsPage.tsx (سطر 13)
```typescript
// قبل
<TabsList>

// بعد
<TabsList className="tabs-navigation-safe">
```

### الملف 5: src/pages/AnalysisToolsPage.tsx (سطر 38)
```typescript
// قبل
<TabsList className="grid w-full grid-cols-4">

// بعد
<TabsList className="grid w-full grid-cols-4 tabs-navigation-safe">
```

### الملف 6: src/pages/HistoricalPricingPage.tsx (سطر 670)
```typescript
// قبل
<TabsList>

// بعد
<TabsList className="tabs-navigation-safe">
```

### الملف 7: src/components/LibraryDatabase.tsx (سطر 134)
```typescript
// قبل
<TabsList className="grid w-full grid-cols-3 h-12">

// بعد
<TabsList className="grid w-full grid-cols-3 h-12 tabs-navigation-safe">
```

---

## اختبار التنقل (NavigationBar و FloatingBackButton)

### NavigationBar موجود في:
- **PageLayout.tsx** - يظهر تلقائياً في جميع الصفحات التي تستخدم PageLayout
- يحتوي على: زر **رجوع**، زر **الرئيسية**، و**Breadcrumbs**

### FloatingBackButton موجود في:
- **App.tsx** - عام لجميع الصفحات
- يظهر بعد التمرير 300px
- يحتوي على: زر **رجوع** و**العودة للأعلى**

### الصفحات التي تستخدم PageLayout:
1. ✅ ReportsPage
2. ✅ ContractsPage
3. ✅ SubcontractorsPage
4. ✅ QuotationsPage
5. ✅ AnalysisToolsPage
6. ✅ ProcurementPage
7. ✅ RiskPage
8. ✅ TemplatesPage
9. ✅ P6ExportPage
10. ✅ LibraryPage
11. ✅ MaterialPricesPage
12. ✅ ResourcesPage
13. ✅ SettingsPage

---

## قائمة الاختبار الشاملة

### اختبار التبويبات (Tabs)

| الصفحة | المسار | التبويبات للاختبار |
|--------|--------|-------------------|
| Reports | `/reports` | Export, Price Analysis, Compare, Summary, Recent, Advanced |
| Contracts | `/contracts` | Contracts, Dashboard, Milestones, Payments, Timeline, Warranties, Maintenance, FIDIC, Alerts |
| Subcontractors | `/subcontractors` | Dashboard, Management, BOQ Link |
| Quotations | `/quotations` | Upload, Compare |
| Analysis Tools | `/analysis-tools` | Cost Analysis, Cost Breakdown, BOQ Comparison, Market Rates |
| Historical Pricing | `/historical-pricing` | Files, Statistics |
| Library | `/library` | Materials, Labor, Equipment |
| Projects | `/projects` | Saved Projects, Analyze BOQ |
| Tender Summary | `/projects/:id/pricing` | جميع التبويبات الـ 8 |
| Project Details | `/projects/:id` | Overview, BOQ, Documents, Settings |

### اختبار القوائم المنسدلة (Select/Dropdown)

| الصفحة | القائمة | الغرض |
|--------|--------|-------|
| Project Details | Project Status | تغيير حالة المشروع |
| Project Details | Project Type | تغيير نوع المشروع |
| Project Details | Currency | تغيير العملة |
| Reports | Status Filter | فلترة حسب الحالة |
| Resources | Type Filter | فلترة حسب النوع |
| Resources | Status Filter | فلترة حسب الحالة |
| Cost Analysis | Template Select | تحميل قالب |

### اختبار أزرار التنقل

| العنصر | الموقع | الوظيفة |
|--------|--------|---------|
| زر رجوع | NavigationBar | العودة للصفحة السابقة |
| زر الرئيسية | NavigationBar | العودة للصفحة الرئيسية |
| Breadcrumbs | NavigationBar | التنقل بين المستويات |
| FloatingBackButton | أسفل يمين الشاشة | رجوع سريع بعد التمرير |
| زر العودة للأعلى | أسفل يمين الشاشة | التمرير لأعلى الصفحة |

---

## خطوات التنفيذ

1. **إضافة `tabs-navigation-safe` class** لجميع TabsList غير المحمية (7 ملفات)
2. **اختبار كل تبويب** في كل صفحة
3. **اختبار القوائم المنسدلة** في جميع الصفحات
4. **اختبار أزرار التنقل** في جميع الصفحات
5. **اختبار بعد إغلاق Dialog** للتأكد من عدم حدوث تجميد

---

## ملخص التغييرات

| الملف | السطر | التغيير |
|-------|-------|---------|
| ReportsPage.tsx | 281 | إضافة `tabs-navigation-safe` |
| ContractsPage.tsx | 204 | إضافة `tabs-navigation-safe` |
| SubcontractorsPage.tsx | 193 | إضافة `tabs-navigation-safe` |
| QuotationsPage.tsx | 13 | إضافة `tabs-navigation-safe` |
| AnalysisToolsPage.tsx | 38 | إضافة `tabs-navigation-safe` |
| HistoricalPricingPage.tsx | 670 | إضافة `tabs-navigation-safe` |
| LibraryDatabase.tsx | 134 | إضافة `tabs-navigation-safe` |

**إجمالي: 7 ملفات تحتاج تعديل**

