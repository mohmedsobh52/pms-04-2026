# خطة التحديث الشامل للبرنامج

النطاق كبير، سننفذه على 4 محاور متوازية مع الالتزام بـ **Emerald Prestige** والـ Sora/Manrope.

---

## 1) تحسينات بصرية وتصميم

- **توحيد بطاقات الإحصاءات** عبر كل الشاشات (Dashboard, Procurement, Contracts, Quotations, EVM) بنمط واحد: gradient ناعم، حدّ ذهبي خفيف، أيقونة دائرية ملوّنة، أرقام بـ Sora.
- **Header موحّد** بظل أعمق + شريط تقدم متحرك أعلى الصفحة عند التحميل.
- **Empty states** أنيقة مع SVG مخصص بدل النص الجاف على الشاشات: المستخلصات، الموردين، المخاطر، الجدولة.
- **تحسين الجداول**: صفوف بـ hover ذهبي خفيف، sticky header، zebra ناعم، badges حالة موحّدة.
- **Skeleton loaders** بدل spinners عشوائية في الصفحات الثقيلة.

## 2) إضافة ميزات ناقصة

- **شاشة "ملخص تنفيذي" `/executive-summary`**: KPIs + اتجاهات + تنبيهات حرجة، تُطبع PDF.
- **مركز إشعارات موحّد** (Bell في الـ Header) يجمع: عقود قاربت الانتهاء، مستخلصات معلّقة، مخاطر عالية، مهام متأخرة.
- **بحث عالمي محسّن (Ctrl+K)**: نتائج مجمّعة بحسب الوحدة (مشاريع، عقود، بنود، موردين).
- **مقارنة مشاريع** `/projects/compare`: اختيار مشروعين+ ومقارنة القيمة/المدة/التقدم/EVM.
- **تصدير شامل**: زر "تصدير كامل المشروع" يجمع BOQ + المستخلصات + العقود + المخاطر في ملف ZIP.
- **سجل النشاط لكل مشروع** (Activity Timeline) في صفحة تفاصيل المشروع.

## 3) تحسين الأداء

- **Code-splitting أعمق**: تقسيم Recharts/jspdf/xlsx إلى chunks منفصلة عبر `manualChunks` في vite.config.
- **React Query staleTime/gcTime موحّد** (60s/5m) لتقليل refetch.
- **Virtualization** للجداول الطويلة (BOQ Items, Pricing History) عبر `@tanstack/react-virtual`.
- **Debounce للبحث** على كل شاشات الفلترة (300ms).
- **Memoization** لمكونات Dashboard الثقيلة (`React.memo` + `useMemo` للحسابات).
- **Lazy hydration** للـ widgets خارج viewport عبر `useInView` الموجود.

## 4) إصلاح أخطاء ومشاكل أمنية

- تشغيل **security scan** كامل وحل ما يظهر.
- **تفعيل HIBP** (Leaked Password Protection) عبر `configure_auth`.
- مراجعة جميع جداول `public.*` للتأكد من `GRANT` صحيح + RLS مفعّل.
- **Zod validation** على جميع نماذج الإدخال الرئيسية (Contracts, Quotations, BOQ Items).
- إصلاح أي تحذيرات React/TypeScript ظاهرة في console.

---

## التفاصيل التقنية

| المحور | الملفات الجديدة | الملفات المعدّلة |
|---|---|---|
| تصميم | `src/components/ui/stat-card.tsx`, `src/components/ui/empty-state.tsx`, `src/components/ui/skeleton-table.tsx` | كل صفحات `src/pages/*` التي تعرض stats/جداول |
| ميزات | `src/pages/ExecutiveSummaryPage.tsx`, `src/pages/ProjectsComparePage.tsx`, `src/components/NotificationsCenter.tsx`, `src/lib/full-project-export.ts` | `App.tsx`, `UnifiedHeader.tsx`, `NavigationBar.tsx` |
| أداء | — | `vite.config.ts`, hooks، صفحات الجداول الكبيرة |
| أمان | migration GRANTs + RLS audit | `configure_auth` (HIBP), schemas zod في النماذج |

## الترتيب التنفيذي

1. الأمان أولاً (scan + HIBP + grants) — لا يكسر UI.
2. الأداء (vite chunks + react-query defaults) — مكاسب فورية.
3. مكونات UI الموحّدة (StatCard, EmptyState, SkeletonTable) ثم تطبيقها تدريجياً.
4. الميزات الجديدة (Executive Summary, Notifications Center, Compare, Export).

## خارج النطاق

- إعادة تصميم كامل لنظام الألوان (نلتزم بـ Emerald Prestige).
- تغيير نظام المصادقة أو الأدوار.
- ميزات backend جديدة بخلاف ما ذُكر.
