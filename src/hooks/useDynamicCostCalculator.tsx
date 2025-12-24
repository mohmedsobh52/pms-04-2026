import { useState, useCallback, useMemo } from 'react';

export interface CostInputs {
  // Labor Costs
  generalLabor: number;
  equipmentOperator: number;
  
  // Indirect Costs
  overhead: number;
  admin: number;
  insurance: number;
  contingency: number;
  
  // Profit
  profitMargin: number; // Percentage
  
  // Materials & Equipment (optional)
  materials: number;
  equipment: number;
  subcontractor: number;
}

export interface CalculatedCosts {
  totalLabor: number;
  totalIndirect: number;
  totalDirect: number;
  profitAmount: number;
  calculatedUnitPrice: number;
}

export interface ItemCostData extends CostInputs {
  itemId: string;
  quantity: number;
}

const defaultCostInputs: CostInputs = {
  generalLabor: 0,
  equipmentOperator: 0,
  overhead: 0,
  admin: 0,
  insurance: 0,
  contingency: 0,
  profitMargin: 10,
  materials: 0,
  equipment: 0,
  subcontractor: 0,
};

export function useDynamicCostCalculator() {
  const [itemCosts, setItemCosts] = useState<Record<string, ItemCostData>>({});

  const calculateItemCosts = useCallback((inputs: CostInputs): CalculatedCosts => {
    // Total Labor = General Labor + Equipment Operator
    const totalLabor = (inputs.generalLabor || 0) + (inputs.equipmentOperator || 0);
    
    // Total Indirect = Overhead + Admin + Insurance + Contingency
    const totalIndirect = (inputs.overhead || 0) + (inputs.admin || 0) + 
                          (inputs.insurance || 0) + (inputs.contingency || 0);
    
    // Total Direct = Materials + Equipment + Labor + Subcontractor
    const totalDirect = (inputs.materials || 0) + (inputs.equipment || 0) + 
                        totalLabor + (inputs.subcontractor || 0);
    
    // Base cost before profit
    const baseCost = totalDirect + totalIndirect;
    
    // Profit Amount = Base Cost * (Profit Margin / 100)
    const profitAmount = baseCost * ((inputs.profitMargin || 0) / 100);
    
    // Calculated Unit Price = Base Cost + Profit
    const calculatedUnitPrice = baseCost + profitAmount;
    
    return {
      totalLabor,
      totalIndirect,
      totalDirect,
      profitAmount,
      calculatedUnitPrice,
    };
  }, []);

  const updateItemCost = useCallback((itemId: string, field: keyof CostInputs, value: number, quantity: number = 1) => {
    setItemCosts(prev => {
      const current = prev[itemId] || { ...defaultCostInputs, itemId, quantity };
      return {
        ...prev,
        [itemId]: {
          ...current,
          [field]: value,
          quantity,
        },
      };
    });
  }, []);

  const setItemCostData = useCallback((itemId: string, data: Partial<ItemCostData>, quantity: number = 1) => {
    setItemCosts(prev => {
      const current = prev[itemId] || { ...defaultCostInputs, itemId, quantity };
      return {
        ...prev,
        [itemId]: {
          ...current,
          ...data,
          itemId,
          quantity,
        },
      };
    });
  }, []);

  const getItemCostData = useCallback((itemId: string): ItemCostData => {
    return itemCosts[itemId] || { ...defaultCostInputs, itemId, quantity: 1 };
  }, [itemCosts]);

  const getItemCalculatedCosts = useCallback((itemId: string): CalculatedCosts => {
    const data = getItemCostData(itemId);
    return calculateItemCosts(data);
  }, [getItemCostData, calculateItemCosts]);

  const getAllCalculatedCosts = useMemo(() => {
    const result: Record<string, CalculatedCosts> = {};
    Object.keys(itemCosts).forEach(itemId => {
      result[itemId] = calculateItemCosts(itemCosts[itemId]);
    });
    return result;
  }, [itemCosts, calculateItemCosts]);

  const getTotalProjectCost = useMemo(() => {
    return Object.values(getAllCalculatedCosts).reduce((sum, costs) => {
      return sum + costs.calculatedUnitPrice;
    }, 0);
  }, [getAllCalculatedCosts]);

  const exportCostData = useCallback(() => {
    const exportData: Array<{
      itemId: string;
      inputs: CostInputs;
      calculated: CalculatedCosts;
    }> = [];

    Object.entries(itemCosts).forEach(([itemId, data]) => {
      exportData.push({
        itemId,
        inputs: data,
        calculated: calculateItemCosts(data),
      });
    });

    return exportData;
  }, [itemCosts, calculateItemCosts]);

  const copyCostsFromItem = useCallback((sourceItemId: string, targetItemId: string, targetQuantity: number = 1) => {
    const sourceData = itemCosts[sourceItemId];
    if (!sourceData) return false;
    
    setItemCosts(prev => ({
      ...prev,
      [targetItemId]: {
        ...sourceData,
        itemId: targetItemId,
        quantity: targetQuantity,
      },
    }));
    return true;
  }, [itemCosts]);

  const getItemsWithCosts = useCallback(() => {
    return Object.entries(itemCosts)
      .filter(([_, data]) => {
        const calculated = calculateItemCosts(data);
        return calculated.calculatedUnitPrice > 0;
      })
      .map(([itemId, data]) => ({
        itemId,
        data,
        calculated: calculateItemCosts(data),
      }));
  }, [itemCosts, calculateItemCosts]);

  return {
    itemCosts,
    updateItemCost,
    setItemCostData,
    getItemCostData,
    getItemCalculatedCosts,
    getAllCalculatedCosts,
    getTotalProjectCost,
    calculateItemCosts,
    exportCostData,
    copyCostsFromItem,
    getItemsWithCosts,
    defaultCostInputs,
  };
}

export { defaultCostInputs };
