import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Check, X, AlertCircle, Download, Trash2 } from 'lucide-react';
import { readExcelFile, worksheetToJson } from '@/lib/exceljs-utils';

interface ReferencePrice {
  category: string;
  item_name: string;
  item_name_ar?: string;
  unit: string;
  min_price: number;
  max_price: number;
  keywords?: string;
  location?: string;
  year?: number;
  isValid?: boolean;
  validationErrors?: string[];
}

const ReferencePriceImporter: React.FC = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ReferencePrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error(isArabic ? 'يرجى اختيار ملف Excel' : 'Please select an Excel file');
      return;
    }

    setFile(selectedFile);
    setErrors([]);
    await parseExcelFile(selectedFile);
  };

  const parseExcelFile = async (file: File) => {
    setIsLoading(true);
    try {
      const workbook = await readExcelFile(file);
      const sheetName = workbook.worksheets[0]?.name;
      
      if (!sheetName) {
        throw new Error(isArabic ? 'الملف فارغ' : 'File is empty');
      }

      const worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) {
        throw new Error(isArabic ? 'لم يتم العثور على ورقة العمل' : 'Worksheet not found');
      }

      const jsonData = worksheetToJson(worksheet);
      
      // Map and validate data
      const mappedData: ReferencePrice[] = jsonData.map((row: any) => {
        const item: ReferencePrice = {
          category: String(row['Category'] || row['الفئة'] || '').trim(),
          item_name: String(row['Item'] || row['Item Name'] || row['البند'] || row['اسم البند'] || '').trim(),
          item_name_ar: String(row['Item (AR)'] || row['البند عربي'] || '').trim() || undefined,
          unit: String(row['Unit'] || row['الوحدة'] || '').trim(),
          min_price: parseFloat(row['Min Price'] || row['أقل سعر'] || row['الحد الأدنى'] || 0),
          max_price: parseFloat(row['Max Price'] || row['أعلى سعر'] || row['الحد الأقصى'] || 0),
          keywords: String(row['Keywords'] || row['الكلمات المفتاحية'] || '').trim() || undefined,
          location: String(row['Location'] || row['الموقع'] || '').trim() || undefined,
          year: parseInt(row['Year'] || row['السنة'] || new Date().getFullYear()),
          isValid: true,
          validationErrors: []
        };

        // Validate
        if (!item.category) {
          item.isValid = false;
          item.validationErrors?.push(isArabic ? 'الفئة مطلوبة' : 'Category required');
        }
        if (!item.item_name) {
          item.isValid = false;
          item.validationErrors?.push(isArabic ? 'اسم البند مطلوب' : 'Item name required');
        }
        if (!item.unit) {
          item.isValid = false;
          item.validationErrors?.push(isArabic ? 'الوحدة مطلوبة' : 'Unit required');
        }
        if (isNaN(item.min_price) || item.min_price < 0) {
          item.isValid = false;
          item.validationErrors?.push(isArabic ? 'الحد الأدنى غير صالح' : 'Invalid min price');
        }
        if (isNaN(item.max_price) || item.max_price < 0) {
          item.isValid = false;
          item.validationErrors?.push(isArabic ? 'الحد الأقصى غير صالح' : 'Invalid max price');
        }
        if (item.min_price > item.max_price) {
          item.isValid = false;
          item.validationErrors?.push(isArabic ? 'الحد الأدنى أكبر من الأقصى' : 'Min > Max');
        }

        return item;
      });

      setPreviewData(mappedData);

      const invalidCount = mappedData.filter(d => !d.isValid).length;
      if (invalidCount > 0) {
        setErrors([
          isArabic 
            ? `${invalidCount} بند يحتوي على أخطاء في التحقق` 
            : `${invalidCount} items have validation errors`
        ]);
      }

      toast.success(
        isArabic 
          ? `تم تحليل ${mappedData.length} بند` 
          : `Parsed ${mappedData.length} items`
      );
    } catch (error: any) {
      console.error('Error parsing file:', error);
      toast.error(error.message || (isArabic ? 'خطأ في قراءة الملف' : 'Error reading file'));
      setErrors([error.message]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!user) {
      toast.error(isArabic ? 'يرجى تسجيل الدخول' : 'Please login first');
      return;
    }

    const validItems = previewData.filter(d => d.isValid);
    if (validItems.length === 0) {
      toast.error(isArabic ? 'لا توجد بنود صالحة للاستيراد' : 'No valid items to import');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      const batchSize = 50;
      let imported = 0;

      for (let i = 0; i < validItems.length; i += batchSize) {
        const batch = validItems.slice(i, i + batchSize).map(item => ({
          category: item.category,
          item_name: item.item_name,
          item_name_ar: item.item_name_ar || null,
          unit: item.unit,
          min_price: item.min_price,
          max_price: item.max_price,
          keywords: item.keywords ? item.keywords.split(',').map(k => k.trim()) : null,
          location: item.location || null,
          year: item.year || new Date().getFullYear(),
          user_id: user.id
        }));

        const { error } = await supabase
          .from('reference_prices')
          .insert(batch);

        if (error) throw error;

        imported += batch.length;
        setImportProgress(Math.round((imported / validItems.length) * 100));
      }

      toast.success(
        isArabic 
          ? `تم استيراد ${imported} بند بنجاح` 
          : `Successfully imported ${imported} items`
      );

      // Reset state
      setFile(null);
      setPreviewData([]);
      setErrors([]);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || (isArabic ? 'خطأ في الاستيراد' : 'Import error'));
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const downloadTemplate = () => {
    const templateContent = `Category,Item,Item (AR),Unit,Min Price,Max Price,Keywords,Location,Year
CIVIL,Excavation,حفر عام,M3,25,45,"excavation,حفر",Riyadh,${new Date().getFullYear()}
CIVIL,Concrete C30/37,خرسانة جاهزة,M3,350,450,"concrete,خرسانة",Riyadh,${new Date().getFullYear()}
CIVIL,Reinforcement Steel,حديد تسليح,TON,2800,3200,"rebar,steel,حديد",Riyadh,${new Date().getFullYear()}
MEP,Electrical Wiring,أسلاك كهربائية,M,15,25,"wiring,كهرباء",Riyadh,${new Date().getFullYear()}
MEP,PVC Pipes 4",مواسير بي في سي,M,20,35,"pipes,مواسير",Riyadh,${new Date().getFullYear()}
ARCHITECTURAL,Ceramic Tiles,بلاط سيراميك,M2,45,80,"tiles,بلاط",Riyadh,${new Date().getFullYear()}`;

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'reference_prices_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const removeItem = (index: number) => {
    setPreviewData(prev => prev.filter((_, i) => i !== index));
  };

  const validCount = previewData.filter(d => d.isValid).length;
  const invalidCount = previewData.filter(d => !d.isValid).length;

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {isArabic ? 'استيراد الأسعار المرجعية' : 'Import Reference Prices'}
          </CardTitle>
          <CardDescription>
            {isArabic 
              ? 'قم برفع ملف Excel يحتوي على أسعار السوق المرجعية' 
              : 'Upload an Excel file containing market reference prices'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={isLoading || isImporting}
                className="cursor-pointer"
              />
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              {isArabic ? 'تحميل القالب' : 'Download Template'}
            </Button>
          </div>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <span className="font-medium">{file.name}</span>
              <Badge variant="outline">{(file.size / 1024).toFixed(1)} KB</Badge>
            </div>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {isArabic ? 'معاينة البيانات' : 'Data Preview'}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-700">
                  {isArabic ? `${validCount} صالح` : `${validCount} valid`}
                </Badge>
                {invalidCount > 0 && (
                  <Badge className="bg-red-500/20 text-red-700">
                    {isArabic ? `${invalidCount} خاطئ` : `${invalidCount} invalid`}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{isArabic ? 'الفئة' : 'Category'}</TableHead>
                    <TableHead>{isArabic ? 'البند' : 'Item'}</TableHead>
                    <TableHead>{isArabic ? 'الوحدة' : 'Unit'}</TableHead>
                    <TableHead className="text-center">{isArabic ? 'الحد الأدنى' : 'Min'}</TableHead>
                    <TableHead className="text-center">{isArabic ? 'الحد الأقصى' : 'Max'}</TableHead>
                    <TableHead>{isArabic ? 'الموقع' : 'Location'}</TableHead>
                    <TableHead className="text-center">{isArabic ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((item, index) => (
                    <TableRow key={index} className={!item.isValid ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                      <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.item_name}</p>
                          {item.item_name_ar && (
                            <p className="text-xs text-muted-foreground">{item.item_name_ar}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-center font-mono">
                        {item.min_price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {item.max_price.toLocaleString()}
                      </TableCell>
                      <TableCell>{item.location || '-'}</TableCell>
                      <TableCell className="text-center">
                        {item.isValid ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <X className="h-5 w-5 text-red-600" />
                            <span className="text-xs text-red-600">
                              {item.validationErrors?.[0]}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {isImporting && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{isArabic ? 'جاري الاستيراد...' : 'Importing...'}</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setPreviewData([]);
                  setErrors([]);
                }}
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || validCount === 0}
                className="min-w-[120px]"
              >
                {isImporting ? (
                  <span className="animate-pulse">{isArabic ? 'جاري الاستيراد...' : 'Importing...'}</span>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {isArabic ? `استيراد ${validCount} بند` : `Import ${validCount} Items`}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Format Guide */}
      <Card>
        <CardHeader>
          <CardTitle>{isArabic ? 'تنسيق الملف المطلوب' : 'Required File Format'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Item (AR)</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Min Price</TableHead>
                  <TableHead>Max Price</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>CIVIL</TableCell>
                  <TableCell>Excavation</TableCell>
                  <TableCell>حفر عام</TableCell>
                  <TableCell>M3</TableCell>
                  <TableCell>25</TableCell>
                  <TableCell>45</TableCell>
                  <TableCell>excavation,حفر</TableCell>
                  <TableCell>Riyadh</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {isArabic 
              ? 'الأعمدة المطلوبة: Category, Item, Unit, Min Price, Max Price' 
              : 'Required columns: Category, Item, Unit, Min Price, Max Price'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferencePriceImporter;
