

# خطة العلاج الجذري لمشكلة صندوق البحث

## تشخيص المشكلة الجذرية

### المشكلة الحقيقية

المشكلة **ليست** في CSS أو z-index أو pointer-events. المشكلة **معمارية** في طريقة إدارة حالة البحث.

### تحليل الكود الحالي

```tsx
// في useGlobalSearch.tsx (سطر 332-333)
export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);  // ← useState محلي لكل hook instance
  ...
}
```

```tsx
// في App.tsx (سطر 77) - GlobalSearch يستخدم hook
<GlobalSearch />  // ← لديه isOpen = A

// في HomePage.tsx (سطر 101) - hook آخر
const { setIsOpen: setSearchOpen } = useGlobalSearch();  // ← لديه isOpen = B

// في UnifiedHeader.tsx (سطر 85) - hook ثالث
const { setIsOpen: setSearchOpen } = useGlobalSearch();  // ← لديه isOpen = C
```

**النتيجة**: عند النقر على صندوق البحث في HomePage:
- `setSearchOpen(true)` يغير **B** إلى `true`
- لكن GlobalSearch يعتمد على **A** الذي لا يزال `false`
- **Dialog لا يفتح!**

---

## الحل الجذري: React Context

### الخطوات التنفيذية

### 1. إنشاء GlobalSearchProvider

إنشاء ملف جديد: `src/contexts/GlobalSearchContext.tsx`

```tsx
import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Types
export type SearchItemType = 'page' | 'project' | 'action' | 'setting' | 'file';

export interface SearchItem {
  id: string;
  type: SearchItemType;
  label: string;
  labelAr: string;
  description?: string;
  descriptionAr?: string;
  icon: string;
  href?: string;
  action?: () => void;
  keywords: string[];
}

export interface SearchResults {
  pages: SearchItem[];
  projects: SearchItem[];
  actions: SearchItem[];
  settings: SearchItem[];
}

interface GlobalSearchContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  results: SearchResults;
  isLoading: boolean;
  navigateToItem: (item: SearchItem) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextType | null>(null);

// Static pages, actions, and settings data (moved here)
// ... (نفس البيانات الثابتة من useGlobalSearch.tsx)

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // نفس المنطق من useGlobalSearch.tsx لكن في Context
  // ...

  // Keyboard shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const value = useMemo(() => ({
    isOpen,
    setIsOpen,
    query,
    setQuery,
    results,
    isLoading,
    navigateToItem,
  }), [isOpen, query, results, isLoading, navigateToItem]);

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
    </GlobalSearchContext.Provider>
  );
}

// Custom hook للوصول للـ Context
export function useGlobalSearch() {
  const context = useContext(GlobalSearchContext);
  if (!context) {
    throw new Error('useGlobalSearch must be used within GlobalSearchProvider');
  }
  return context;
}
```

---

### 2. تحديث App.tsx

```tsx
import { GlobalSearchProvider } from '@/contexts/GlobalSearchContext';

const App = () => (
  <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AnalysisProvider>
          <AnalysisTrackingProvider>
            <TooltipProvider>
              <BrowserRouter>
                <GlobalSearchProvider>  {/* ← إضافة Provider هنا */}
                  <BackgroundImage />
                  <Toaster />
                  <Sonner />
                  <GlobalSearch />
                  <UpdateBanner />
                  <FloatingBackButton />
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        {/* ... routes ... */}
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                </GlobalSearchProvider>
              </BrowserRouter>
            </TooltipProvider>
          </AnalysisTrackingProvider>
        </AnalysisProvider>
      </AuthProvider>
    </QueryClientProvider>
  </LanguageProvider>
);
```

---

### 3. تحديث GlobalSearch.tsx

```tsx
import { useGlobalSearch } from '@/contexts/GlobalSearchContext';  // ← تغيير المسار

export function GlobalSearch() {
  const { isOpen, setIsOpen, query, setQuery, results, isLoading, navigateToItem } =
    useGlobalSearch();
  // ... باقي الكود كما هو
}
```

---

### 4. تحديث HomePage.tsx

```tsx
import { useGlobalSearch } from '@/contexts/GlobalSearchContext';  // ← تغيير المسار

// في المكون
const { setIsOpen: setSearchOpen } = useGlobalSearch();
```

---

### 5. تحديث UnifiedHeader.tsx

```tsx
import { useGlobalSearch } from '@/contexts/GlobalSearchContext';  // ← تغيير المسار

// في المكون
const { setIsOpen: setSearchOpen } = useGlobalSearch();
```

---

### 6. حذف أو تعديل useGlobalSearch.tsx القديم

يمكن إما:
- **حذف** الملف `src/hooks/useGlobalSearch.tsx` بالكامل
- أو **تعديله** ليقوم بـ re-export من Context:

```tsx
// src/hooks/useGlobalSearch.tsx
export { useGlobalSearch, type SearchItem, type SearchResults } from '@/contexts/GlobalSearchContext';
```

---

## هيكل الملفات النهائي

| الملف | التغيير |
|-------|---------|
| `src/contexts/GlobalSearchContext.tsx` | **ملف جديد** - Context Provider |
| `src/App.tsx` | إضافة `GlobalSearchProvider` |
| `src/components/GlobalSearch.tsx` | تغيير import path |
| `src/pages/HomePage.tsx` | تغيير import path |
| `src/components/UnifiedHeader.tsx` | تغيير import path |
| `src/hooks/useGlobalSearch.tsx` | تحويل إلى re-export فقط |

---

## مخطط تدفق البيانات بعد الإصلاح

```
GlobalSearchProvider (في App.tsx)
    ↓
    isOpen = shared state
    ↓
    ├── GlobalSearch (Dialog)
    │   └── يقرأ isOpen → يفتح/يغلق Dialog
    │
    ├── HomePage
    │   └── يستدعي setIsOpen(true) → يغير shared state
    │
    └── UnifiedHeader
        └── يستدعي setIsOpen(true) → يغير shared state
```

**النتيجة**: أي مكان يستدعي `setIsOpen(true)` سيؤثر على **نفس** الـ state الذي يقرأه `GlobalSearch`.

---

## لماذا هذا الحل جذري؟

| الجانب | قبل | بعد |
|--------|-----|-----|
| State Management | useState محلي (3 نسخ منفصلة) | Context مشترك (نسخة واحدة) |
| تزامن State | ❌ لا يوجد | ✅ تلقائي |
| صندوق البحث في HomePage | ❌ لا يعمل | ✅ يعمل |
| صندوق البحث في UnifiedHeader | ❌ قد لا يعمل | ✅ يعمل |
| اختصار ⌘K | ✅ يعمل (لأنه في GlobalSearch) | ✅ يعمل |
| Performance | ⚠️ 3 hooks منفصلة | ✅ Context واحد محسّن |

---

## ملاحظات تقنية

### لماذا Context بدلاً من Zustand أو Redux؟

1. **بسيط**: لا حاجة لمكتبات إضافية
2. **كافي**: State بسيط (boolean + string) لا يحتاج state manager معقد
3. **متوافق**: يعمل مع React Router الموجود

### لماذا GlobalSearchProvider داخل BrowserRouter؟

لأن `navigateToItem` يستخدم `useNavigate()` من React Router، والذي يحتاج أن يكون **داخل** BrowserRouter.

### هل سيؤثر على الأداء؟

لا، لأن:
- Context محسّن باستخدام `useMemo` للقيمة
- Re-render يحدث فقط عند تغير `isOpen` أو `query`
- البحث لا يحدث كثيراً (فقط عند فتح Dialog)

---

## الاختبارات المطلوبة بعد التنفيذ

1. ✅ **Desktop**: النقر على صندوق البحث في HomePage
2. ✅ **Mobile**: النقر على زر البحث
3. ✅ **Keyboard**: الضغط على ⌘K أو Ctrl+K من أي صفحة
4. ✅ **UnifiedHeader**: النقر على زر البحث في أي صفحة أخرى
5. ✅ **Navigation**: البحث ثم الانتقال لصفحة أخرى
6. ✅ **Close**: إغلاق Dialog بـ ESC أو النقر خارجه

---

## الخلاصة

**المشكلة الجذرية**: `useGlobalSearch` hook يستخدم `useState` محلي، مما يعني أن كل مكان يستدعي الـ hook لديه نسخة **منفصلة** من `isOpen` state.

**الحل الجذري**: استخدام React Context لمشاركة الـ state بين جميع المكونات التي تحتاجه.

هذا الحل **سيحل المشكلة نهائياً 100%** لأنه يعالج السبب الجذري وليس الأعراض.

