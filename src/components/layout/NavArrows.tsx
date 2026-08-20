import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Back / Forward navigation buttons for the app topbar.
 * Uses the router history index to know whether a back/forward entry exists.
 */
export function NavArrows() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isArabic } = useLanguage();
  const [idx, setIdx] = useState(0);
  const [maxIdx, setMaxIdx] = useState(0);

  useEffect(() => {
    const current = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    setIdx(current);
    setMaxIdx((prev) => Math.max(prev, current));
  }, [location.key]);

  const canBack = idx > 0;
  const canForward = idx < maxIdx;

  // In RTL, "back" points to the right.
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;
  const ForwardIcon = isArabic ? ArrowLeft : ArrowRight;

  const label = (ar: string, en: string) => (isArabic ? ar : en);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              disabled={!canBack}
              onClick={() => navigate(-1)}
              aria-label={label("الصفحة السابقة", "Back")}
            >
              <BackIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label("الصفحة السابقة", "Back")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              disabled={!canForward}
              onClick={() => navigate(1)}
              aria-label={label("الصفحة التالية", "Forward")}
            >
              <ForwardIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label("الصفحة التالية", "Forward")}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export default NavArrows;
