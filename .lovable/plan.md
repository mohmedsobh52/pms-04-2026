

# استخدام صورة الدوائر الالكترونية كخلفية للداشبورد

## الفكرة

استخدام الصورة المرفوعة (circuit board style) كخلفية ثابتة للتطبيق. الصورة الحالية تحتوي على 8 اذرع بينما البرنامج يحتوي على 10 اقسام، لذلك سنقوم بتوليد صورة جديدة بـ 10 اذرع تمثل اقسام البرنامج.

## الاقسام العشرة (الاذرع)

1. Projects (المشاريع)
2. BOQ (جدول الكميات)
3. Cost Analysis (التسعير والتحليل)
4. Contracts (العقود)
5. Procurement (المشتريات)
6. Subcontractors (مقاولي الباطن)
7. Risk Management (المخاطر)
8. Reports (التقارير)
9. Certificates (المستخلصات)
10. Library (المكتبة)

## خطوات التنفيذ

### 1. توليد صورة جديدة

استخدام Lovable AI (google/gemini-2.5-flash-image) لتوليد صورة مشابهة للصورة المرفوعة لكن بـ 10 اذرع، مع الحفاظ على:
- النمط الالكتروني (circuit board style)
- التدرج اللوني الازرق/الاخضر
- مركز دائري يحمل "PMS"
- ايقونة على كل ذراع

الصورة تحفظ في `public/images/pms-dashboard-bg.png`

### 2. تعديل BackgroundImage.tsx

استبدال الخلفية الحالية (gradient + aurora + grid + vignette) بالصورة المولدة مع طبقات بسيطة:
- الصورة كخلفية ثابتة (`background-size: cover`, `background-position: center`)
- overlay داكن شفاف (opacity ~0.75) لضمان قراءة المحتوى
- ابقاء light/dark mode overlay

### 3. تعديل HomePage.tsx

زيادة شفافية الكروت لاظهار الخلفية خلفها:
- الكروت تستخدم `bg-card/80 backdrop-blur-md`
- Welcome Banner بشفافية خفيفة

---

## الملفات المتأثرة

| الملف | الاجراء |
|---|---|
| `public/images/pms-dashboard-bg.png` | انشاء - صورة مولدة بـ AI |
| `src/components/BackgroundImage.tsx` | تعديل - استخدام الصورة كخلفية |
| `src/pages/HomePage.tsx` | تعديل - شفافية الكروت |

---

## التفاصيل التقنية

### طبقات الخلفية الجديدة

```text
1. الصورة المولدة - fixed, cover, center, -z-50
2. overlay داكن - fixed, bg-black/60 dark:bg-black/70, -z-40
3. light/dark mode overlay - fixed, bg-background/50, -z-10
```

### شفافية الكروت

الكروت والبطاقات ستستخدم `backdrop-blur-md` و `bg-card/80` حتى تظهر الخلفية خلفها بشكل خفيف مما يعطي تأثير عمق احترافي.

