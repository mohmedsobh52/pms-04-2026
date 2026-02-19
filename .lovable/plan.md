
# إضافة تبويب "تحليل BOQ" في صفحة المشاريع

## ما يريده المستخدم

إضافة شاشة **تحليل وتحميل ملفات BOQ** (الموضحة في الصورة) كتبويب جديد داخل صفحة `/projects`. هذه الشاشة هي مكون `BOQAnalyzerPanel` الكامل الذي يتضمن:
- سحب وإفلات الملفات (PDF / Excel)
- استخراج النص وتحليله
- عرض النتائج كاملة (AnalysisResults)
- حفظ المشروع

## الوضع الحالي

صفحة `/projects` (`SavedProjectsPage.tsx`) تحتوي حالياً على **3 تبويبات**:
1. المشاريع (Projects)
2. التقارير (Reports)
3. المرفقات (Attachments)

زر "ابدأ التحليل" الموجود في تبويب المشاريع يوجه المستخدم إلى `/analyze` وهو route يُعيد توجيه لـ `/projects` — لذلك الزر لا يفيد حالياً.

## الحل

### إضافة تبويب رابع "تحليل BOQ" في `SavedProjectsPage.tsx`

**التغييرات:**

1. **استيراد `BOQAnalyzerPanel`:**
```typescript
import { BOQAnalyzerPanel } from "@/components/BOQAnalyzerPanel";
```

2. **إضافة التبويب في `TabsList`** (من 3 إلى 4 تبويبات):
```typescript
<TabsTrigger value="analyze" className="gap-2 ...">
  <Sparkles className="w-4 h-4" />
  <span className="hidden sm:inline">{isArabic ? "تحليل BOQ" : "Analyze BOQ"}</span>
</TabsTrigger>
```

3. **إضافة TabsContent للتحليل:**
```typescript
<TabsContent value="analyze">
  <BOQAnalyzerPanel
    onProjectSaved={(projectId) => {
      fetchProjects(); // إعادة تحميل المشاريع بعد الحفظ
      setActiveTab("projects"); // الانتقال لتبويب المشاريع
    }}
    embedded={true}
  />
</TabsContent>
```

4. **تحديث زر "ابدأ التحليل"** في كارت رفع BOQ:
```typescript
// بدلاً من navigate("/analyze")
onClick={() => setActiveTab("analyze")}
```

5. **دعم URL للتبويب الجديد:** تحديث منطق URL parsing لدعم `?tab=analyze`.

## ملخص التغييرات

| الملف | التعديل |
|-------|---------|
| `src/pages/SavedProjectsPage.tsx` | استيراد `BOQAnalyzerPanel` + تبويب رابع + تحديث زر "ابدأ التحليل" |

لا تغييرات على قاعدة البيانات أو Edge Functions.

## سبب نجاح الحل

- `BOQAnalyzerPanel` هو مكون مكتمل وجاهز، يعمل بشكل مستقل
- الخاصية `embedded={true}` تُخفي الـ padding الخارجي غير الضروري
- عند حفظ المشروع ينتقل تلقائياً لتبويب "المشاريع" مع إعادة تحديث القائمة
