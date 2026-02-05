import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSpreadsheet, FileText, Download, Eye, Languages, Printer, FileDown, AlertTriangle, Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { exportBOQToExcel, exportEnhancedBOQToExcel, exportTenderSummaryToExcel, exportPriceAnalysisToExcel, exportTenderSummaryToPDF } from "@/lib/reports-export-utils";
import { supabase } from "@/integrations/supabase/client";
import { getStoredLogo } from "@/components/CompanyLogoUpload";
import { getCompanySettings } from "@/hooks/useCompanySettings";

interface Project {
  id: string;
  name: string;
  analysis_data: any;
  file_name?: string;
}

interface ExportTabProps {
  projects: Project[];
  isLoading: boolean;
}

export const ExportTab = ({ projects, isLoading }: ExportTabProps) => {
  const { isArabic } = useLanguage();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [dynamicItems, setDynamicItems] = useState<any[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Helper function to get items from different data structures with JSON parsing support
  const getProjectItems = (project: Project | undefined): any[] => {
    if (!project?.analysis_data) {
      console.log("❌ getProjectItems: No analysis_data for project:", project?.name);
      return [];
    }
    
    let data = project.analysis_data;
    console.log("📊 getProjectItems: Raw analysis_data type:", typeof data);
    
    // Handle if data is a string (JSON not parsed)
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
        console.log("✅ getProjectItems: Parsed JSON string successfully");
      } catch (e) {
        console.error("❌ getProjectItems: Failed to parse analysis_data:", e);
        return [];
      }
    }
    
    // Support different data structures
    if (Array.isArray(data.items) && data.items.length > 0) {
      console.log("✅ getProjectItems: Found data.items:", data.items.length);
      return data.items;
    }
    if (Array.isArray(data.boq_items) && data.boq_items.length > 0) {
      console.log("✅ getProjectItems: Found data.boq_items:", data.boq_items.length);
      return data.boq_items;
    }
    if (data.analysisData && Array.isArray(data.analysisData.items) && data.analysisData.items.length > 0) {
      console.log("✅ getProjectItems: Found data.analysisData.items:", data.analysisData.items.length);
      return data.analysisData.items;
    }
    
    console.log("❌ getProjectItems: No items found in any structure. Keys:", Object.keys(data || {}));
    return [];
  };

  // Helper function to normalize item prices from various sources
  const normalizeItemPrices = (items: any[]): any[] => {
    return items.map(item => {
      // Extract unit price from multiple possible fields
      const unitPrice = parseFloat(
        item.unit_price || item.rate || item.price || item.ai_rate || item.ai_suggested_rate || 0
      ) || 0;
      
      // Extract quantity
      const quantity = parseFloat(item.quantity || item.qty || 0) || 0;
      
      // Calculate total price
      const totalPrice = parseFloat(
        item.total_price || item.amount || item.total || 0
      ) || (unitPrice * quantity) || 0;
      
      return {
        ...item,
        unit_price: unitPrice,
        total_price: totalPrice,
        quantity: quantity
      };
    });
  };

  // Fetch items dynamically when project changes - PRIORITY: project_items table FIRST (has updated prices)
  useEffect(() => {
    const fetchItems = async () => {
      console.log("📊 ExportTab: Fetching items for project:", selectedProject?.name);
      console.log("📊 ExportTab: selectedProjectId:", selectedProjectId);
      
      if (!selectedProject) {
        console.log("⚠️ ExportTab: No project selected, clearing items");
        setDynamicItems([]);
        return;
      }
      
      setIsLoadingItems(true);
      
      // PRIORITY 1: Fetch from project_items table (contains UPDATED prices from AI/manual pricing)
      try {
        const { data: dbItems, error } = await supabase
          .from("project_items")
          .select("*")
          .eq("project_id", selectedProject.id)
          .order("item_number");
        
        if (!error && dbItems && dbItems.length > 0) {
          console.log("✅ ExportTab: Using project_items (updated prices):", dbItems.length, "items");
          // Normalize prices to ensure numeric values
          const normalizedItems = normalizeItemPrices(dbItems);
          setDynamicItems(normalizedItems);
          setIsLoadingItems(false);
          return;
        }
        
        if (error) {
          console.error("⚠️ ExportTab: Error fetching project_items:", error);
        }
      } catch (err) {
        console.error("⚠️ ExportTab: Failed to fetch project_items:", err);
      }
      
      // PRIORITY 2: Fallback to analysis_data (may have outdated/zero prices)
      console.log("⚠️ ExportTab: No items in project_items table, falling back to analysis_data...");
      const analysisItems = getProjectItems(selectedProject);
      
      if (analysisItems.length > 0) {
        console.log("⚠️ ExportTab: Using analysis_data (may have outdated prices):", analysisItems.length, "items");
        // Normalize prices from analysis_data as well
        const normalizedItems = normalizeItemPrices(analysisItems);
        setDynamicItems(normalizedItems);
      } else {
        console.log("❌ ExportTab: No items found in any source");
        setDynamicItems([]);
      }
      
      setIsLoadingItems(false);
    };
    
    fetchItems();
  }, [selectedProjectId, selectedProject?.analysis_data]);

  // Use dynamicItems for all operations
  const projectItems = dynamicItems;
  const hasData = projectItems.length > 0;
  
  console.log("🎯 ExportTab State: projectItems:", projectItems.length, "hasData:", hasData, "isLoadingItems:", isLoadingItems);

  const handleExportBOQ = () => {
    console.log("🎯 handleExportBOQ called");
    if (projectItems.length === 0) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }
    exportBOQToExcel(projectItems, selectedProject?.name || "Project");
    toast.success(isArabic ? "تم تصدير جدول الكميات بنجاح" : "BOQ exported successfully");
  };

  const handleExportEnhancedBOQ = (language: 'en' | 'ar' | 'both') => {
    console.log("🎯 handleExportEnhancedBOQ called with language:", language);
    if (projectItems.length === 0) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }
    exportEnhancedBOQToExcel(projectItems, selectedProject?.name || "Project", language);
    toast.success(isArabic ? "تم تصدير جدول الكميات المحسن بنجاح" : "Enhanced BOQ exported successfully");
  };

  const handleExportTenderSummary = (format: 'pdf' | 'excel') => {
    console.log("🎯 handleExportTenderSummary called with format:", format);
    if (projectItems.length === 0) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }
    
    // Calculate total with proper fallback logic
    const totalValue = projectItems.reduce((sum: number, item: any) => {
      const unitPrice = parseFloat(item.unit_price) || parseFloat(item.rate) || parseFloat(item.ai_rate) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const itemTotal = parseFloat(item.total_price) || parseFloat(item.amount) || (unitPrice * quantity) || 0;
      return sum + itemTotal;
    }, 0);
    
    const analysisData = {
      items: projectItems,
      summary: {
        total_value: totalValue,
        currency: selectedProject?.analysis_data?.summary?.currency || "SAR",
        total_items: projectItems.length
      }
    };
    
    if (format === 'pdf') {
      exportTenderSummaryToPDF(analysisData, selectedProject?.name || "Project", isArabic);
    } else {
      exportTenderSummaryToExcel(analysisData, selectedProject?.name || "Project");
    }
    toast.success(isArabic ? "تم تصدير ملخص العطاء بنجاح" : "Tender summary exported successfully");
  };

  const handleExportPriceAnalysis = () => {
    console.log("🎯 handleExportPriceAnalysis called");
    if (projectItems.length === 0) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }
    exportPriceAnalysisToExcel(projectItems, selectedProject?.name || "Project");
    toast.success(isArabic ? "تم تصدير تحليل الأسعار بنجاح" : "Price analysis exported successfully");
  };

  // Generate company header HTML
  const getCompanyHeaderHTML = () => {
    const companyLogo = getStoredLogo();
    const companySettings = getCompanySettings();
    const companyNameEn = companySettings.companyNameEn || '';
    const companyNameAr = companySettings.companyNameAr || '';
    
    return `
      <div class="company-header">
        <div class="company-name-en">${companyNameEn}</div>
        <div class="company-logo">
          ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" />` : ''}
        </div>
        <div class="company-name-ar">${companyNameAr}</div>
      </div>
    `;
  };

  // Generate company header CSS
  const getCompanyHeaderCSS = () => `
    .company-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 25px;
      background: #fff;
      border-bottom: 3px solid #1e40af;
      margin-bottom: 20px;
    }
    .company-name-en {
      font-size: 14px;
      font-weight: 600;
      font-style: italic;
      color: #1e293b;
      font-family: 'Times New Roman', serif;
      flex: 1;
      text-align: left;
    }
    .company-name-ar {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      font-family: 'Cairo', sans-serif;
      flex: 1;
      text-align: right;
    }
    .company-logo {
      flex-shrink: 0;
      padding: 0 20px;
    }
    .company-logo img {
      max-height: 50px;
      max-width: 80px;
      object-fit: contain;
    }
    
    /* Header appears on every printed page */
    @media print {
      .company-header {
        position: running(header);
      }
      @page {
        @top-center {
          content: element(header);
        }
        margin-top: 100px;
      }
    }
    
    /* Fallback for browsers that don't support running headers */
    thead {
      display: table-header-group;
    }
    
    .print-header {
      display: none;
    }
    
    @media print {
      .print-header {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: white;
        z-index: 1000;
      }
      
      body {
        padding-top: 80px !important;
      }
      
      table {
        page-break-inside: auto;
      }
      
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      
      thead {
        display: table-header-group;
      }
    }
  `;

  const handleViewPriceAnalysis = () => {
    console.log("🎯 handleViewPriceAnalysis called");
    if (projectItems.length === 0) {
      toast.error(isArabic ? "لا توجد بيانات للعرض" : "No data to view");
      return;
    }
    
    // Calculate total with proper fallback logic
    const totalValue = projectItems.reduce((sum: number, item: any) => {
      const unitPrice = parseFloat(item.unit_price) || parseFloat(item.rate) || parseFloat(item.ai_rate) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const itemTotal = parseFloat(item.total_price) || parseFloat(item.amount) || (unitPrice * quantity) || 0;
      return sum + itemTotal;
    }, 0);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(
        isArabic 
          ? "⚠️ يرجى السماح بالنوافذ المنبثقة في إعدادات المتصفح" 
          : "⚠️ Please allow popups in your browser settings",
        { duration: 5000 }
      );
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${selectedProject?.name || 'Project'} - ${isArabic ? "تحليل الأسعار" : "Price Analysis"}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { font-family: 'Cairo', 'Segoe UI', sans-serif; box-sizing: border-box; }
          body { 
            direction: ${isArabic ? 'rtl' : 'ltr'}; 
            text-align: ${isArabic ? 'right' : 'left'}; 
            padding: 30px;
            color: #1e293b;
          }
          ${getCompanyHeaderCSS()}
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 25px 30px;
            border-radius: 12px;
            margin-bottom: 25px;
          }
          .header h1 { margin: 0 0 8px 0; font-size: 24px; }
          .header p { margin: 0; opacity: 0.9; font-size: 14px; }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          .stat-card {
            background: #f1f5f9;
            border-radius: 10px;
            padding: 18px;
            text-align: center;
          }
          .stat-card .label { font-size: 12px; color: #64748b; margin-bottom: 5px; }
          .stat-card .value { font-size: 20px; font-weight: 700; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
          th { background: #10b981; color: white; padding: 12px 10px; font-weight: 600; text-align: ${isArabic ? 'right' : 'left'}; }
          td { border: 1px solid #e2e8f0; padding: 10px; text-align: ${isArabic ? 'right' : 'left'}; }
          tr:nth-child(even) { background: #f8fafc; }
          .percentage-bar { 
            background: #e2e8f0; 
            border-radius: 4px; 
            height: 8px; 
            overflow: hidden; 
          }
          .percentage-fill { 
            background: #10b981; 
            height: 100%; 
            transition: width 0.3s; 
          }
          .total-row { font-weight: 700; background: #d1fae5 !important; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${getCompanyHeaderHTML()}
        <div class="header">
          <h1>${selectedProject?.name || 'Project'}</h1>
          <p>${isArabic ? "تقرير تحليل الأسعار التفصيلي" : "Detailed Price Analysis Report"}</p>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="label">${isArabic ? "إجمالي البنود" : "Total Items"}</div>
            <div class="value">${projectItems.length}</div>
          </div>
          <div class="stat-card">
            <div class="label">${isArabic ? "إجمالي القيمة" : "Total Value"}</div>
            <div class="value">${totalValue.toLocaleString('en-US')}</div>
          </div>
          <div class="stat-card">
            <div class="label">${isArabic ? "متوسط سعر البند" : "Avg Item Price"}</div>
            <div class="value">${(totalValue / projectItems.length).toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${isArabic ? "الوصف" : "Description"}</th>
              <th>${isArabic ? "الكمية" : "Qty"}</th>
              <th>${isArabic ? "السعر" : "Price"}</th>
              <th>${isArabic ? "الإجمالي" : "Total"}</th>
              <th>${isArabic ? "النسبة" : "%"}</th>
            </tr>
          </thead>
          <tbody>
            ${projectItems.map((item: any, idx: number) => {
              // Calculate with proper fallback logic
              const unitPrice = parseFloat(item.unit_price) || parseFloat(item.rate) || parseFloat(item.ai_rate) || 0;
              const quantity = parseFloat(item.quantity) || 0;
              const itemTotal = parseFloat(item.total_price) || parseFloat(item.amount) || (unitPrice * quantity) || 0;
              const percentage = totalValue > 0 ? ((itemTotal / totalValue) * 100) : 0;
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.description || '-'}</td>
                  <td>${quantity > 0 ? quantity.toLocaleString('en-US') : '-'}</td>
                  <td>${unitPrice > 0 ? unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                  <td>${itemTotal > 0 ? itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div class="percentage-bar" style="width: 60px;">
                        <div class="percentage-fill" style="width: ${Math.min(percentage, 100)}%;"></div>
                      </div>
                      <span>${percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td colspan="4">${isArabic ? "الإجمالي" : "Total"}</td>
              <td>${totalValue.toLocaleString('en-US')}</td>
              <td>100%</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    toast.success(isArabic ? "تم فتح تحليل الأسعار" : "Price analysis opened");
  };

  const handleExportComprehensivePDF = () => {
    console.log("🎯 handleExportComprehensivePDF called");
    console.log("🎯 selectedProject:", selectedProject?.name);
    console.log("🎯 projectItems.length:", projectItems.length);
    
    if (!selectedProject) {
      toast.error(isArabic ? "الرجاء اختيار مشروع أولاً" : "Please select a project first");
      return;
    }
    
    if (projectItems.length === 0) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }
    // Calculate total with proper fallback logic
    const totalValue = projectItems.reduce((sum: number, item: any) => {
      const unitPrice = parseFloat(item.unit_price) || parseFloat(item.rate) || parseFloat(item.ai_rate) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const itemTotal = parseFloat(item.total_price) || parseFloat(item.amount) || (unitPrice * quantity) || 0;
      return sum + itemTotal;
    }, 0);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(
        isArabic 
          ? "⚠️ يرجى السماح بالنوافذ المنبثقة في إعدادات المتصفح" 
          : "⚠️ Please allow popups in your browser settings",
        { duration: 5000 }
      );
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${selectedProject?.name || 'Project'} - ${isArabic ? "التقرير الشامل" : "Comprehensive Report"}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { 
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; 
            box-sizing: border-box;
          }
          body { 
            direction: ${isArabic ? 'rtl' : 'ltr'}; 
            text-align: ${isArabic ? 'right' : 'left'}; 
            padding: 20px;
            color: #1e293b;
            line-height: 1.6;
          }
          ${getCompanyHeaderCSS()}
          .header {
            background: linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%);
            color: white;
            padding: 25px 30px;
            border-radius: 12px;
            margin-bottom: 25px;
          }
          .header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 700; }
          .header p { margin: 0; opacity: 0.9; font-size: 14px; }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          .summary-card {
            background: #f1f5f9;
            border-radius: 10px;
            padding: 18px;
            text-align: center;
          }
          .summary-card .label { font-size: 12px; color: #64748b; margin-bottom: 5px; }
          .summary-card .value { font-size: 20px; font-weight: 700; color: #1e293b; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            font-size: 11px;
          }
          th { 
            background: #3b82f6; 
            color: white; 
            padding: 12px 10px;
            font-weight: 600;
            text-align: ${isArabic ? 'right' : 'left'};
          }
          td { 
            border: 1px solid #e2e8f0; 
            padding: 10px;
            text-align: ${isArabic ? 'right' : 'left'};
          }
          tr:nth-child(even) { background: #f8fafc; }
          .total-row { 
            font-weight: 700; 
            background: #e2e8f0 !important;
            font-size: 13px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 11px;
            text-align: center;
          }
          @media print {
            body { padding: 0; }
            .header { break-after: avoid; }
          }
        </style>
      </head>
      <body>
        ${getCompanyHeaderHTML()}
        <div class="header">
          <h1>${selectedProject?.name || 'Project'}</h1>
          <p>${isArabic ? "التقرير الشامل - تحليل جدول الكميات" : "Comprehensive Report - BOQ Analysis"}</p>
        </div>
        
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">${isArabic ? "إجمالي البنود" : "Total Items"}</div>
            <div class="value">${projectItems.length}</div>
          </div>
          <div class="summary-card">
            <div class="label">${isArabic ? "إجمالي القيمة" : "Total Value"}</div>
            <div class="value">${totalValue.toLocaleString('en-US')}</div>
          </div>
          <div class="summary-card">
            <div class="label">${isArabic ? "تاريخ التقرير" : "Report Date"}</div>
            <div class="value">${new Date().toLocaleDateString('en-US')}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${isArabic ? "الوصف" : "Description"}</th>
              <th>${isArabic ? "الكمية" : "Qty"}</th>
              <th>${isArabic ? "الوحدة" : "Unit"}</th>
              <th>${isArabic ? "السعر" : "Price"}</th>
              <th>${isArabic ? "الإجمالي" : "Total"}</th>
            </tr>
          </thead>
          <tbody>
            ${projectItems.map((item: any, idx: number) => {
              // Calculate with proper fallback logic
              const unitPrice = parseFloat(item.unit_price) || parseFloat(item.rate) || parseFloat(item.ai_rate) || 0;
              const quantity = parseFloat(item.quantity) || 0;
              const itemTotal = parseFloat(item.total_price) || parseFloat(item.amount) || (unitPrice * quantity) || 0;
              return `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.description || '-'}</td>
                <td>${quantity > 0 ? quantity.toLocaleString('en-US') : '-'}</td>
                <td>${item.unit || '-'}</td>
                <td>${unitPrice > 0 ? unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                <td>${itemTotal > 0 ? itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
              </tr>
            `;
            }).join('')}
            <tr class="total-row">
              <td colspan="5">${isArabic ? "الإجمالي" : "Total"}</td>
              <td>${totalValue.toLocaleString('en-US')}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          ${isArabic ? "تم إنشاء هذا التقرير بواسطة PMS" : "Generated by PMS"} - ${new Date().toLocaleString('en-US')}
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for fonts to load then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
    
    toast.success(isArabic ? "تم فتح نافذة الطباعة - اختر 'حفظ كـ PDF' للتصدير" : "Print window opened - Select 'Save as PDF' to export");
  };

  const handlePrintReport = () => {
    console.log("🎯 handlePrintReport called");
    if (!selectedProject) {
      toast.error(isArabic ? "الرجاء اختيار مشروع أولاً" : "Please select a project first");
      return;
    }
    
    if (projectItems.length === 0) {
      toast.error(isArabic ? "لا توجد بيانات للطباعة" : "No data to print");
      return;
    }
    
    // Filter out items with zero quantity
    const filteredItems = projectItems.filter((item: any) => {
      const qty = parseFloat(item.quantity) || 0;
      return qty > 0;
    });
    
    // Calculate total from filtered items with proper fallback logic
    const totalValue = filteredItems.reduce((sum: number, item: any) => {
      const unitPrice = parseFloat(item.unit_price) || parseFloat(item.rate) || parseFloat(item.ai_rate) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const itemTotal = parseFloat(item.total_price) || parseFloat(item.amount) || (unitPrice * quantity) || 0;
      return sum + itemTotal;
    }, 0);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(
        isArabic 
          ? "⚠️ يرجى السماح بالنوافذ المنبثقة في إعدادات المتصفح" 
          : "⚠️ Please allow popups in your browser settings",
        { duration: 5000 }
      );
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${selectedProject?.name || 'Project'} - ${isArabic ? "تقرير" : "Report"}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { 
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; 
            box-sizing: border-box;
          }
          body { 
            direction: ${isArabic ? 'rtl' : 'ltr'}; 
            text-align: ${isArabic ? 'right' : 'left'}; 
            padding: 20px;
            padding-top: 10px;
            color: #1e293b;
          }
          ${getCompanyHeaderCSS()}
          h1 { color: #3b82f6; margin-bottom: 5px; font-size: 22px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .summary { 
            margin: 20px 0; 
            padding: 18px; 
            background: #f1f5f9; 
            border-radius: 10px;
            display: flex;
            gap: 30px;
            flex-wrap: wrap;
          }
          .summary-item { }
          .summary-label { font-size: 12px; color: #64748b; }
          .summary-value { font-size: 16px; font-weight: 600; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
          th, td { 
            border: 1px solid #e2e8f0; 
            padding: 10px;
            text-align: ${isArabic ? 'right' : 'left'};
          }
          th { background: #3b82f6; color: white; font-weight: 600; }
          tr:nth-child(even) { background: #f8fafc; }
          .total-row { font-weight: bold; background: #e2e8f0 !important; }
          
          /* Print styles for header on every page */
          @media print {
            .print-header-wrapper {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              background: white;
              z-index: 1000;
            }
            
            .content-wrapper {
              margin-top: 100px;
            }
            
            table {
              border-collapse: collapse;
              page-break-inside: auto;
              width: 100%;
            }
            
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            
            thead {
              display: table-header-group !important;
              break-inside: avoid;
            }
            
            tbody {
              display: table-row-group;
            }
            
            th {
              background: #3b82f6 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color: white !important;
            }
          }
          
          @page {
            margin: 15mm 10mm;
            margin-top: 25mm;
            margin-bottom: 15mm;
          }
        </style>
      </head>
      <body>
        <div class="print-header-wrapper">
          ${getCompanyHeaderHTML()}
        </div>
        
        <div class="content-wrapper">
          <h1>${selectedProject?.name || 'Project'}</h1>
          <p class="subtitle">${isArabic ? "تقرير جدول الكميات - التسعير الشامل" : "Bill of Quantities Report - Comprehensive Pricing"}</p>
          
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">${isArabic ? "إجمالي البنود" : "Total Items"}</div>
              <div class="summary-value">${filteredItems.length}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">${isArabic ? "إجمالي القيمة" : "Total Value"}</div>
              <div class="summary-value">${totalValue.toLocaleString('en-US')}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">${isArabic ? "التاريخ" : "Report Date"}</div>
              <div class="summary-value">${new Date().toLocaleDateString('en-US')}</div>
            </div>
            ${projectItems.length !== filteredItems.length ? `
            <div class="summary-item">
              <div class="summary-label">${isArabic ? "بنود مستثناة (كمية صفر)" : "Excluded Items (Zero Qty)"}</div>
              <div class="summary-value">${projectItems.length - filteredItems.length}</div>
            </div>
            ` : ''}
          </div>
          
          <table>
            <thead class="print-header-repeat">
              <tr>
                <th>#</th>
                <th>${isArabic ? "الوصف" : "Description"}</th>
                <th>${isArabic ? "الكمية" : "Qty"}</th>
                <th>${isArabic ? "الوحدة" : "Unit"}</th>
                <th>${isArabic ? "سعر الوحدة" : "Unit Price"}</th>
                <th>${isArabic ? "الإجمالي" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              ${filteredItems.map((item: any, idx: number) => {
                const unitPrice = parseFloat(item.unit_price) || parseFloat(item.rate) || parseFloat(item.ai_rate) || 0;
                const quantity = parseFloat(item.quantity) || 0;
                const displayPrice = unitPrice;
                const displayTotal = parseFloat(item.total_price) || (displayPrice * quantity) || 0;
                
                return `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.description || '-'}</td>
                  <td>${quantity > 0 ? quantity.toLocaleString('en-US') : '-'}</td>
                  <td>${item.unit || '-'}</td>
                  <td>${displayPrice > 0 ? displayPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                  <td>${displayTotal > 0 ? displayTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                </tr>
              `;
              }).join('')}
              <tr class="total-row">
                <td colspan="5">${isArabic ? "الإجمالي الكلي" : "Grand Total"}</td>
                <td>${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="margin-top: 30px; padding: 15px; background: #f8fafc; border-radius: 8px; font-size: 11px; color: #64748b;">
            <strong>${isArabic ? "ملاحظة:" : "Note:"}</strong>
            ${isArabic 
              ? "تم استثناء البنود ذات الكمية صفر من هذا التقرير."
              : "Items with zero quantity are excluded from this report."}
          </div>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
    
    toast.success(isArabic ? "جاري الطباعة..." : "Printing...");
  };

  const isButtonDisabled = !selectedProjectId || !hasData || isLoadingItems;

  const exportCards = [
    {
      title: isArabic ? "التقرير الشامل" : "Comprehensive Report",
      description: isArabic 
        ? "تقرير PDF شامل يتضمن جميع بيانات المشروع" 
        : "Full PDF report including all project data",
      icon: FileDown,
      actions: (
        <Button 
          type="button"
          onClick={() => handleExportComprehensivePDF()}
          disabled={isButtonDisabled}
          className="bg-primary hover:bg-primary/90 relative z-10 pointer-events-auto"
        >
          <FileDown className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
          PDF
        </Button>
      ),
    },
    {
      title: isArabic ? "تقرير قابل للطباعة" : "Printable Report",
      description: isArabic 
        ? "فتح نافذة طباعة مع تنسيق جاهز للطباعة" 
        : "Open print preview with print-ready format",
      icon: Printer,
      actions: (
        <Button 
          type="button"
          onClick={() => handlePrintReport()}
          disabled={isButtonDisabled}
          variant="outline"
          className="relative z-10 pointer-events-auto"
        >
          <Printer className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
          {isArabic ? "طباعة" : "Print"}
        </Button>
      ),
    },
    {
      title: isArabic ? "جدول الكميات" : "Bill of Quantities",
      description: isArabic 
        ? "تصدير جميع بنود BOQ مع الأسعار إلى Excel" 
        : "Export all BOQ items with prices to Excel",
      icon: FileSpreadsheet,
      actions: (
        <Button 
          type="button"
          onClick={() => handleExportBOQ()}
          disabled={isButtonDisabled}
          className="bg-success hover:bg-success/90 relative z-10 pointer-events-auto"
        >
          <Download className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
          Excel
        </Button>
      ),
    },
    {
      title: isArabic ? "جدول الكميات المحسن" : "Enhanced BOQ",
      description: isArabic 
        ? "تصدير محسن مع المجاميع الفرعية ودعم اللغتين" 
        : "Enhanced export with subtotals and bilingual support",
      icon: Languages,
      actions: (
        <div className="flex gap-2 relative z-10 pointer-events-auto">
          <Button 
            type="button"
            onClick={() => handleExportEnhancedBOQ('en')}
            disabled={isButtonDisabled}
            variant="outline"
            size="sm"
          >
            EN
          </Button>
          <Button 
            type="button"
            onClick={() => handleExportEnhancedBOQ('ar')}
            disabled={isButtonDisabled}
            variant="outline"
            size="sm"
          >
            AR
          </Button>
          <Button 
            type="button"
            onClick={() => handleExportEnhancedBOQ('both')}
            disabled={isButtonDisabled}
            className="bg-success hover:bg-success/90"
            size="sm"
          >
            {isArabic ? "كلاهما" : "Both"}
          </Button>
        </div>
      ),
    },
    {
      title: isArabic ? "ملخص العطاء" : "Tender Summary",
      description: isArabic 
        ? "تصدير ملخص التسعير الكامل" 
        : "Export full pricing summary",
      icon: FileText,
      actions: (
        <div className="flex gap-2 relative z-10 pointer-events-auto">
          <Button 
            type="button"
            onClick={() => handleExportTenderSummary('pdf')}
            disabled={isButtonDisabled}
            className="bg-primary hover:bg-primary/90"
            size="sm"
          >
            PDF
          </Button>
          <Button 
            type="button"
            onClick={() => handleExportTenderSummary('excel')}
            disabled={isButtonDisabled}
            variant="outline"
            size="sm"
          >
            Excel
          </Button>
        </div>
      ),
    },
    {
      title: isArabic ? "تحليل الأسعار" : "Price Analysis",
      description: isArabic 
        ? "تصدير تحليل الأسعار التفصيلي إلى Excel" 
        : "Export detailed price analysis to Excel",
      icon: FileSpreadsheet,
      actions: (
        <div className="flex gap-2 relative z-10 pointer-events-auto">
          <Button 
            type="button"
            onClick={() => handleViewPriceAnalysis()}
            disabled={isButtonDisabled}
            variant="outline"
            size="sm"
          >
            <Eye className={`h-4 w-4 ${isArabic ? 'ml-1' : 'mr-1'}`} />
            {isArabic ? "عرض" : "View"}
          </Button>
          <Button 
            type="button"
            onClick={() => handleExportPriceAnalysis()}
            disabled={isButtonDisabled}
            className="bg-success hover:bg-success/90"
            size="sm"
          >
            Excel
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Project Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">
              {isArabic ? "اختر المشروع:" : "Select Project:"}
            </label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder={isArabic ? "اختر المشروع" : "Choose Project"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportCards.map((card, index) => (
          <Card key={index} className="border-border">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <card.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{card.title}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {card.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex justify-end relative z-10">
                {card.actions}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!selectedProjectId && (
        <p className="text-center text-muted-foreground text-sm">
          {isArabic ? "الرجاء اختيار مشروع للتصدير" : "Please select a project to export"}
        </p>
      )}

      {selectedProjectId && isLoadingItems && (
        <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{isArabic ? "جاري تحميل بيانات المشروع..." : "Loading project data..."}</span>
        </div>
      )}

      {selectedProjectId && !isLoadingItems && !hasData && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            {isArabic 
              ? "هذا المشروع لا يحتوي على بيانات BOQ للتصدير. تأكد من تحليل الملف أولاً." 
              : "This project has no BOQ data to export. Make sure to analyze the file first."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
