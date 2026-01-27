

# خطة إضافة الصورة الشخصية ورابط LinkedIn

## نظرة عامة

سيتم تحديث ملفات البرنامج لاستبدال أيقونة المستخدم الحالية بصورتك الشخصية الاحترافية، وإضافة رابط LinkedIn، وتحديث البيانات بناءً على بطاقة العمل المرفقة.

---

## الصور المرفقة

| الصورة | الاستخدام |
|--------|----------|
| `Mohamed_Sobh_Picture_1.jpg` | الصورة الشخصية في قسم المطور |
| `ID_Card_Mohamed_Sobh.png` | مرجع للتأكد من صحة البيانات |

---

## التعديلات المطلوبة

### 1. نسخ الصورة إلى مجلد المشروع

```
src/assets/developer/mohamed-sobh.jpg
```

### 2. تحديث `src/components/DeveloperInfo.tsx`

**التغييرات:**

- استيراد الصورة الشخصية
- إضافة رابط LinkedIn
- استبدال أيقونة `User` بالصورة الفعلية

```typescript
// إضافة الاستيراد
import developerPhoto from "@/assets/developer/mohamed-sobh.jpg";
import { Linkedin } from "lucide-react";

const developer = {
  name: "Dr.Eng. Mohamed Sobh",
  titleAr: "مدير المشاريع",
  titleEn: "Projects Director",
  company: "AL IMTYAZ ALWATANIYA CONT.",
  phone: "+966 54 800 0243",
  email: "moh.sobh@imtyaz.sa",
  email2: "mohammed_sobh2020@yahoo.om",
  linkedin: "https://www.linkedin.com/in/mohamed-sobh-ab2083ba/", // إضافة جديدة
  photo: developerPhoto, // إضافة جديدة
  address: {
    ar: "شارع الأمير محمد بن عبدالعزيز، فندق WA، الدور 13، جدة 23453",
    en: "Prince Mohammed Bin Abdulaziz St., WA Hotel, 13th Floor, Jeddah 23453"
  }
};
```

**تحديث عرض الصورة:**

```tsx
// من:
<div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
  <User className="w-8 h-8" />
</div>

// إلى:
<div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/30">
  <img 
    src={developer.photo} 
    alt={developer.name}
    className="w-full h-full object-cover"
  />
</div>
```

**إضافة رابط LinkedIn:**

```tsx
<ContactItem 
  icon={Linkedin} 
  value={isArabic ? "الملف الشخصي" : "LinkedIn Profile"} 
  href={developer.linkedin} 
/>
```

---

### 3. تحديث `src/pages/About.tsx`

**التغييرات:**

- استيراد الصورة
- استبدال أيقونة User بالصورة الشخصية
- إضافة رابط LinkedIn
- تحسين التصميم

```typescript
import developerPhoto from "@/assets/developer/mohamed-sobh.jpg";
import { Linkedin } from "lucide-react";
```

**تحديث قسم المطور:**

```tsx
// من:
<div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 
  flex items-center justify-center flex-shrink-0 shadow-lg">
  <User className="w-12 h-12 md:w-16 md:h-16 text-white" />
</div>

// إلى:
<div className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden 
  flex-shrink-0 shadow-lg border-4 border-orange-500/30">
  <img 
    src={developerPhoto} 
    alt={developer.name}
    className="w-full h-full object-cover"
  />
</div>
```

**إضافة زر LinkedIn:**

```tsx
<a 
  href="https://www.linkedin.com/in/mohamed-sobh-ab2083ba/"
  target="_blank"
  rel="noopener noreferrer"
  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
>
  <Linkedin className="w-4 h-4" />
  LinkedIn
</a>
```

---

## ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/assets/developer/mohamed-sobh.jpg` | إضافة الصورة الشخصية (نسخ) |
| `src/components/DeveloperInfo.tsx` | استبدال الأيقونة بالصورة + إضافة LinkedIn |
| `src/pages/About.tsx` | استبدال الأيقونة بالصورة + إضافة LinkedIn |

---

## النتيجة المتوقعة

### قبل التعديل:
```text
┌─────────────────────────────────┐
│  ┌──────┐                       │
│  │ 👤   │  Dr.Eng. Mohamed Sobh │
│  │ Icon │  Projects Director    │
│  └──────┘                       │
└─────────────────────────────────┘
```

### بعد التعديل:
```text
┌─────────────────────────────────────┐
│  ┌──────┐                           │
│  │ 📷   │  Dr.Eng. Mohamed Sobh     │
│  │Photo │  Projects Director        │
│  └──────┘  📞 +966 54 800 0243      │
│            ✉️ moh.sobh@imtyaz.sa    │
│            🔗 LinkedIn Profile       │
└─────────────────────────────────────┘
```

---

## مميزات التحديث

| الميزة | الوصف |
|--------|-------|
| **صورة شخصية** | صورة احترافية بدلاً من أيقونة |
| **رابط LinkedIn** | وصول مباشر للملف الشخصي |
| **تصميم محسن** | إطار أنيق حول الصورة |
| **Responsive** | يعمل على جميع الأجهزة |

