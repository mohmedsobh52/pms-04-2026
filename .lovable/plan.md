

# خطة تحسين سرعة استجابة الأزرار في القائمة الجانبية (⋮)

## تشخيص المشكلة

بعد فحص الكود و session replay، وجدت أن بطء الاستجابة ناتج عن عدة عوامل:

### الأسباب الرئيسية:

| السبب | التفاصيل | التأثير |
|-------|----------|---------|
| **الرسوم المتحركة** | `animate-in/animate-out` على DropdownMenuContent | تأخير 150-200ms |
| **e.preventDefault()** | يُنفذ في كل نقرة قبل الإجراء الفعلي | overhead إضافي |
| **معالجة الأحداث** | تعارض بين onClick و internal Radix handling | تأخير في التنفيذ |

---

## الحل المقترح

### 1. إزالة الرسوم المتحركة من DropdownMenu (تسريع كبير)

**الملف:** `src/components/ui/dropdown-menu.tsx`

إزالة classes الـ animation من `DropdownMenuContent` و `DropdownMenuSubContent`:

```typescript
// قبل (سطر 63-64)
"z-[70] min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md 
 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 
 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 
 data-[side=bottom]:slide-in-from-top-2..."

// بعد
"z-[70] min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
```

### 2. تبسيط onClick handlers في ProjectBOQTab

**الملف:** `src/components/project-details/ProjectBOQTab.tsx`

إزالة `e.preventDefault()` غير الضروري:

```typescript
// قبل
onClick={(e) => {
  e.preventDefault();
  onQuickPrice(item.id);
}}

// بعد - أبسط وأسرع
onClick={() => onQuickPrice(item.id)}
```

### 3. إضافة modal={false} لتعطيل modal behavior (تسريع إضافي)

**الملف:** `src/components/project-details/ProjectBOQTab.tsx`

```typescript
// إضافة modal={false} للـ DropdownMenu
<DropdownMenu modal={false}>
  <DropdownMenuTrigger asChild>
    ...
  </DropdownMenuTrigger>
  <DropdownMenuContent align={isArabic ? "start" : "end"}>
    ...
  </DropdownMenuContent>
</DropdownMenu>
```

هذا يمنع إنشاء focus trap ويسرع الاستجابة.

---

## ملخص التغييرات

| الملف | السطر | التغيير |
|-------|-------|---------|
| `dropdown-menu.tsx` | 47, 63-64 | إزالة classes الـ animation |
| `ProjectBOQTab.tsx` | 329-376 | إزالة `e.preventDefault()` من جميع onClick handlers |
| `ProjectBOQTab.tsx` | 321 | إضافة `modal={false}` للـ DropdownMenu |

---

## النتيجة المتوقعة

```text
قبل الإصلاح:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• النقر على الخيار → تأخير 150-300ms
• القائمة تغلق ببطء (animation)
• Dialog يفتح بعد انتهاء animation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

بعد الإصلاح:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• النقر على الخيار → استجابة فورية <50ms
• القائمة تختفي فوراً
• Dialog يفتح مباشرة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## الاختبار المطلوب

1. **فتح القائمة (⋮)** → يجب أن تظهر فوراً (بدون animation)
2. **النقر على Quick Price** → يجب أن يفتح Dialog فوراً
3. **النقر على Detailed Price** → يجب أن يفتح Dialog فوراً
4. **النقر على Edit/Delete** → يجب أن يعمل فوراً
5. **لا يوجد تأخير محسوس** بين النقر والاستجابة

