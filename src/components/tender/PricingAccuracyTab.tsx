import React, { useState } from 'react';
import { Target, GitCompare, Upload, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PriceComparisonTracker from '@/components/PriceComparisonTracker';
import ReferencePriceImporter from '@/components/ReferencePriceImporter';
import PricingAccuracyPDFReport from '@/components/PricingAccuracyPDFReport';

interface PricingAccuracyTabProps {
  isArabic: boolean;
  projectId?: string;
}

export function PricingAccuracyTab({ isArabic, projectId }: PricingAccuracyTabProps) {
  const [activeSubTab, setActiveSubTab] = useState('comparison');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Target className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">
            {isArabic ? 'تتبع دقة التسعير' : 'Pricing Accuracy Tracking'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isArabic 
              ? 'تتبع ومقارنة الأسعار المقترحة مع الأسعار النهائية المعتمدة'
              : 'Track and compare suggested prices with final approved prices'}
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid tabs-navigation-safe">
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isArabic ? 'مقارنة الأسعار' : 'Price Comparison'}
            </span>
            <span className="sm:hidden">
              {isArabic ? 'مقارنة' : 'Compare'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isArabic ? 'استيراد المرجعية' : 'Import Reference'}
            </span>
            <span className="sm:hidden">
              {isArabic ? 'استيراد' : 'Import'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="report" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isArabic ? 'تقرير PDF' : 'PDF Report'}
            </span>
            <span className="sm:hidden">
              {isArabic ? 'تقرير' : 'Report'}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="mt-6">
          <PriceComparisonTracker />
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <ReferencePriceImporter />
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <PricingAccuracyPDFReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PricingAccuracyTab;
