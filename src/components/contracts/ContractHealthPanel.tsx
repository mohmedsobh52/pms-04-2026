import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ContractFinancialBar } from "./ContractFinancialBar";
import { computeContractExpiryAlert, levelBadgeVariant } from "@/lib/contract-alerts";
import { Activity, Calendar } from "lucide-react";

interface ContractLite {
  id: string;
  contract_title: string;
  contract_value: number | null;
  end_date: string | null;
  status?: string | null;
}

interface Props {
  contracts: ContractLite[];
  isArabic: boolean;
}

/**
 * Top-of-dashboard health panel: per-contract spending bar + expiry alert.
 * Wires together computeContractExpiryAlert + ContractFinancialBar.
 */
export function ContractHealthPanel({ contracts, isArabic }: Props) {
  // Prioritize active contracts with a value; sort by soonest end date.
  const ranked = [...contracts]
    .filter((c) => (c.contract_value || 0) > 0)
    .sort((a, b) => {
      const ad = a.end_date ? new Date(a.end_date).getTime() : Infinity;
      const bd = b.end_date ? new Date(b.end_date).getTime() : Infinity;
      return ad - bd;
    })
    .slice(0, 8);

  if (ranked.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          {isArabic ? "الحالة المالية والانتهاء" : "Financial Health & Expiry"}
          <Badge variant="outline" className="ms-auto text-[10px]">
            {isArabic ? `${ranked.length} عقد` : `${ranked.length} contracts`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-[340px] pe-2">
          <div className="space-y-3">
            {ranked.map((c) => {
              const alert = computeContractExpiryAlert(c.end_date, isArabic);
              return (
                <div
                  key={c.id}
                  className="rounded-lg border border-border/40 bg-card/50 p-3 hover:bg-card transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium truncate flex-1" title={c.contract_title}>
                      {c.contract_title}
                    </p>
                    {alert.daysLeft !== null && (
                      <Badge variant={levelBadgeVariant(alert.level)} className="text-[10px] gap-1 shrink-0">
                        <Calendar className="w-3 h-3" />
                        {isArabic ? alert.label : alert.labelEn}
                      </Badge>
                    )}
                  </div>
                  <ContractFinancialBar
                    contractId={c.id}
                    contractValue={Number(c.contract_value) || 0}
                    isArabic={isArabic}
                  />
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
