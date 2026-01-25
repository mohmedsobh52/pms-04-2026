import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PricingDetail {
  id: string;
  project_item_id: string;
  pricing_type: "material" | "labor" | "equipment";
  resource_id: string | null;
  resource_name: string;
  unit: string | null;
  unit_price: number;
  quantity: number;
  duration: number;
  total_cost: number;
  notes: string | null;
  created_at: string;
  user_id: string;
}

export interface NewPricingDetail {
  pricing_type: "material" | "labor" | "equipment";
  resource_id?: string | null;
  resource_name: string;
  unit?: string | null;
  unit_price: number;
  quantity: number;
  duration?: number;
  notes?: string | null;
}

export function useItemPricingDetails(projectItemId: string | null) {
  const [details, setDetails] = useState<PricingDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadDetails = useCallback(async () => {
    if (!projectItemId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("item_pricing_details")
        .select("*")
        .eq("project_item_id", projectItemId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setDetails((data as PricingDetail[]) || []);
    } catch (error) {
      console.error("Error loading pricing details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectItemId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const addDetail = async (detail: NewPricingDetail): Promise<boolean> => {
    if (!projectItemId) return false;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({
          title: "خطأ",
          description: "يجب تسجيل الدخول أولاً",
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase.from("item_pricing_details").insert({
        project_item_id: projectItemId,
        pricing_type: detail.pricing_type,
        resource_id: detail.resource_id || null,
        resource_name: detail.resource_name,
        unit: detail.unit || null,
        unit_price: detail.unit_price,
        quantity: detail.quantity,
        duration: detail.duration || 1,
        notes: detail.notes || null,
        user_id: userData.user.id,
      });

      if (error) throw error;

      await loadDetails();
      return true;
    } catch (error) {
      console.error("Error adding pricing detail:", error);
      toast({
        title: "خطأ",
        description: "فشل في إضافة العنصر",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateDetail = async (
    id: string,
    updates: Partial<NewPricingDetail>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("item_pricing_details")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await loadDetails();
      return true;
    } catch (error) {
      console.error("Error updating pricing detail:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث العنصر",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteDetail = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("item_pricing_details")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadDetails();
      return true;
    } catch (error) {
      console.error("Error deleting pricing detail:", error);
      toast({
        title: "خطأ",
        description: "فشل في حذف العنصر",
        variant: "destructive",
      });
      return false;
    }
  };

  const clearAllDetails = async (): Promise<boolean> => {
    if (!projectItemId) return false;

    try {
      const { error } = await supabase
        .from("item_pricing_details")
        .delete()
        .eq("project_item_id", projectItemId);

      if (error) throw error;

      setDetails([]);
      return true;
    } catch (error) {
      console.error("Error clearing pricing details:", error);
      return false;
    }
  };

  // Calculate totals by type
  const materialsCost = details
    .filter((d) => d.pricing_type === "material")
    .reduce((sum, d) => sum + (d.total_cost || 0), 0);

  const laborCost = details
    .filter((d) => d.pricing_type === "labor")
    .reduce((sum, d) => sum + (d.total_cost || 0), 0);

  const equipmentCost = details
    .filter((d) => d.pricing_type === "equipment")
    .reduce((sum, d) => sum + (d.total_cost || 0), 0);

  const directCost = materialsCost + laborCost + equipmentCost;

  return {
    details,
    isLoading,
    addDetail,
    updateDetail,
    deleteDetail,
    clearAllDetails,
    reload: loadDetails,
    totals: {
      materials: materialsCost,
      labor: laborCost,
      equipment: equipmentCost,
      direct: directCost,
    },
  };
}
