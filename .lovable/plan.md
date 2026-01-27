
# خطة إصلاح ارتجاف الفورم عند ملء البيانات

## تشخيص المشكلة

### السبب الجذري
المكون `PageTransition.tsx` يُسبب الارتجاف لأنه:

1. يستمع لتغييرات `children` في `useEffect` (السطر 25)
2. عند كل ضغطة مفتاح في أي حقل، يتغير state الفورم
3. هذا يُحدث `children` ويُعيد تشغيل animation
4. النتيجة: رسوم متحركة مستمرة (opacity + translate-y) تسبب الارتجاف

```typescript
// المشكلة في السطور 14-25
useEffect(() => {
  setIsVisible(false);  // يخفي المحتوى
  const timer = setTimeout(() => {
    setDisplayChildren(children);  // يُحدث المحتوى
    setIsVisible(true);  // يُظهر المحتوى
  }, 150);
  return () => clearTimeout(timer);
}, [location.pathname, children]);  // ← children يسبب المشكلة!
```

---

## الحل

### تعديل PageTransition.tsx لتجاهل تغييرات children

**الملف:** `src/components/PageTransition.tsx`

**التغييرات:**
1. إزالة `children` من dependencies الـ useEffect
2. تشغيل animation فقط عند تغيير المسار (route)
3. عرض `children` مباشرة بدون تخزينها في state

**الكود الجديد:**
```typescript
import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const previousPathname = useRef(location.pathname);

  useEffect(() => {
    // Only trigger animation when pathname changes
    if (previousPathname.current !== location.pathname) {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsVisible(true);
        previousPathname.current = location.pathname;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return (
    <div
      className={cn(
        "transition-opacity duration-150 ease-out",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      {children}
    </div>
  );
}
```

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `src/components/PageTransition.tsx` | إصلاح useEffect لتجاهل تغييرات children وتشغيل animation فقط عند تغيير route |

---

## التغييرات التقنية

1. **إزالة `displayChildren` state** - لم يعد ضرورياً
2. **إضافة `previousPathname` ref** - لتتبع تغيير المسار فقط
3. **إزالة `translate-y-2`** - لمنع أي حركة عمودية
4. **تقليل duration من 300ms إلى 150ms** - لتسريع الانتقال
5. **تغيير className من `transition-all` إلى `transition-opacity`** - لمنع أي تأثيرات جانبية

---

## النتيجة المتوقعة

```text
قبل الإصلاح:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• الكتابة في أي حقل → الصفحة ترتجف
• كل ضغطة مفتاح → animation جديد
• تجربة مستخدم سيئة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

بعد الإصلاح:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• الكتابة في أي حقل → لا ارتجاف
• Animation فقط عند الانتقال بين الصفحات
• تجربة مستخدم سلسة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## الاختبار المطلوب بعد التنفيذ

1. **فتح صفحة إنشاء مشروع جديد** ✓
2. **الكتابة في حقل اسم المشروع** → لا ارتجاف ✓
3. **الكتابة في حقل الموقع** → لا ارتجاف ✓
4. **تغيير العملة أو نوع المشروع** → لا ارتجاف ✓
5. **الانتقال بين الصفحات** → animation سلس ✓
