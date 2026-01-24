import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Users, Truck } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { MaterialsTab } from "./library/MaterialsTab";
import { LaborTab } from "./library/LaborTab";
import { EquipmentTab } from "./library/EquipmentTab";

export const LibraryDatabase = () => {
  const { isArabic } = useLanguage();

  return (
    <div className="space-y-4">
      <Tabs defaultValue="materials" dir={isArabic ? "rtl" : "ltr"}>
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="materials" className="gap-2 text-sm">
            <Package className="h-4 w-4" />
            {isArabic ? "المواد" : "Materials"}
          </TabsTrigger>
          <TabsTrigger value="labor" className="gap-2 text-sm">
            <Users className="h-4 w-4" />
            {isArabic ? "العمالة" : "Labor"}
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-2 text-sm">
            <Truck className="h-4 w-4" />
            {isArabic ? "المعدات" : "Equipment"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="mt-6">
          <MaterialsTab />
        </TabsContent>

        <TabsContent value="labor" className="mt-6">
          <LaborTab />
        </TabsContent>

        <TabsContent value="equipment" className="mt-6">
          <EquipmentTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
