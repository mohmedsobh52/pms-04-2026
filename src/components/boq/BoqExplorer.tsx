import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BoqTreeView } from "./BoqTreeView";
import { BoqDataTable } from "./BoqDataTable";
import { useLanguage } from "@/hooks/useLanguage";
import { List, Network } from "lucide-react";

interface Props {
  projectId: string;
  currency?: string;
}

export function BoqExplorer({ projectId, currency = "SAR" }: Props) {
  const { isArabic } = useLanguage();
  return (
    <Tabs defaultValue="table" className="w-full">
      <TabsList>
        <TabsTrigger value="table" className="gap-1.5">
          <List className="w-4 h-4" />
          {isArabic ? "جدول" : "Table"}
        </TabsTrigger>
        <TabsTrigger value="tree" className="gap-1.5">
          <Network className="w-4 h-4" />
          {isArabic ? "هرمي" : "Hierarchy"}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="table" className="mt-3">
        <BoqDataTable projectId={projectId} currency={currency} />
      </TabsContent>
      <TabsContent value="tree" className="mt-3">
        <BoqTreeView projectId={projectId} currency={currency} />
      </TabsContent>
    </Tabs>
  );
}
