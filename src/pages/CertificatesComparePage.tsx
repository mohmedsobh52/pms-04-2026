import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { AppShell as PageLayout } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, GitCompare } from "lucide-react";
import { Link } from "react-router-dom";
import { useGlobalSuggestions } from "@/contexts/GlobalSuggestionsContext";
import { buildCertificatesCompareSuggestions } from "@/lib/suggestion-generators";

interface Cert {
  id: string;
  certificate_number: number;
  contractor_name: string;
  project_id: string | null;
  period_from: string | null;
  period_to: string | null;
  current_work_done: number;
  total_work_done: number;
  retention_amount: number;
  net_amount: number;
  status: string;
}

const CertificatesComparePage = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [projectId, setProjectId] = useState<string>("all");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [c, p] = await Promise.all([
        supabase.from("progress_certificates").select("*").order("certificate_number", { ascending: true }),
        supabase.from("project_data").select("id, name"),
      ]);
      setCerts((c.data || []) as Cert[]);
      setProjects(p.data || []);
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(
    () => certs.filter(c => projectId === "all" || c.project_id === projectId),
    [certs, projectId]
  );

  const compared = filtered.filter(c => selected.includes(c.id));

  const fmt = (n: number) =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  const toggle = (id: string) =>
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : s.length >= 4 ? s : [...s, id]));

  return (
    <PageLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6" dir={isArabic ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GitCompare className="h-6 w-6 text-primary" />
              {isArabic ? "مقارنة المستخلصات" : "Compare Certificates"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isArabic ? "اختر حتى 4 مستخلصات للمقارنة جنباً إلى جنب" : "Select up to 4 certificates for side-by-side comparison"}
            </p>
          </div>
          <Link to="/progress-certificates">
            <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 me-1" />{isArabic ? "رجوع" : "Back"}</Button>
          </Link>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل المشاريع" : "All projects"}</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground self-center">
            {isArabic ? `محدد: ${selected.length}/4` : `Selected: ${selected.length}/4`}
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{isArabic ? "اختر المستخلصات" : "Pick certificates"}</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-6 text-muted-foreground">{isArabic ? "جار التحميل..." : "Loading..."}</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground">{isArabic ? "لا توجد مستخلصات" : "No certificates"}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>#</TableHead>
                    <TableHead>{isArabic ? "المقاول" : "Contractor"}</TableHead>
                    <TableHead>{isArabic ? "الفترة" : "Period"}</TableHead>
                    <TableHead>{isArabic ? "صافي" : "Net"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => toggle(c.id)}>
                      <TableCell><Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} /></TableCell>
                      <TableCell className="font-medium">{c.certificate_number}</TableCell>
                      <TableCell>{c.contractor_name}</TableCell>
                      <TableCell className="text-xs">{c.period_from} → {c.period_to}</TableCell>
                      <TableCell className="font-bold">{fmt(c.net_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {compared.length >= 2 && (
          <Card>
            <CardHeader><CardTitle className="text-base">{isArabic ? "مقارنة جنباً إلى جنب" : "Side-by-side comparison"}</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-start p-2 border">{isArabic ? "المؤشر" : "Metric"}</th>
                    {compared.map(c => <th key={c.id} className="p-2 border text-center">#{c.certificate_number}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: isArabic ? "المقاول" : "Contractor", get: (c: Cert) => c.contractor_name },
                    { label: isArabic ? "من" : "From", get: (c: Cert) => c.period_from || "-" },
                    { label: isArabic ? "إلى" : "To", get: (c: Cert) => c.period_to || "-" },
                    { label: isArabic ? "أعمال حالية" : "Current work", get: (c: Cert) => fmt(c.current_work_done) },
                    { label: isArabic ? "إجمالي تراكمي" : "Cumulative", get: (c: Cert) => fmt(c.total_work_done) },
                    { label: isArabic ? "احتجاز" : "Retention", get: (c: Cert) => fmt(c.retention_amount) },
                    { label: isArabic ? "صافي مستحق" : "Net", get: (c: Cert) => fmt(c.net_amount) },
                    { label: isArabic ? "الحالة" : "Status", get: (c: Cert) => c.status },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="p-2 border font-medium">{row.label}</td>
                      {compared.map(c => <td key={c.id} className="p-2 border text-center">{row.get(c)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
};

export default CertificatesComparePage;
