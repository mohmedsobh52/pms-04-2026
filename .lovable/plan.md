
# اعادة تصميم الهوم بيدج - شاشة الاقسام العشرة التفاعلية

## الفكرة

اعادة كتابة صفحة الهوم بيدج بالكامل لتكون شاشة navigation hub بسيطة وانيقة تعرض فقط:
1. الـ 10 اقسام (اذرع) كبطاقات تفاعلية شفافة فوق صورة الخلفية
2. بيانات المصمم (صورة + لوجو الشركة + معلومات الاتصال)

بالضغط على اي قسم يتم الانتقال مباشرة الى الصفحة المقابلة.

---

## التصميم

```text
+----------------------------------------------------------+
|  [لوجو PMS]              UnifiedHeader          [اعدادات] |
+----------------------------------------------------------+
|                                                          |
|   صورة الدوائر الالكترونية كخلفية كاملة                  |
|                                                          |
|   +----------+  +----------+  +----------+  +----------+ |
|   | مشاريع   |  | BOQ      |  | تسعير    |  | عقود     | |
|   | Projects |  | Items    |  | Costs    |  | Contract | |
|   +----------+  +----------+  +----------+  +----------+ |
|                                                          |
|   +----------+  +----------+  +----------+               |
|   | مشتريات  |  | مقاولين  |  | مخاطر    |               |
|   | Procure  |  | Subcon   |  | Risk     |               |
|   +----------+  +----------+  +----------+               |
|                                                          |
|   +----------+  +----------+  +----------+               |
|   | تقارير   |  | مستخلصات |  | مكتبة    |               |
|   | Reports  |  | Certif   |  | Library  |               |
|   +----------+  +----------+  +----------+               |
|                                                          |
+----------------------------------------------------------+
| [صورة] Dr.Eng. Mohamed Sobh | [لوجو] AL IMTYAZ          |
| مدير المشاريع | هاتف | ايميل                              |
+----------------------------------------------------------+
```

---

## الاقسام العشرة وروابطها

| # | القسم | الرابط | الايقونة |
|---|-------|--------|----------|
| 1 | المشاريع (Projects) | /projects | FolderOpen |
| 2 | جدول الكميات (BOQ) | /items | Layers |
| 3 | التسعير والتحليل (Cost Analysis) | /cost-analysis | DollarSign |
| 4 | العقود (Contracts) | /contracts | Briefcase |
| 5 | المشتريات (Procurement) | /procurement | Package |
| 6 | مقاولي الباطن (Subcontractors) | /subcontractors | Users |
| 7 | المخاطر (Risk) | /risk | AlertTriangle |
| 8 | التقارير (Reports) | /projects?tab=reports | FileText |
| 9 | المستخلصات (Certificates) | /progress-certificates | Award |
| 10 | المكتبة (Library) | /library | BookOpen |

---

## خطوات التنفيذ

### 1. اعادة كتابة `src/pages/HomePage.tsx`

**حذف كامل** للمحتوى القديم (KPI cards, Recent Projects, Quick Access, Lifecycle, PhaseActions) واستبداله بـ:

- **Header Section**: عنوان PMS + لوجو الشركة + رسالة ترحيب مختصرة
- **Navigation Grid**: شبكة من 10 بطاقات شفافة (`bg-black/30 backdrop-blur-sm`)
  - كل بطاقة: ايقونة كبيرة + اسم عربي + اسم انجليزي
  - تاثير hover: توهج + تكبير (`hover:scale-105 hover:bg-primary/20`)
  - بالضغط: `Link` مباشر للصفحة المقابلة
  - تخطيط: 5 اعمدة desktop / 3 tablet / 2 mobile
- **Designer Footer**: شريط ثابت اسفل الصفحة يحتوي:
  - صورة المصمم الشخصية (دائرية)
  - الاسم والمنصب (Dr.Eng. Mohamed Sobh - Projects Director)
  - لوجو شركة الامتياز
  - هاتف + ايميل (روابط مباشرة)

### 2. الصفحة لن تستخدم `PageLayout`

لان الهوم بيدج الجديدة صفحة full-screen بدون navigation bar او breadcrumbs. ستستخدم فقط `UnifiedHeader` مباشرة مع `BackgroundImage`.

---

## الملفات المتاثرة

| الملف | الاجراء |
|-------|---------|
| `src/pages/HomePage.tsx` | اعادة كتابة كاملة |

---

## التفاصيل التقنية

### بيانات المصمم (من DeveloperInfo.tsx الموجود)

- الاسم: Dr.Eng. Mohamed Sobh
- المنصب: Projects Director / مدير المشاريع
- الشركة: AL IMTYAZ ALWATANIYA CONT.
- الهاتف: +966 54 800 0243
- الايميل: moh.sobh@imtyaz.sa
- الصورة: `src/assets/developer/mohamed-sobh.jpg`
- اللوجو: `src/assets/company/alimtyaz-logo.jpg`

### تنسيق البطاقات

كل بطاقة تفاعلية:
- `bg-black/30 backdrop-blur-sm border border-white/10`
- `hover:bg-primary/20 hover:border-primary/40 hover:scale-105`
- `transition-all duration-300 cursor-pointer`
- ايقونة `h-10 w-10` + نص بحجمين (عربي وانجليزي)
- `rounded-xl shadow-lg`

### شريط المصمم

- `bg-black/50 backdrop-blur-md border-t border-white/10`
- صورة `w-12 h-12 rounded-full ring-2 ring-primary/30`
- لوجو `w-10 h-10 rounded-lg`
- روابط الهاتف والايميل قابلة للضغط

### المحتوى القديم

محتوى الداشبورد الحالي (KPIs, Recent Projects, Lifecycle) يبقى متاحا في صفحة `/dashboard` الموجودة مسبقا (DashboardPage.tsx).
