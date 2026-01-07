import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface EditedPrice {
  unitPrice?: number;
  totalPrice?: number;
}

interface EditedPrices {
  [itemNumber: string]: EditedPrice;
}

interface UseEditedPricesProps {
  projectId?: string;
  savedProjectId?: string;
  fileName?: string;
}

export const useEditedPrices = ({ projectId, savedProjectId, fileName }: UseEditedPricesProps) => {
  const { user } = useAuth();
  const [editedPrices, setEditedPrices] = useState<EditedPrices>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const pendingSaves = useRef<Map<string, EditedPrice>>(new Map());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load edited prices from database
  const loadEditedPrices = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      let query = supabase
        .from('edited_boq_prices')
        .select('item_number, edited_unit_price, edited_total_price')
        .eq('user_id', user.id);

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (savedProjectId) {
        query = query.eq('saved_project_id', savedProjectId);
      } else if (fileName) {
        query = query.eq('file_name', fileName).is('project_id', null).is('saved_project_id', null);
      } else {
        setIsLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading edited prices:', error);
        return;
      }

      const prices: EditedPrices = {};
      data?.forEach((row: any) => {
        prices[row.item_number] = {
          unitPrice: row.edited_unit_price ?? undefined,
          totalPrice: row.edited_total_price ?? undefined,
        };
      });

      setEditedPrices(prices);
    } catch (error) {
      console.error('Error loading edited prices:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, projectId, savedProjectId, fileName]);

  // Save a single price to database
  const savePrice = useCallback(async (itemNumber: string, price: EditedPrice) => {
    if (!user?.id) return;

    try {
      const upsertData: any = {
        user_id: user.id,
        item_number: itemNumber,
        edited_unit_price: price.unitPrice ?? null,
        edited_total_price: price.totalPrice ?? null,
        project_id: projectId || null,
        saved_project_id: savedProjectId || null,
        file_name: (!projectId && !savedProjectId) ? fileName : null,
      };

      const { error } = await supabase
        .from('edited_boq_prices')
        .upsert(upsertData, {
          onConflict: 'user_id,project_id,saved_project_id,file_name,item_number',
          ignoreDuplicates: false
        });

      if (error) {
        // If upsert fails, try insert or update manually
        const { data: existing } = await supabase
          .from('edited_boq_prices')
          .select('id')
          .eq('user_id', user.id)
          .eq('item_number', itemNumber)
          .eq('project_id', projectId || '')
          .eq('saved_project_id', savedProjectId || '')
          .eq('file_name', fileName || '')
          .maybeSingle();

        if (existing) {
          await supabase
            .from('edited_boq_prices')
            .update({
              edited_unit_price: price.unitPrice ?? null,
              edited_total_price: price.totalPrice ?? null,
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('edited_boq_prices')
            .insert(upsertData);
        }
      }
    } catch (error) {
      console.error('Error saving price:', error);
    }
  }, [user?.id, projectId, savedProjectId, fileName]);

  // Batch save pending changes
  const flushPendingSaves = useCallback(async () => {
    if (pendingSaves.current.size === 0) return;

    setIsSaving(true);
    const saves = Array.from(pendingSaves.current.entries());
    pendingSaves.current.clear();

    try {
      await Promise.all(saves.map(([itemNumber, price]) => savePrice(itemNumber, price)));
    } catch (error) {
      console.error('Error batch saving prices:', error);
    } finally {
      setIsSaving(false);
    }
  }, [savePrice]);

  // Debounced save
  const debouncedSave = useCallback((itemNumber: string, price: EditedPrice) => {
    pendingSaves.current.set(itemNumber, price);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      flushPendingSaves();
    }, 1000);
  }, [flushPendingSaves]);

  // Update unit price
  const updateUnitPrice = useCallback((itemNumber: string, unitPrice: number) => {
    setEditedPrices(prev => {
      const existing = prev[itemNumber] || {};
      const updated = { ...existing, unitPrice };
      debouncedSave(itemNumber, updated);
      return { ...prev, [itemNumber]: updated };
    });
  }, [debouncedSave]);

  // Update total price
  const updateTotalPrice = useCallback((itemNumber: string, totalPrice: number) => {
    setEditedPrices(prev => {
      const existing = prev[itemNumber] || {};
      const updated = { ...existing, totalPrice };
      debouncedSave(itemNumber, updated);
      return { ...prev, [itemNumber]: updated };
    });
  }, [debouncedSave]);

  // Clear all edited prices
  const clearAllPrices = useCallback(async () => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('edited_boq_prices')
        .delete()
        .eq('user_id', user.id);

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (savedProjectId) {
        query = query.eq('saved_project_id', savedProjectId);
      } else if (fileName) {
        query = query.eq('file_name', fileName).is('project_id', null).is('saved_project_id', null);
      }

      const { error } = await query;

      if (error) {
        console.error('Error clearing prices:', error);
        toast.error('فشل في مسح الأسعار المعدلة');
        return;
      }

      setEditedPrices({});
      toast.success('تم مسح الأسعار المعدلة');
    } catch (error) {
      console.error('Error clearing prices:', error);
    }
  }, [user?.id, projectId, savedProjectId, fileName]);

  // Get edited price for an item
  const getEditedPrice = useCallback((itemNumber: string): EditedPrice | undefined => {
    return editedPrices[itemNumber];
  }, [editedPrices]);

  // Check if item has edited price
  const hasEditedPrice = useCallback((itemNumber: string): boolean => {
    const price = editedPrices[itemNumber];
    return price !== undefined && (price.unitPrice !== undefined || price.totalPrice !== undefined);
  }, [editedPrices]);

  // Get count of edited items
  const editedCount = Object.keys(editedPrices).filter(key => {
    const price = editedPrices[key];
    return price.unitPrice !== undefined || price.totalPrice !== undefined;
  }).length;

  // Load on mount and when identifiers change
  useEffect(() => {
    loadEditedPrices();
  }, [loadEditedPrices]);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Immediate save on unmount
      if (pendingSaves.current.size > 0) {
        const saves = Array.from(pendingSaves.current.entries());
        saves.forEach(([itemNumber, price]) => {
          savePrice(itemNumber, price);
        });
      }
    };
  }, [savePrice]);

  return {
    editedPrices,
    isLoading,
    isSaving,
    updateUnitPrice,
    updateTotalPrice,
    clearAllPrices,
    getEditedPrice,
    hasEditedPrice,
    editedCount,
    reload: loadEditedPrices,
  };
};
