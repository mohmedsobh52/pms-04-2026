import React, { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { PageLayout } from '@/components/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, GitCompare, Upload, FileText } from 'lucide-react';
import PriceComparisonTracker from '@/components/PriceComparisonTracker';
import ReferencePriceImporter from '@/components/ReferencePriceImporter';
import PricingAccuracyPDFReport from '@/components/PricingAccuracyPDFReport';

const PricingAccuracyPage: React.FC = () => {
  const { isArabic } = useLanguage();
  const [activeTab, setActiveTab] = useState('comparison');

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6 space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Target className="h-8 w-8 text-primary" />
              {isArabic ? 'تتبع دقة التسعير' : 'Pricing Accuracy Tracking'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isArabic 
                ? 'تتبع ومقارنة الأسعار المقترحة مع الأسعار النهائية المعتمدة'
                : 'Track and compare suggested prices with final approved prices'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
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
    </PageLayout>
  );
};

export default PricingAccuracyPage;
