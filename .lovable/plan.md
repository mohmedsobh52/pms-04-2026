

# خطة إضافة الهيدر الاحترافي للصفحة الرئيسية

## نظرة عامة

سيتم تعديل الصفحة الرئيسية (HomePage) لإضافة هيدر ثابت (sticky) يحتوي على:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  [شعار الشركة]    [───── صندوق البحث المتطور ─────]    [الصورة الشخصية]      │
│     (يسار)                    (وسط)                        (يمين)            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## التصميم المستهدف

| الموقع | المحتوى | التفاصيل |
|--------|---------|----------|
| **يسار** | شعار شركة الإمتياز | من localStorage عبر `getStoredLogo()` |
| **وسط** | صندوق بحث ديناميكي متطور | ثابت ومرئي دائماً، يفتح Command Palette |
| **يمين** | الصورة الشخصية | من `src/assets/developer/mohamed-sobh.jpg` |

---

## التعديلات المطلوبة

### 1. تحديث `src/pages/HomePage.tsx`

**الاستيرادات الجديدة:**
```typescript
import developerPhoto from "@/assets/developer/mohamed-sobh.jpg";
import { getStoredLogo } from "@/components/CompanyLogoUpload";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
```

**تحديث الهيدر - استبدال الهيدر الحالي بالتصميم الجديد:**

```tsx
{/* Header - New Professional Design */}
<header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
  <div className="container mx-auto px-4 py-3">
    <div className="flex items-center justify-between gap-4">
      
      {/* Left: Company Logo */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {companyLogo ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden border border-border/50 bg-white p-1">
            <img 
              src={companyLogo} 
              alt="Company Logo" 
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <PMSLogo size="lg" />
        )}
        <div className="hidden md:block">
          <h1 className="font-display text-lg font-bold gradient-text">PMS</h1>
          <p className="text-xs text-muted-foreground">
            {isArabic ? "نظام إدارة المشاريع" : "Project Management"}
          </p>
        </div>
      </div>

      {/* Center: Advanced Search Box - Always Visible */}
      <div 
        onClick={() => setSearchOpen(true)}
        className="flex-1 max-w-xl mx-4 cursor-pointer group"
      >
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          <div className="w-full h-10 pl-10 pr-16 rounded-full border border-border/60 bg-background/60 backdrop-blur-sm 
            flex items-center text-sm text-muted-foreground
            hover:border-primary/50 hover:bg-background/80 transition-all duration-200
            shadow-sm hover:shadow-md group-hover:ring-2 group-hover:ring-primary/20">
            {isArabic ? "بحث في البرنامج..." : "Search the application..."}
          </div>
          <div className="absolute right-3 flex items-center gap-1">
            <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border/60 bg-muted/50 px-2 text-xs text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Developer Photo + Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Quick Actions */}
        <div className="hidden sm:flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        
        {/* Developer Photo */}
        <Link to="/about" className="group">
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden border-2 border-primary/30 
            hover:border-primary transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg">
            <img 
              src={developerPhoto} 
              alt="Developer" 
              className="w-full h-full object-cover"
            />
          </div>
        </Link>
        
        {/* User Menu */}
        {user ? <UserMenu /> : (
          <Link to="/auth">
            <Button size="sm">{isArabic ? "دخول" : "Login"}</Button>
          </Link>
        )}
      </div>
    </div>
  </div>
</header>
```

**إضافة State للبحث والشعار:**
```typescript
// داخل مكون HomePage
const { setIsOpen: setSearchOpen } = useGlobalSearch();
const [companyLogo, setCompanyLogo] = useState<string | null>(null);

useEffect(() => {
  // جلب شعار الشركة من localStorage
  const logo = getStoredLogo();
  setCompanyLogo(logo);
}, []);
```

---

## مميزات صندوق البحث الجديد

| الميزة | الوصف |
|--------|-------|
| **مرئي دائماً** | يظهر بشكل ثابت في الهيدر |
| **تصميم متطور** | شكل دائري مع ظل وتأثيرات hover |
| **اختصار لوحة المفاتيح** | يعرض ⌘K للوصول السريع |
| **ديناميكي** | يفتح Command Palette عند النقر |
| **ثنائي اللغة** | نص placeholder بالعربية والإنجليزية |

---

## ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/HomePage.tsx` | تعديل الهيدر ليشمل الشعار والصورة والبحث |

---

## النتيجة المتوقعة

### قبل التعديل:
```text
┌────────────────────────────────────┐
│ [PMS Logo]     [Actions] [UserMenu]│
└────────────────────────────────────┘
```

### بعد التعديل:
```text
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  [شعار الإمتياز]  [🔍 بحث في البرنامج... ⌘K]  [📷 صورتك]  │
│     PMS                                       [Lang][👤]   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## التفاعلات

| العنصر | عند النقر |
|--------|----------|
| **شعار الشركة** | لا شيء (تزييني) |
| **صندوق البحث** | يفتح نافذة البحث الشاملة |
| **الصورة الشخصية** | ينتقل لصفحة "About" |
| **اختصار ⌘K** | يفتح نافذة البحث |

---

## ملاحظات هامة

1. **شعار الشركة**: إذا لم يكن محفوظاً في localStorage، يظهر شعار PMS الافتراضي
2. **Responsive**: التصميم يتكيف مع الشاشات الصغيرة
3. **الصورة الشخصية**: موجودة بالفعل في `src/assets/developer/mohamed-sobh.jpg`
4. **صندوق البحث**: يستخدم نفس hook البحث الشامل `useGlobalSearch`

