import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, RefreshCw, Wallet, Search, ExternalLink } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { downloadCsv, claimLabel, CLAIM_STATUSES, claimStatusClass } from "@/lib/claims";
import {
  FinanceClaim, loadClaimsFinance, isOpenClaim, isReceived, isOverdue, totals, rowsCsv, fmtMoney,
} from "@/lib/claims-finance";
import { KpiCard } from "@/components/claims/FinanceUI";
import { ClaimsPageHeader } from "@/components/claims/ClaimsNav";

type Bucket = "all" | "obligations" | "received" | "open_accounts";

export default function ClaimsInventoryPage() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [claims, setClaims] = useState<FinanceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<Bucket>("all");

  const load = async () => {
    if (!user) { setClaims([]); setLoading(false); return; }
    setLoading(true);
    try { setClaims(await loadClaimsFinance()); }
    catch (e: any) { toast.error(e?.message ?? "Error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const t = useMemo(() => totals(claims), [claims]);
  const openBalance = useMemo(
    () => claims.filter(isOpenClaim).reduce((s, c) => s + Number(c.claimed_amount || 0), 0),
    [claims],
  );
  const outstanding = useMemo(
    () => claims.reduce((s, c) => {
      if (isOpenClaim(c)) return s;
      const rest = Number(c.approved_amount || 0) - (isReceived(c) ? Number(c.approved_amount || 0) : 0);
      return s + rest;
    }, 0),
    [claims],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter((c) => {
      if (bucket === "obligations" && !isOpenClaim(c)) return false;
      if (bucket === "received" && !isReceived(c)) return false;
      if (bucket === "open_accounts" && !(isOpenClaim(c) && Number(c.claimed_amount || 0) > 0)) return false;
      if (!q) return true;
      return [c.claim_number, c.title, c.counterparty, c.projectName]
        .some((v) => (v ?? "").toString().toLowerCase().includes(q));
    });
  }, [claims, bucket, search]);

  const exportCsv = () => {
    const data = rows.map((c) => ({
      [isArabic ? "رقم المطالبة" : "Claim No"]: c.claim_number,
      [isArabic ? "العنوان" : "Title"]: c.title,
      [isArabic ? "المشروع" : "Project"]: c.projectName,
      [isArabic ? "المقاول" : "Contractor"]: c.counterparty ?? "",
      [isArabic ? "الحالة" : "Status"]: claimLabel(CLAIM_STATUSES, c.status, isArabic),
      [isArabic ? "المطالب به" : "Claimed"]: Number(c.claimed_amount || 0),
      [isArabic ? "المعتمد" : "Approved"]: Number(c.approved_amount || 0),
      [isArabic ? "المُستلم" : "Received"]: isReceived(c) ? Number(c.approved_amount || 0) : 0,
      [isArabic ? "التزام مفتوح" : "Open obligation"]: isOpenClaim(c) ? Number(c.claimed_amount || 0) : 0,
      [isArabic ? "متأخرة" : "Overdue"]: isOverdue(c) ? (isArabic ? "نعم" : "Yes") : (isArabic ? "لا" : "No"),
      [isArabic ? "تاريخ الاستحقاق" : "Due date"]: c.response_due_date ?? "",
      [isArabic ? "العملة" : "Currency"]: c.currency ?? "SAR",
    }));
    downloadCsv(rowsCsv(data), `claims-inventory-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(isArabic ? "تم التصدير" : "Exported");
  };

  return (
    <AppShell>
      <ClaimsPageHeader
        icon={Wallet}
        title={isArabic ? "المخزون المالي للمطالبات" : "Claims Financial Inventory"}
        subtitle={isArabic ? "الالتزامات، المبالغ المُستلمة، والحسابات المفتوحة" : "Obligations, received amounts and open accounts"}
        actions={<>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={exportCsv}><Download className="h-4 w-4 me-1" />CSV</Button>
        </>}
      />
      <div className="mb-4" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <KpiCard label={isArabic ? "إجمالي الالتزامات" : "Total obligations"} value={fmtMoney(t.due)} tone="warning" />
        <KpiCard label={isArabic ? "المبالغ المُستلمة" : "Received"} value={fmtMoney(t.received)} tone="success" />
        <KpiCard label={isArabic ? "الحسابات المفتوحة" : "Open accounts"} value={fmtMoney(openBalance)} hint={`${t.openCount}`} tone="primary" />
        <KpiCard label={isArabic ? "معتمد غير مُستلم" : "Approved not received"} value={fmtMoney(outstanding)} />
        <KpiCard label={isArabic ? "متأخرة" : "Overdue"} value={fmtMoney(t.overdue)} tone="destructive" hint={`${t.overdueCount}`} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">
            {isArabic ? "سجل الحسابات" : "Accounts ledger"} ({rows.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="ps-8 w-56" placeholder={isArabic ? "بحث..." : "Search..."}
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={bucket} onValueChange={(v) => setBucket(v as Bucket)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "الكل" : "All"}</SelectItem>
                <SelectItem value="obligations">{isArabic ? "التزامات" : "Obligations"}</SelectItem>
                <SelectItem value="received">{isArabic ? "مُستلمة" : "Received"}</SelectItem>
                <SelectItem value="open_accounts">{isArabic ? "حسابات مفتوحة" : "Open accounts"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "المطالبة" : "Claim"}</TableHead>
                  <TableHead>{isArabic ? "المشروع" : "Project"}</TableHead>
                  <TableHead>{isArabic ? "المقاول" : "Contractor"}</TableHead>
                  <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isArabic ? "المطالب به" : "Claimed"}</TableHead>
                  <TableHead>{isArabic ? "المُستلم" : "Received"}</TableHead>
                  <TableHead>{isArabic ? "التزام مفتوح" : "Open"}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id} className={isOverdue(c) ? "bg-destructive/5" : undefined}>
                    <TableCell className="font-medium">
                      <div>{c.claim_number}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">{c.title}</div>
                    </TableCell>
                    <TableCell>{c.projectName}</TableCell>
                    <TableCell>{c.counterparty ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={claimStatusClass(c.status)}>
                        {claimLabel(CLAIM_STATUSES, c.status, isArabic)}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{fmtMoney(Number(c.claimed_amount || 0), c.currency || "SAR")}</TableCell>
                    <TableCell className="tabular-nums text-success">
                      {fmtMoney(isReceived(c) ? Number(c.approved_amount || 0) : 0, c.currency || "SAR")}
                    </TableCell>
                    <TableCell className="tabular-nums text-warning">
                      {fmtMoney(isOpenClaim(c) ? Number(c.claimed_amount || 0) : 0, c.currency || "SAR")}
                    </TableCell>
                    <TableCell>
                      <Button asChild size="icon" variant="ghost">
                        <Link to={`/claims/${c.id}`}><ExternalLink className="h-4 w-4" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {isArabic ? "لا توجد بيانات" : "No data"}
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
