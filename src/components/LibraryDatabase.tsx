import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Package, Users, Truck, Database, Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { MaterialsTab } from "./library/MaterialsTab";
import { LaborTab } from "./library/LaborTab";
import { EquipmentTab } from "./library/EquipmentTab";
import { useMaterialPrices } from "@/hooks/useMaterialPrices";
import { useLaborRates } from "@/hooks/useLaborRates";
import { useEquipmentRates } from "@/hooks/useEquipmentRates";
import { useSampleLibraryData } from "@/hooks/useSampleLibraryData";
import { PriceValiditySummary } from "./library/PriceValiditySummary";
import { getValidityStats, getValidityStatus, ValidityStatus } from "./library/PriceValidityIndicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const LibraryDatabase = () => {
  const { isArabic } = useLanguage();
  const { materials, refreshMaterials } = useMaterialPrices();
  const { laborRates, refreshLaborRates } = useLaborRates();
  const { equipmentRates, refreshEquipmentRates } = useEquipmentRates();
  const { addAllSampleData, sampleCounts } = useSampleLibraryData();
  const [isAddingSampleData, setIsAddingSampleData] = useState(false);
  const [validityFilter, setValidityFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("materials");

  const handleAddSampleData = async () => {
    setIsAddingSampleData(true);
    const success = await addAllSampleData();
    if (success) {
      await Promise.all([
        refreshMaterials(),
        refreshLaborRates(),
        refreshEquipmentRates(),
      ]);
    }
    setIsAddingSampleData(false);
  };

  // Calculate validity stats for current tab
  const getCurrentTabData = () => {
    switch (activeTab) {
      case "materials":
        return materials.map(m => ({ price_date: m.price_date, valid_until: m.valid_until }));
      case "labor":
        return laborRates.map(l => ({ price_date: l.price_date, valid_until: l.valid_until }));
      case "equipment":
        return equipmentRates.map(e => ({ price_date: e.price_date, valid_until: e.valid_until }));
      default:
        return [];
    }
  };

  const validityStats = getValidityStats(getCurrentTabData());
  const totalItems = materials.length + laborRates.length + equipmentRates.length;
  const showEmptyState = totalItems === 0;

  // Filter function based on validity status
  const filterByValidity = <T extends { price_date?: string; valid_until?: string }>(items: T[]): T[] => {
    if (!validityFilter) return items;
    return items.filter(item => {
      const status = getValidityStatus(item.valid_until, item.price_date);
      return status === validityFilter;
    });
  };

  return (
    <div className="space-y-4">
      {/* Empty State with Sample Data Button */}
      {showEmptyState && (
        <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed rounded-lg bg-muted/30">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {isArabic ? "المكتبة فارغة" : "Library is Empty"}
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
            {isArabic 
              ? "أضف بيانات تجريبية للبدء في استخدام المكتبة، أو قم باستيراد بياناتك من ملف Excel."
              : "Add sample data to start using the library, or import your own data from an Excel file."
            }
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="gap-2" disabled={isAddingSampleData}>
                {isAddingSampleData ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
                {isArabic ? "إضافة بيانات تجريبية" : "Add Sample Data"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isArabic ? "إضافة بيانات تجريبية" : "Add Sample Data"}
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    {isArabic 
                      ? "سيتم إضافة البيانات التجريبية التالية:"
                      : "The following sample data will be added:"
                    }
                  </p>
                  <ul className="list-disc list-inside text-sm">
                    <li>{sampleCounts.materials} {isArabic ? "مادة (خرسانة، حديد، أسمنت...)" : "Materials (concrete, steel, cement...)"}</li>
                    <li>{sampleCounts.labor} {isArabic ? "حرفة (بناء، سباك، كهربائي...)" : "Labor roles (mason, plumber, electrician...)"}</li>
                    <li>{sampleCounts.equipment} {isArabic ? "معدة (حفار، رافعة، خلاطة...)" : "Equipment (excavator, crane, mixer...)"}</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                <AlertDialogAction onClick={handleAddSampleData}>
                  {isArabic ? "إضافة" : "Add"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} dir={isArabic ? "rtl" : "ltr"}>
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="materials" className="gap-2 text-sm">
            <Package className="h-4 w-4" />
            {isArabic ? "المواد" : "Materials"}
            {materials.length > 0 && (
              <span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full">
                {materials.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="labor" className="gap-2 text-sm">
            <Users className="h-4 w-4" />
            {isArabic ? "العمالة" : "Labor"}
            {laborRates.length > 0 && (
              <span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full">
                {laborRates.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-2 text-sm">
            <Truck className="h-4 w-4" />
            {isArabic ? "المعدات" : "Equipment"}
            {equipmentRates.length > 0 && (
              <span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full">
                {equipmentRates.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Price Validity Summary */}
        {getCurrentTabData().length > 0 && (
          <div className="mt-4">
            <PriceValiditySummary 
              stats={validityStats} 
              onFilterChange={setValidityFilter}
              activeFilter={validityFilter}
            />
          </div>
        )}

        <TabsContent value="materials" className="mt-4">
          <MaterialsTab validityFilter={validityFilter} />
        </TabsContent>

        <TabsContent value="labor" className="mt-4">
          <LaborTab validityFilter={validityFilter} />
        </TabsContent>

        <TabsContent value="equipment" className="mt-4">
          <EquipmentTab validityFilter={validityFilter} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
