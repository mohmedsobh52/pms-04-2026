import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FinanceBucket, fmtMoney } from "@/lib/claims-finance";

export function KpiCard({
  label, value, hint, tone = "default", icon: Icon,
}: {
  label: string; value: string; hint?: string;
  tone?: "default" | "success" | "warning" | "destructive" | "primary";
  icon?: any;
}) {
  const toneClass =
    tone === "success" ? "text-success"
    : tone === "warning" ? "text-warning"
    : tone === "destructive" ? "text-destructive"
    : tone === "primary" ? "text-primary"
    : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          {Icon && <Icon className={`h-4 w-4 ${toneClass}`} />}
        </div>
        <div className={`mt-1 text-xl font-bold tabular-nums ${toneClass}`}>{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export function BucketsTable({
  buckets, firstHeader, isArabic, currency = "SAR",
}: {
  buckets: FinanceBucket[]; firstHeader: string; isArabic: boolean; currency?: string;
}) {
  if (!buckets.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {isArabic ? "لا توجد بيانات" : "No data"}
      </p>
    );
  }
  const h = isArabic
    ? ["عدد", "المطالب به", "المعتمد", "المُستلم", "المستحق", "المتأخر", "نسبة التحصيل"]
    : ["Count", "Claimed", "Approved", "Received", "Due", "Overdue", "Collection"];
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{firstHeader}</TableHead>
            {h.map((x) => <TableHead key={x} className="text-start">{x}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {buckets.map((b) => (
            <TableRow key={b.key}>
              <TableCell className="font-medium">{b.label}</TableCell>
              <TableCell className="tabular-nums">{b.count}</TableCell>
              <TableCell className="tabular-nums">{fmtMoney(b.claimed, currency)}</TableCell>
              <TableCell className="tabular-nums">{fmtMoney(b.approved, currency)}</TableCell>
              <TableCell className="tabular-nums text-success">{fmtMoney(b.received, currency)}</TableCell>
              <TableCell className="tabular-nums text-warning">{fmtMoney(b.due, currency)}</TableCell>
              <TableCell className="tabular-nums text-destructive">
                {fmtMoney(b.overdue, currency)}
                {b.overdueCount > 0 && <span className="text-[11px]"> ({b.overdueCount})</span>}
              </TableCell>
              <TableCell className="tabular-nums">{b.collectionRate.toFixed(1)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
