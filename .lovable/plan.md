

## المطلوب
تنفيذ كل الاقتراحات الخمسة على شاشة Advanced Analysis (`AnalysisResults.tsx`):

1. **Sidebar Toggle** — زر طيّ/توسيع للقائمة الجانبية
2. **Pricing Progress Indicator** — شريط تقدّم لنسبة البنود المُسعّرة
3. **Instant Search** — بحث فوري داخل قائمة البنود
4. **Column Customization** — تثبيت/إخفاء الأعمدة في جدول البنود
5. **Test Navigation** — التحقق من عمل التنقل بين التبويبات

## التغييرات

### 1. `src/components/AnalysisResults.tsx` — Sidebar Toggle + Progress
- إضافة state `sidebarCollapsed` (افتراضي: false، يُحفظ في localStorage).
- زر toggle (`PanelLeftClose` / `PanelLeftOpen`) أعلى القائمة الجانبية.
- عند الطيّ: عرض القائمة `w-14` مع أيقونات فقط + tooltips، عند التوسيع: `w-52` كما هو.
- **شريط التقدم**: حساب `pricedCount / totalCount` من `items` وعرض `<Progress />` أعلى المحتوى الرئيسي مع نص `"45/120 items priced (37%)"`.

### 2. `src/components/project-details/ProjectBOQTab.tsx` (أو المكوّن المستخدم داخل تبويب Items)
بعد فحص أين يُعرض جدول البنود الفعلي:
- **Instant Search**: حقل `<Input>` مع أيقونة `Search` فوق الجدول، يفلتر `items` حسب `item_number` / `description` / `category` (debounced 200ms).
- **Column Customization**:
  - state `visibleColumns` (افتراضي كل الأعمدة) محفوظ في localStorage.
  - state `pinnedColumns` (افتراضي: `item_number`) محفوظ في localStorage.
  - زر `<DropdownMenu>` بعنوان "Columns" يحتوي قائمة Checkbox لكل عمود (إظهار/إخفاء) + أيقونة Pin بجانب كل عمود.
  - الأعمدة المثبّتة تُرسم بـ `position: sticky; left: 0` مع z-index و خلفية.

سأفحص أولاً المكوّن الفعلي لجدول البنود لأحدد التعديل بدقة.

### 3. ملفات جديدة محتملة
- `src/hooks/useTablePreferences.tsx` — hook موحّد لإدارة `visibleColumns` + `pinnedColumns` + `sidebarCollapsed` في localStorage بمفتاح لكل مشروع.

## ملفات متأثرة

| ملف | التغيير |
|------|---------|
| `src/components/AnalysisResults.tsx` | Sidebar collapse toggle + Progress indicator |
| `src/components/project-details/ProjectBOQTab.tsx` (يُحدَّد بعد الفحص) | Search + Column Customization |
| `src/hooks/useTablePreferences.tsx` | جديد — حفظ تفضيلات الجدول والقائمة |

## ملاحظات
- لا تغييرات على قاعدة البيانات.
- كل التفضيلات تُحفظ في localStorage بمفتاح يتضمن `projectId` لعزل المشاريع.
- دعم RTL/LTR للقائمة المطويّة والأعمدة المثبّتة.
- بعد التنفيذ: اقتراح اختبار يدوي (Toggle → Search → Pin column → تنقل بين التبويبات).

