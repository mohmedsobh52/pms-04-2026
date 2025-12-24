import { useState, useCallback, useMemo, useEffect } from 'react';

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
  aiSuggestedRate?: number; // New: AI suggested rate
}

export interface CostTemplate {
  id: string;
  name: string;
  costs: CostInputs;
  createdAt: string;
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

const TEMPLATES_STORAGE_KEY = 'boq_cost_templates';
const ITEM_COSTS_STORAGE_KEY = 'boq_item_costs';

export function useDynamicCostCalculator() {
  // Initialize all state with stable initial values - load from localStorage
  const [itemCosts, setItemCosts] = useState<Record<string, ItemCostData>>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(ITEM_COSTS_STORAGE_KEY);
        if (stored) {
          console.log('Loaded itemCosts from localStorage');
          return JSON.parse(stored) as Record<string, ItemCostData>;
        }
      }
    } catch (e) {
      console.error('Error loading itemCosts from localStorage:', e);
    }
    return {};
  });
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [savedTemplate, setSavedTemplate] = useState<CostTemplate | null>(() => null);
  const [savedTemplates, setSavedTemplates] = useState<CostTemplate[]>(() => {
    // Load templates from localStorage synchronously in initializer
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored) as CostTemplate[];
        }
      }
    } catch (e) {
      console.error('Error loading templates from localStorage:', e);
    }
    return [];
  });

  // Set initial active template after mount
  useEffect(() => {
    if (savedTemplates.length > 0 && !savedTemplate) {
      setSavedTemplate(savedTemplates[0]);
    }
  }, [savedTemplates, savedTemplate]);

  // Save templates to localStorage when they change
  const saveTemplatesToStorage = useCallback((templates: CostTemplate[]) => {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    } catch (e) {
      console.error('Error saving templates to localStorage:', e);
    }
  }, []);

  // Auto-save itemCosts to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(itemCosts).length > 0) {
      try {
        localStorage.setItem(ITEM_COSTS_STORAGE_KEY, JSON.stringify(itemCosts));
        setLastSavedAt(new Date());
        console.log('Auto-saved itemCosts to localStorage:', itemCosts);
      } catch (e) {
        console.error('Error saving itemCosts to localStorage:', e);
      }
    }
  }, [itemCosts]);

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

  // New: Set AI suggested rate for an item
  const setAISuggestedRate = useCallback((itemId: string, rate: number) => {
    setItemCosts(prev => {
      const current = prev[itemId] || { ...defaultCostInputs, itemId, quantity: 1 };
      return {
        ...prev,
        [itemId]: {
          ...current,
          aiSuggestedRate: rate,
        },
      };
    });
  }, []);

  // New: Set AI suggested rates for multiple items
  const setMultipleAISuggestedRates = useCallback((rates: Array<{ itemId: string; rate: number }>) => {
    setItemCosts(prev => {
      const newCosts = { ...prev };
      rates.forEach(({ itemId, rate }) => {
        const current = newCosts[itemId] || { ...defaultCostInputs, itemId, quantity: 1 };
        newCosts[itemId] = {
          ...current,
          aiSuggestedRate: rate,
        };
      });
      return newCosts;
    });
  }, []);

  // Apply AI suggested rate as the calculated unit price (by setting materials to that value)
  const applyAIRatesToCalculatedPrice = useCallback((rates: Array<{ itemId: string; rate: number }>) => {
    console.log('applyAIRatesToCalculatedPrice called with:', rates);
    
    setItemCosts(prev => {
      const newCosts = { ...prev };
      
      rates.forEach(({ itemId, rate }) => {
        const current = newCosts[itemId] || { ...defaultCostInputs, itemId, quantity: 1 };
        // Use 10% default profit margin
        const profitMargin = current.profitMargin || 10;
        // Calculate materials value so that: materials * (1 + profitMargin/100) = rate
        const baseValue = rate / (1 + profitMargin / 100);
        
        newCosts[itemId] = {
          ...current,
          itemId,
          aiSuggestedRate: rate,
          // Set materials to baseValue so calculated price = AI rate
          materials: baseValue,
          // Reset other costs to 0 
          generalLabor: 0,
          equipmentOperator: 0,
          overhead: 0,
          admin: 0,
          insurance: 0,
          contingency: 0,
          equipment: 0,
          subcontractor: 0,
        };
      });
      
      console.log('Updated itemCosts:', newCosts);
      return newCosts;
    });
    
    // Force update lastSavedAt to trigger re-render in dependent components
    setLastSavedAt(new Date());
  }, []);

  const getItemCostData = useCallback((itemId: string): ItemCostData => {
    return itemCosts[itemId] || { ...defaultCostInputs, itemId, quantity: 1 };
  }, [itemCosts]);

  const getItemCalculatedCosts = useCallback((itemId: string): CalculatedCosts & { aiSuggestedRate?: number } => {
    const data = getItemCostData(itemId);
    const calculated = calculateItemCosts(data);
    return {
      ...calculated,
      aiSuggestedRate: data.aiSuggestedRate,
    };
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

  // Template functions - Updated for multiple templates
  const saveAsTemplate = useCallback((costs: CostInputs, name: string = "القالب المحفوظ") => {
    const template: CostTemplate = {
      id: `template_${Date.now()}`,
      name,
      costs: { ...costs },
      createdAt: new Date().toISOString(),
    };
    
    const newTemplates = [...savedTemplates, template];
    setSavedTemplates(newTemplates);
    setSavedTemplate(template);
    saveTemplatesToStorage(newTemplates);
    
    return template;
  }, [savedTemplates, saveTemplatesToStorage]);

  const getSavedTemplate = useCallback((): CostTemplate | null => {
    return savedTemplate;
  }, [savedTemplate]);

  const getSavedTemplates = useCallback((): CostTemplate[] => {
    return savedTemplates;
  }, [savedTemplates]);

  const selectTemplate = useCallback((templateId: string) => {
    const template = savedTemplates.find(t => t.id === templateId);
    if (template) {
      setSavedTemplate(template);
      return true;
    }
    return false;
  }, [savedTemplates]);

  const deleteTemplate = useCallback((templateId: string) => {
    const newTemplates = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(newTemplates);
    saveTemplatesToStorage(newTemplates);
    
    // If deleted template was the active one, clear it
    if (savedTemplate?.id === templateId) {
      setSavedTemplate(newTemplates.length > 0 ? newTemplates[0] : null);
    }
    
    return true;
  }, [savedTemplates, savedTemplate, saveTemplatesToStorage]);

  const updateTemplateName = useCallback((templateId: string, newName: string) => {
    const newTemplates = savedTemplates.map(t => 
      t.id === templateId ? { ...t, name: newName } : t
    );
    setSavedTemplates(newTemplates);
    saveTemplatesToStorage(newTemplates);
    
    if (savedTemplate?.id === templateId) {
      setSavedTemplate({ ...savedTemplate, name: newName });
    }
    
    return true;
  }, [savedTemplates, savedTemplate, saveTemplatesToStorage]);

  // Export templates as JSON
  const exportTemplates = useCallback(() => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      templates: savedTemplates,
    };
    return JSON.stringify(exportData, null, 2);
  }, [savedTemplates]);

  // Import templates from JSON
  const importTemplates = useCallback((jsonString: string): { success: boolean; count: number; error?: string } => {
    try {
      const data = JSON.parse(jsonString);
      
      // Validate structure
      if (!data.templates || !Array.isArray(data.templates)) {
        return { success: false, count: 0, error: 'Invalid template format: missing templates array' };
      }
      
      // Validate each template
      const validTemplates: CostTemplate[] = [];
      for (const template of data.templates) {
        if (!template.name || !template.costs) {
          continue; // Skip invalid templates
        }
        
        // Ensure all cost fields exist
        const costs: CostInputs = {
          generalLabor: template.costs.generalLabor || 0,
          equipmentOperator: template.costs.equipmentOperator || 0,
          overhead: template.costs.overhead || 0,
          admin: template.costs.admin || 0,
          insurance: template.costs.insurance || 0,
          contingency: template.costs.contingency || 0,
          profitMargin: template.costs.profitMargin || 10,
          materials: template.costs.materials || 0,
          equipment: template.costs.equipment || 0,
          subcontractor: template.costs.subcontractor || 0,
        };
        
        validTemplates.push({
          id: template.id || `imported_${Date.now()}_${validTemplates.length}`,
          name: template.name,
          costs,
          createdAt: template.createdAt || new Date().toISOString(),
        });
      }
      
      if (validTemplates.length === 0) {
        return { success: false, count: 0, error: 'No valid templates found in file' };
      }
      
      // Merge with existing templates (avoid duplicates by name)
      const existingNames = new Set(savedTemplates.map(t => t.name));
      const newTemplates = validTemplates.filter(t => !existingNames.has(t.name));
      
      const mergedTemplates = [...savedTemplates, ...newTemplates];
      setSavedTemplates(mergedTemplates);
      saveTemplatesToStorage(mergedTemplates);
      
      if (newTemplates.length > 0 && !savedTemplate) {
        setSavedTemplate(newTemplates[0]);
      }
      
      return { success: true, count: newTemplates.length };
    } catch (e) {
      return { success: false, count: 0, error: e instanceof Error ? e.message : 'Failed to parse JSON' };
    }
  }, [savedTemplates, savedTemplate, saveTemplatesToStorage]);

  const applyTemplateToItem = useCallback((itemId: string, quantity: number = 1, templateId?: string) => {
    const template = templateId 
      ? savedTemplates.find(t => t.id === templateId)
      : savedTemplate;
    
    if (!template) return false;
    
    setItemCosts(prev => ({
      ...prev,
      [itemId]: {
        ...template.costs,
        itemId,
        quantity,
      },
    }));
    return true;
  }, [savedTemplate, savedTemplates]);

  const applyTemplateToMultipleItems = useCallback((items: Array<{ itemId: string; quantity: number }>, templateId?: string) => {
    const template = templateId 
      ? savedTemplates.find(t => t.id === templateId)
      : savedTemplate;
    
    if (!template) return 0;
    
    setItemCosts(prev => {
      const newCosts = { ...prev };
      items.forEach(({ itemId, quantity }) => {
        newCosts[itemId] = {
          ...template.costs,
          itemId,
          quantity,
        };
      });
      return newCosts;
    });
    
    return items.length;
  }, [savedTemplate, savedTemplates]);

  const clearTemplate = useCallback(() => {
    setSavedTemplate(null);
  }, []);

  // Clear all item costs and localStorage
  const clearAllCosts = useCallback(() => {
    setItemCosts({});
    try {
      localStorage.removeItem(ITEM_COSTS_STORAGE_KEY);
      console.log('Cleared all item costs from localStorage');
    } catch (e) {
      console.error('Error clearing itemCosts from localStorage:', e);
    }
  }, []);

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
    // AI rate functions
    setAISuggestedRate,
    setMultipleAISuggestedRates,
    applyAIRatesToCalculatedPrice,
    // Template functions
    savedTemplate,
    savedTemplates,
    saveAsTemplate,
    getSavedTemplate,
    getSavedTemplates,
    selectTemplate,
    deleteTemplate,
    updateTemplateName,
    applyTemplateToItem,
    applyTemplateToMultipleItems,
    clearTemplate,
    // Import/Export
    exportTemplates,
    importTemplates,
    // Auto-save
    lastSavedAt,
    // Clear all
    clearAllCosts,
  };
}

export { defaultCostInputs };
