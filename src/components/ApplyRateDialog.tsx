import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
}

interface ApplyRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: BOQItem | null;
  suggestedRate: number;
  onConfirm: () => void;
}

export function ApplyRateDialog({
  open,
  onOpenChange,
  item,
  suggestedRate,
  onConfirm,
}: ApplyRateDialogProps) {
  if (!item) return null;

  const currentRate = item.unit_price || 0;
  const difference = suggestedRate - currentRate;
  const percentChange = currentRate > 0 ? ((difference / currentRate) * 100) : 0;
  
  const currentTotal = item.total_price || (item.quantity * currentRate);
  const newTotal = item.quantity * suggestedRate;
  const totalDifference = newTotal - currentTotal;

  const getTrendIcon = () => {
    if (percentChange > 5) return <TrendingUp className="w-4 h-4 text-destructive" />;
    if (percentChange < -5) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            Apply Market Rate
            {getTrendIcon()}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 mt-4">
              {/* Item Info */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground text-sm">
                  {item.item_number}: {item.description.slice(0, 100)}
                  {item.description.length > 100 ? "..." : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Quantity: {item.quantity} {item.unit}
                </p>
              </div>

              {/* Rate Comparison */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Current Rate</p>
                  <p className="font-semibold text-foreground">{formatCurrency(currentRate)}</p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-primary" />
                </div>
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Suggested Rate</p>
                  <p className="font-semibold text-primary">{formatCurrency(suggestedRate)}</p>
                </div>
              </div>

              {/* Change Badge */}
              <div className="flex justify-center">
                <Badge
                  variant={percentChange > 0 ? "destructive" : percentChange < 0 ? "default" : "secondary"}
                  className="text-sm"
                >
                  {percentChange > 0 ? "+" : ""}{percentChange.toFixed(1)}% change
                </Badge>
              </div>

              {/* Total Impact */}
              <div className="p-3 bg-card border rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Impact on Total</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Current Total:</span>
                  <span className="font-medium">{formatCurrency(currentTotal)} SAR</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm">New Total:</span>
                  <span className="font-medium text-primary">{formatCurrency(newTotal)} SAR</span>
                </div>
                <div className="border-t mt-2 pt-2 flex justify-between items-center">
                  <span className="text-sm font-medium">Difference:</span>
                  <span className={`font-bold ${totalDifference > 0 ? 'text-destructive' : 'text-green-500'}`}>
                    {totalDifference > 0 ? "+" : ""}{formatCurrency(totalDifference)} SAR
                  </span>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Apply Rate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
