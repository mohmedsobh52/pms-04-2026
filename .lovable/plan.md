

## المطلوب
تنفيذ الاقتراحات الثلاثة المتبقية:

1. **طي تلقائي على الموبايل** — القائمة الجانبية تُطوى تلقائياً عند `window.innerWidth < 768`، وتنفتح على الشاشات الكبيرة، مع احترام تفضيل المستخدم اليدوي.
2. **اختصار Ctrl+B** — يطوي/يوسّع القائمة الجانبية.
3. **زر "انتقل للبند التالي غير المسعّر"** — بجانب شريط التقدم، ينقل ويُمرّر إلى أول بند سعره = 0.

## التغييرات في `src/components/AnalysisResults.tsx`

### A. الطي التلقائي على الموبايل
- إضافة state `userToggledSidebar` (افتراضي: false). يصبح true عند ضغط المستخدم على الزر يدوياً.
- `useEffect` يستمع لـ `window.resize`:
  - إذا `userToggledSidebar === false`: ضبط `sidebarCollapsed = innerWidth < 768`.
- عند الضغط اليدوي على زر الطي: `setUserToggledSidebar(true)` ثم toggle.

### B. اختصار Ctrl+B / Cmd+B
- `useEffect` يضيف `keydown` listener:
  - `(e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b'` → `e.preventDefault()` + toggle + setUserToggledSidebar(true).

### C. زر "انتقل للبند التالي غير المسعّر"
- داخل بلوك Pricing Progress Indicator، بعد عداد النص:
  - عرض الزر فقط عندما `priced < total` (يوجد بنود غير مسعّرة).
  - عند الضغط: 
    1. التبديل إلى `activeTab === "items"` إن لم يكن نشطاً.
    2. إيجاد أول بند بـ `unit_price === 0 && total_price === 0` (مع مراعاة `editedPrices`).
    3. تمرير العنصر للعرض: `document.getElementById('boq-item-${itemNumber}')?.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
    4. إضافة class مؤقت `ring-2 ring-primary` للإبراز لمدة 2s.
- إضافة `id={"boq-item-" + item.item_number}` على صف الجدول داخل تبويب Items (سأبحث عن صف `<tr>` المناسب وأُضيف الـ id).

## ملفات متأثرة
- `src/components/AnalysisResults.tsx` — جميع التعديلات أعلاه.

## ملاحظات
- لا تغييرات على قاعدة البيانات.
- لا تبعيات جديدة.
- بعد التنفيذ: اقتراح اختبار (تغيير حجم النافذة، Ctrl+B، النقر على زر القفز).

