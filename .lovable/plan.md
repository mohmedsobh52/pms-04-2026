## الهدف
عند تسعير بنود BOQ بالذكاء الاصطناعي، يبحث النظام أولاً داخل **البيانات التاريخية** (`historical_pricing_files`) و**عروض الأسعار** (`price_quotations.ai_analysis.items`) قبل اللجوء لمكتبة الأسعار العامة، ويُظهر للمستخدم المصدر والثقة لكل بند.

## الخطوات

### 1) Edge Function جديدة: `ai-price-from-history`
- المدخلات: `items[]` (id, description, unit, category) + `isArabic`
- يستخرج المرشحين من حساب المستخدم:
  - `historical_pricing_files.items` → كل بند مع `description / unit / unit_price / project_name / project_date`
  - `price_quotations` حيث `status='analyzed'` → كل سطر داخل `ai_analysis.items` مع `supplier_name / quotation_date`
- يستدعي Gemini عبر Lovable AI Gateway (tool-calling) لإرجاع لكل بند:
  `{ itemId, source: 'historical'|'quotation'|null, sourceId, sourceLabel, unitPrice, confidence (0-100), reason }`
- ثقة ≥ 95 فقط عند التطابق شبه المؤكد، وإلا `null`.

### 2) مكون UI جديد: تبويب "تسعير من السجلات" داخل `AutoPriceDialog`
- زر تشغيل: "بحث في التاريخي والعروض"
- يعرض جدول النتائج:
  - وصف البند | السعر المقترح | المصدر (شارة ملوّنة: 📚 تاريخي / 📄 عرض سعر) | اسم المشروع/المورد + التاريخ | شريط ثقة + السبب
  - Checkbox لكل صف + "تطبيق المحدد"
- الفلاتر: حد أدنى للثقة (افتراضي 80)، المصدر (الكل/تاريخي/عروض).
- البنود غير المتطابقة → عرضها كقائمة "بدون مطابقة" مع اقتراح تمريرها إلى `ai-auto-price` (مكتبة الأسعار) كـ fallback بضغطة زر.

### 3) التطبيق على البنود
- عند الضغط على "تطبيق": تحديث `item_costs.ai_suggested_rate` للبنود المختارة + كتابة سطر في `analysis_audit_logs` بـ `action='ai_price_from_history'` يحتوي على المصدر.

### 4) عرض سريع داخل صف البند
- Tooltip تحت السعر المقترح يوضح: "مصدر السعر: عرض المورد X بتاريخ Y" أو "مشروع Z السابق".

## ملاحظات تقنية
- إعادة استخدام نمط chunking (40 عنصر / طلب) من `ai-auto-price`.
- تقليم المرشحين إلى 400 (الأحدث أولاً) لتقليل تكلفة الـ prompt.
- العملة الافتراضية SAR — تحويلات العملة خارج نطاق هذه المرحلة.
- لا تغييرات على schema (نقرأ فقط من جداول قائمة).

## الملفات المتأثرة
- جديد: `supabase/functions/ai-price-from-history/index.ts`
- تعديل: `src/components/project-details/AutoPriceDialog.tsx` (إضافة Tab)
- جديد: `src/components/project-details/PriceFromHistoryTab.tsx`
