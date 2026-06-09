import { differenceInDays, parseISO, isValid } from "date-fns";

export type AlertLevel = "ok" | "info" | "warning" | "critical" | "expired";

export interface ContractAlert {
  level: AlertLevel;
  daysLeft: number | null;
  label: string;
  labelEn: string;
}

export function computeContractExpiryAlert(endDate?: string | null, isArabic = false): ContractAlert {
  if (!endDate) {
    return { level: "ok", daysLeft: null, label: "بدون تاريخ انتهاء", labelEn: "No end date" };
  }
  const d = parseISO(endDate);
  if (!isValid(d)) return { level: "ok", daysLeft: null, label: "تاريخ غير صالح", labelEn: "Invalid date" };

  const days = differenceInDays(d, new Date());

  if (days < 0) {
    return {
      level: "expired",
      daysLeft: days,
      label: `منتهي منذ ${Math.abs(days)} يوم`,
      labelEn: `Expired ${Math.abs(days)} days ago`,
    };
  }
  if (days <= 30) {
    return {
      level: "critical",
      daysLeft: days,
      label: `ينتهي خلال ${days} يوم`,
      labelEn: `Expires in ${days} days`,
    };
  }
  if (days <= 60) {
    return {
      level: "warning",
      daysLeft: days,
      label: `ينتهي خلال ${days} يوم`,
      labelEn: `Expires in ${days} days`,
    };
  }
  if (days <= 90) {
    return {
      level: "info",
      daysLeft: days,
      label: `ينتهي خلال ${days} يوم`,
      labelEn: `Expires in ${days} days`,
    };
  }
  return { level: "ok", daysLeft: days, label: `${days} يوم متبقي`, labelEn: `${days} days remaining` };
}

export function levelBadgeVariant(level: AlertLevel): "default" | "secondary" | "destructive" | "outline" {
  switch (level) {
    case "critical":
    case "expired":
      return "destructive";
    case "warning":
      return "default";
    case "info":
      return "secondary";
    default:
      return "outline";
  }
}

/**
 * Aggregate spending vs contract value from the contract's progress certificates.
 * Returns the total net paid and the percentage of the contract value spent.
 */
export interface ContractFinancials {
  totalNet: number;
  contractValue: number;
  spentPct: number;
  overrun: boolean;
  certificatesCount: number;
}

export function computeContractFinancials(
  contractValue: number,
  certificates: { net_amount?: number | null; current_work_done?: number | null }[]
): ContractFinancials {
  const totalNet = certificates.reduce((s, c) => s + (Number(c.net_amount) || 0), 0);
  const spentPct = contractValue > 0 ? (totalNet / contractValue) * 100 : 0;
  return {
    totalNet,
    contractValue,
    spentPct: Math.round(spentPct * 100) / 100,
    overrun: spentPct > 100,
    certificatesCount: certificates.length,
  };
}
