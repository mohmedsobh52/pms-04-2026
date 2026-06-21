import { differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";

interface Props {
  endDate?: string | null;
  progress?: number | null;
}

/**
 * Renders a delay badge when end_date is in the past and progress < 100%.
 * Hidden otherwise. Pure presentation — no mock data.
 */
export function DelayBadge({ endDate, progress }: Props) {
  const { isArabic } = useLanguage();
  if (!endDate) return null;
  const end = new Date(endDate);
  if (isNaN(end.getTime())) return null;
  const today = new Date();
  const days = differenceInDays(today, end);
  const done = (progress ?? 0) >= 100;
  if (done || days <= 0) return null;
  return (
    <Badge variant="destructive" className="text-[10px] font-normal">
      {isArabic ? `متأخر ${days} يوم` : `${days}d late`}
    </Badge>
  );
}
