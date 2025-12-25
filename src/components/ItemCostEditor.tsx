import { useState } from "react";
import { Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CostInputs, CalculatedCosts, CostTemplate } from "@/hooks/useDynamicCostCalculator";
import { ExcavationCostAnalysis } from "./ExcavationCostAnalysis";

interface AvailableItem {
  itemId: string;
  description: string;
  calculatedUnitPrice: number;
}

interface ItemCostEditorProps {
  itemId: string;
  itemDescription: string;
  quantity: number;
  currentCosts: CostInputs;
  calculatedCosts: CalculatedCosts & { aiSuggestedRate?: number };
  onSave: (itemId: string, costs: CostInputs) => void;
  onCopyFrom?: (sourceItemId: string) => CostInputs | null;
  onSaveAsTemplate?: (costs: CostInputs, name: string) => void;
  onApplyTemplate?: (templateId?: string) => CostInputs | null;
  onDeleteTemplate?: (templateId: string) => boolean;
  savedTemplate?: CostTemplate | null;
  savedTemplates?: CostTemplate[];
  availableItems?: AvailableItem[];
  currency?: string;
}

export function ItemCostEditor({
  itemId,
  itemDescription,
  quantity,
  currentCosts,
  calculatedCosts,
  onSave,
  currency = "SAR",
}: ItemCostEditorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSaveAnalysis = (totalCost: number, breakdown: any[]) => {
    // Convert excavation analysis to CostInputs format
    const updatedCosts: CostInputs = {
      ...currentCosts,
      materials: totalCost,
      generalLabor: 0,
      equipmentOperator: 0,
      equipment: 0,
      subcontractor: 0,
      overhead: 0,
      admin: 0,
      insurance: 0,
      contingency: 0,
      profitMargin: 0,
    };
    
    onSave(itemId, updatedCosts);
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        className="gap-1 h-7 px-2"
        onClick={() => setIsOpen(true)}
      >
        <Edit2 className="w-3 h-3" />
        <span className="text-xs">Edit</span>
      </Button>

      <ExcavationCostAnalysis
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        itemDescription={itemDescription}
        onSave={handleSaveAnalysis}
        currency={currency === "SAR" ? "ريال" : currency}
      />
    </>
  );
}