

# خطة إنشاء شاشة الشركاء الخارجيين ودمجها مع صفحة المشتريات

## الهدف

إنشاء شاشة جديدة مشابهة للصورة المرفقة تحتوي على:
1. **قسم الشركاء الخارجيين (External Partners)** - لإدارة الموردين والشركاء
2. **قسم العقود (Contracts)** - مربوط بالعقود الموجودة
3. **زر طلب عرض سعر (Request Offer)**
4. دمج كل ذلك في صفحة Procurement الحالية

---

## التصميم المقترح

```text
┌────────────────────────────────────────────────────────────────────────────┐
│  ◀  Procurement          [✨ Request Offer]        🔍 Search...    🔔  👤  │
│  Main > Procurement                                                        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  📦 External Partners                              ⤢  🔍  ⚙ Filters  ↕ Sort │
│  ┌─────────────────┐                                                       │
│  │ [+ Add Partner] │                                                       │
│  └─────────────────┘                                                       │
│                                                                            │
│  ┌─────────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │ 🏢  ⭐⭐⭐⭐⭐ 4/5           ✏️     │  │ 🏢  ⭐⭐⭐⭐ 3.5/5          │  │
│  │ Qatar Tech Hub                      │  │ Saudi Suppliers Co.          │  │
│  │ Premium technology solutions        │  │ Construction materials       │  │
│  │                                     │  │                              │  │
│  │ [Active]        📅 24 Sept - 23 Nov │  │ [Active]    📅 15 Oct - 15 Jan│  │
│  │                                     │  │                              │  │
│  │         [ View Details ]            │  │       [ View Details ]       │  │
│  └─────────────────────────────────────┘  └─────────────────────────────┘  │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  📄 Contracts                                      ⤢  🔍  ⚙ Filters  ↕ Sort │
│  ┌─────────────────┐                                                       │
│  │ [+ Add Contract]│                                                       │
│  └─────────────────┘                                                       │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📋 ?                                                               │   │
│  │     No contracts available                                          │   │
│  │     You don't have any contracts yet.                               │   │
│  │     To create a new contract, you first need to add at least        │   │
│  │     one partner.                                                    │   │
│  │                                                                     │   │
│  │                   [ 📄 Add Contract ]                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## الملفات الجديدة والتعديلات

### 1. إنشاء جدول قاعدة بيانات للشركاء الخارجيين

**جدول جديد:** `external_partners`

```sql
CREATE TABLE external_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  rating NUMERIC DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  partner_type TEXT DEFAULT 'supplier' CHECK (partner_type IN ('supplier', 'vendor', 'contractor', 'consultant')),
  contract_start_date DATE,
  contract_end_date DATE,
  logo_url TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE external_partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own partners"
  ON external_partners FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 2. إنشاء مكون ExternalPartners.tsx

**ملف جديد:** `src/components/procurement/ExternalPartners.tsx`

المكون سيحتوي على:
- قائمة الشركاء في بطاقات (Cards)
- زر إضافة شريك جديد
- فلاتر وبحث وترتيب
- نافذة حوار لإضافة/تعديل شريك
- عرض التفاصيل

```typescript
// الخصائص الرئيسية:
interface ExternalPartner {
  id: string;
  name: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  rating: number;
  status: 'active' | 'inactive' | 'pending';
  partner_type: 'supplier' | 'vendor' | 'contractor' | 'consultant';
  contract_start_date: string | null;
  contract_end_date: string | null;
  logo_url: string | null;
}
```

### 3. إنشاء مكون ProcurementContracts.tsx

**ملف جديد:** `src/components/procurement/ProcurementContracts.tsx`

مكون مبسط للعقود المرتبطة بالشركاء، مع:
- عرض العقود المرتبطة بالشركاء الخارجيين
- رابط لصفحة العقود الكاملة
- إمكانية الإضافة السريعة

### 4. إنشاء مكون RequestOfferDialog.tsx

**ملف جديد:** `src/components/procurement/RequestOfferDialog.tsx`

نافذة لطلب عرض سعر من الشركاء:
- اختيار الشركاء المستهدفين
- تحديد البنود المطلوبة
- إرسال الطلب (أو حفظه كمسودة)

### 5. تحديث صفحة Procurement

**ملف:** `src/pages/ProcurementPage.tsx`

تحويل الصفحة إلى تبويبات:

```typescript
<Tabs defaultValue="partners" className="space-y-4">
  <TabsList>
    <TabsTrigger value="partners">
      <Building2 /> {isArabic ? "الشركاء" : "Partners"}
    </TabsTrigger>
    <TabsTrigger value="procurement">
      <Package /> {isArabic ? "المشتريات" : "Procurement"}
    </TabsTrigger>
    <TabsTrigger value="contracts">
      <FileText /> {isArabic ? "العقود" : "Contracts"}
    </TabsTrigger>
  </TabsList>

  <TabsContent value="partners">
    <ExternalPartners />
  </TabsContent>
  
  <TabsContent value="procurement">
    <ProcurementResourcesSchedule />
  </TabsContent>
  
  <TabsContent value="contracts">
    <ProcurementContracts />
  </TabsContent>
</Tabs>
```

### 6. إضافة زر "Request Offer" في الهيدر

إضافة زر في رأس الصفحة:
```tsx
<Button className="gap-2 bg-gradient-to-r from-orange-500 to-red-500">
  <Sparkles className="w-4 h-4" />
  {isArabic ? "طلب عرض سعر" : "Request Offer"}
</Button>
```

---

## هيكل الملفات الجديدة

```text
src/components/procurement/
├── ExternalPartners.tsx          # مكون الشركاء الخارجيين
├── PartnerCard.tsx               # بطاقة الشريك الواحد
├── AddPartnerDialog.tsx          # نافذة إضافة/تعديل شريك
├── PartnerDetailsDialog.tsx      # نافذة تفاصيل الشريك
├── ProcurementContracts.tsx      # عقود المشتريات المبسطة
├── RequestOfferDialog.tsx        # نافذة طلب عرض سعر
└── index.ts                      # تصدير المكونات
```

---

## خصائص بطاقة الشريك

كل بطاقة شريك ستعرض:

| العنصر | الوصف |
|--------|-------|
| الأيقونة/الشعار | صورة الشعار أو أيقونة افتراضية |
| التقييم | نجوم من 5 (مثل ⭐⭐⭐⭐ 4/5) |
| زر التعديل | أيقونة قلم للتعديل السريع |
| الاسم | اسم الشريك/المورد |
| الوصف | وصف مختصر للنشاط |
| الحالة | Badge (Active/Inactive/Pending) |
| فترة العقد | من تاريخ - إلى تاريخ |
| زر التفاصيل | عرض كامل التفاصيل |

---

## الفلاتر المتاحة

- **البحث:** بالاسم أو الوصف
- **الحالة:** الكل / نشط / غير نشط / معلق
- **النوع:** مورد / بائع / مقاول / مستشار
- **الترتيب:** الاسم / التقييم / تاريخ الإنشاء

---

## الربط مع العقود

عند إضافة عقد من صفحة العقود، يمكن ربطه بشريك خارجي:
- إضافة حقل `partner_id` للجدول `contracts` (اختياري)
- عرض العقود المرتبطة في تفاصيل الشريك

---

## قائمة الملفات

| الملف | الحالة | الوصف |
|-------|--------|-------|
| `supabase/migrations/xxx_create_external_partners.sql` | جديد | جدول الشركاء |
| `src/components/procurement/ExternalPartners.tsx` | جديد | المكون الرئيسي |
| `src/components/procurement/PartnerCard.tsx` | جديد | بطاقة الشريك |
| `src/components/procurement/AddPartnerDialog.tsx` | جديد | نافذة الإضافة |
| `src/components/procurement/PartnerDetailsDialog.tsx` | جديد | نافذة التفاصيل |
| `src/components/procurement/ProcurementContracts.tsx` | جديد | قسم العقود |
| `src/components/procurement/RequestOfferDialog.tsx` | جديد | طلب عرض سعر |
| `src/components/procurement/index.ts` | جديد | التصدير |
| `src/pages/ProcurementPage.tsx` | تعديل | دمج المكونات |

---

## الخطوات التنفيذية

1. **إنشاء جدول قاعدة البيانات** - `external_partners` مع RLS
2. **إنشاء مكونات الشركاء** - البطاقات والنوافذ
3. **تحديث صفحة Procurement** - إضافة التبويبات
4. **إضافة زر Request Offer** - في رأس الصفحة
5. **اختبار الوظائف** - CRUD للشركاء وعرض العقود

---

## مميزات الحل

- ✅ واجهة مشابهة للصورة المرفقة
- ✅ دعم كامل للغتين العربية والإنجليزية
- ✅ تكامل مع نظام العقود الموجود
- ✅ فلاتر وبحث وترتيب
- ✅ بطاقات جذابة مع تقييم بالنجوم
- ✅ حماية RLS لبيانات المستخدم

