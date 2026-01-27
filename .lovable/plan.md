
# خطة تحديث الشعار والصورة الشخصية

## نظرة عامة

سيتم تحديث ملفات الأصول (assets) في المشروع لاستبدال:
1. **شعار شركة الإمتياز** - الشعار الجديد للهيدر
2. **الصورة الشخصية** - صورة محسنة ذات جودة أعلى

---

## الصور المرفقة

| الصورة | الاستخدام |
|--------|----------|
| `New_logo_Alimtyaz.jpg-2.jpeg` | شعار الإمتياز الجديد |
| `Mohamed_Sobh_Picture_1-2.jpg` | الصورة الشخصية المحسنة |

---

## التعديلات المطلوبة

### 1. نسخ الصور الجديدة إلى المشروع

```text
user-uploads://New_logo_Alimtyaz.jpg-2.jpeg → src/assets/company/alimtyaz-logo.jpg
user-uploads://Mohamed_Sobh_Picture_1-2.jpg → src/assets/developer/mohamed-sobh.jpg (استبدال)
```

### 2. تحديث `src/pages/HomePage.tsx`

**إضافة استيراد الشعار الجديد:**

```typescript
import alimtyazLogo from "@/assets/company/alimtyaz-logo.jpg";
```

**تحديث عرض الشعار في الهيدر:**

```tsx
{/* Left: Company Logo - Always show Alimtyaz logo */}
<div className="flex items-center gap-3 flex-shrink-0">
  <Link to="/" className="flex items-center gap-3">
    <div className="w-12 h-12 rounded-lg overflow-hidden border border-border/50 bg-white p-1 shadow-sm">
      <img 
        src={alimtyazLogo} 
        alt="Alimtyaz" 
        className="w-full h-full object-contain"
      />
    </div>
    <div className="hidden md:block">
      <h1 className="font-display text-lg font-bold gradient-text">PMS</h1>
      <p className="text-xs text-muted-foreground">
        {isArabic ? "نظام إدارة المشاريع" : "Project Management"}
      </p>
    </div>
  </Link>
</div>
```

### 3. تحديث الملفات الأخرى تلقائياً

الصورة الشخصية الجديدة ستُستخدم تلقائياً في:
- `src/components/DeveloperInfo.tsx`
- `src/pages/About.tsx`

(لأنها تستورد نفس المسار `@/assets/developer/mohamed-sobh.jpg`)

---

## ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/assets/company/alimtyaz-logo.jpg` | إضافة (جديد) |
| `src/assets/developer/mohamed-sobh.jpg` | استبدال |
| `src/pages/HomePage.tsx` | تحديث استيراد واستخدام الشعار |

---

## النتيجة المتوقعة

### الهيدر الجديد:

```text
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [شعار الإمتياز]  [🔍 بحث في البرنامج... ⌘K]  [صورتك المحسنة]   │
│    الجديد             PMS                      بجودة عالية       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## مميزات التحديث

| الميزة | الوصف |
|--------|-------|
| **شعار ثابت** | شعار الإمتياز يظهر دائماً (غير مرتبط بـ localStorage) |
| **صورة محسنة** | صورة شخصية بجودة أعلى وخلفية واضحة |
| **تحديث شامل** | الصورة الجديدة تظهر في جميع الصفحات |
| **حفظ الذاكرة** | لا حاجة للخطوة السابقة (رفع الشعار في الإعدادات) |
