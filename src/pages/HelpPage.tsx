import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LifeBuoy, Search, Keyboard, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { getRlsErrorLog, clearRlsErrorLog } from "@/lib/rls-error-log";

const SHORTCUTS: { keys: string; ar: string }[] = [
  { keys: "Ctrl + K", ar: "البحث الشامل" },
  { keys: "Ctrl + /", ar: "مركز الاقتراحات" },
  { keys: "Ctrl + S", ar: "حفظ المشروع الحالي" },
  { keys: "Esc", ar: "إغلاق النوافذ المنبثقة" },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "كيف أبدأ مشروعاً جديداً؟",
    a: "من «المشاريع» → «مشروع جديد»، ارفع ملف جدول الكميات (Excel/PDF) ثم اعتمد تخطيط الأعمدة ليتم التحليل تلقائياً.",
  },
  {
    q: "لماذا لا تظهر بيانات بعض الشاشات؟",
    a: "معظم الشاشات مرتبطة بمشروع محدد. اختر المشروع من مبدّل المشاريع أعلى الشاشة، وتأكد من تسجيل الدخول.",
  },
  {
    q: "كيف أصدّر التقارير؟",
    a: "كل شاشة تحليلية توفّر أزرار تصدير CSV أو PDF أعلى الجدول. تقارير التحكم بالتكاليف متاحة من «تقرير التحكم بالتكاليف».",
  },
  {
    q: "ظهرت رسالة «ليس لديك صلاحية»، ماذا أفعل؟",
    a: "الصلاحيات تُدار بالأدوار. اطلب من مدير النظام إسناد الدور المناسب لك من شاشة «الفريق».",
  },
  {
    q: "كيف أستعيد نسخة سابقة من المشروع؟",
    a: "من «مقارنة الإصدارات» يمكنك استعراض الإصدارات المحفوظة ومقارنتها قبل الاستعادة.",
  },
];

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [logVersion, setLogVersion] = useState(0);

  const errors = useMemo(() => {
    void logVersion;
    return getRlsErrorLog().slice(-10).reverse();
  }, [logVersion]);

  const filtered = FAQ.filter(
    (f) => !query.trim() || f.q.includes(query.trim()) || f.a.includes(query.trim())
  );

  const copyErrors = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(errors, null, 2));
      toast.success("تم نسخ سجل الأخطاء");
    } catch {
      toast.error("تعذّر النسخ إلى الحافظة");
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-primary" />
            المساعدة والدعم
          </h1>
          <p className="text-sm text-muted-foreground">أسئلة شائعة، اختصارات لوحة المفاتيح، وسجل الأخطاء</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الأسئلة الشائعة</CardTitle>
            <CardDescription>ابحث عن إجابة سريعة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث في المساعدة…"
                className="ps-9"
              />
            </div>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد نتائج مطابقة.</p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {filtered.map((f, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-start">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" />
              اختصارات لوحة المفاتيح
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm">{s.ar}</span>
                <Badge variant="secondary" className="font-mono">{s.keys}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">سجل الأخطاء المحلي</CardTitle>
            <CardDescription>آخر 10 أخطاء مسجّلة على هذا الجهاز — أرفق الرقم المرجعي عند طلب الدعم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {errors.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد أخطاء مسجّلة. 🎉</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {errors.map((e) => (
                    <li key={e.ref} className="rounded-md border p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="font-mono">{e.ref}</Badge>
                        <span className="text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="font-mono break-all text-destructive">{e.message}</p>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyErrors} className="gap-1">
                    <Copy className="w-3.5 h-3.5" /> نسخ السجل
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      clearRlsErrorLog();
                      setLogVersion((v) => v + 1);
                      toast.success("تم مسح السجل");
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> مسح السجل
                  </Button>
                </div>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              للمزيد راجع <Link to="/changelog" className="text-primary underline">سجل التغييرات</Link> أو{" "}
              <Link to="/about" className="text-primary underline">صفحة عن البرنامج</Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
