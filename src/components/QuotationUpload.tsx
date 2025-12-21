import { useState, useCallback, useEffect } from "react";
import { Upload, FileText, Trash2, Eye, Loader2, FileSpreadsheet, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface QuotationItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface QuotationAnalysis {
  supplier?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  quotation_info?: {
    number?: string;
    date?: string;
    validity?: string;
    payment_terms?: string;
  };
  items?: QuotationItem[];
  totals?: {
    subtotal?: number;
    tax?: number;
    tax_percentage?: number;
    discount?: number;
    grand_total?: number;
  };
  notes?: string[];
  summary?: string;
}

interface Quotation {
  id: string;
  name: string;
  file_name: string;
  file_url: string;
  file_type: string;
  supplier_name?: string;
  quotation_date?: string;
  total_amount?: number;
  currency: string;
  status: string;
  ai_analysis?: QuotationAnalysis;
  created_at: string;
}

interface QuotationUploadProps {
  projectId?: string;
  onQuotationUploaded?: (quotation: Quotation) => void;
}

export function QuotationUpload({ projectId, onQuotationUploaded }: QuotationUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    supplier_name: "",
    quotation_date: "",
    total_amount: "",
  });

  const loadQuotations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('price_quotations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse ai_analysis if it's a string
      const parsed = (data || []).map(q => ({
        ...q,
        ai_analysis: typeof q.ai_analysis === 'string' 
          ? JSON.parse(q.ai_analysis) 
          : q.ai_analysis
      }));
      
      setQuotations(parsed);
    } catch (error) {
      console.error("Error loading quotations:", error);
    }
  }, [user]);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول لرفع عروض الأسعار",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "نوع ملف غير صالح",
        description: "يرجى رفع ملفات PDF أو Excel فقط",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "حجم الملف كبير جداً",
        description: "الحد الأقصى لحجم الملف هو 10 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('quotations')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('quotations')
        .getPublicUrl(fileName);

      // Save to database
      const { data: quotation, error: dbError } = await supabase
        .from('price_quotations')
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          name: formData.name || file.name.replace(/\.[^/.]+$/, ""),
          file_name: file.name,
          file_url: publicUrl,
          file_type: fileExt === 'pdf' ? 'pdf' : 'excel',
          supplier_name: formData.supplier_name || null,
          quotation_date: formData.quotation_date || null,
          total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null,
          status: 'pending',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      const newQuotation: Quotation = {
        ...quotation,
        ai_analysis: quotation.ai_analysis as QuotationAnalysis | undefined
      };
      setQuotations(prev => [newQuotation, ...prev]);
      onQuotationUploaded?.(newQuotation);
      
      // Reset form
      setFormData({
        name: "",
        supplier_name: "",
        quotation_date: "",
        total_amount: "",
      });

      toast({
        title: "تم الرفع بنجاح",
        description: `تم رفع عرض السعر "${file.name}"`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "خطأ في الرفع",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء رفع الملف",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  }, [user, projectId, formData, toast, onQuotationUploaded]);

  const analyzeQuotation = async (quotation: Quotation) => {
    if (!user) return;

    setAnalyzingId(quotation.id);

    try {
      toast({
        title: "جاري التحليل...",
        description: "يتم تحليل عرض السعر باستخدام الذكاء الاصطناعي",
      });

      // For now, we'll use a sample text - in production you'd extract text from the file
      const sampleText = `
        عرض سعر رقم: ${quotation.name}
        المورد: ${quotation.supplier_name || 'غير محدد'}
        التاريخ: ${quotation.quotation_date || new Date().toISOString().split('T')[0]}
        المبلغ الإجمالي: ${quotation.total_amount || 0} ${quotation.currency}
        
        هذا نموذج لعرض سعر يحتاج لتحليل محتوى الملف الفعلي.
        يرجى رفع ملف يحتوي على بيانات قابلة للقراءة.
      `;

      const { data, error } = await supabase.functions.invoke('analyze-quotation', {
        body: {
          quotationText: sampleText,
          quotationName: quotation.name,
          supplierName: quotation.supplier_name
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Update quotation with analysis
      const { error: updateError } = await supabase
        .from('price_quotations')
        .update({
          ai_analysis: data.analysis,
          status: 'analyzed',
          total_amount: data.analysis?.totals?.grand_total || quotation.total_amount
        })
        .eq('id', quotation.id);

      if (updateError) throw updateError;

      // Update local state
      setQuotations(prev => prev.map(q => 
        q.id === quotation.id 
          ? { 
              ...q, 
              ai_analysis: data.analysis as QuotationAnalysis, 
              status: 'analyzed',
              total_amount: data.analysis?.totals?.grand_total || q.total_amount
            } 
          : q
      ));

      setExpandedId(quotation.id);

      toast({
        title: "تم التحليل بنجاح",
        description: `تم استخراج ${data.analysis?.items?.length || 0} بند من العرض`,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "خطأ في التحليل",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء التحليل",
        variant: "destructive",
      });
    } finally {
      setAnalyzingId(null);
    }
  };

  const deleteQuotation = async (quotation: Quotation) => {
    if (!user) return;

    try {
      // Delete from storage
      const filePath = quotation.file_url.split('/quotations/')[1];
      if (filePath) {
        await supabase.storage.from('quotations').remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('price_quotations')
        .delete()
        .eq('id', quotation.id);

      if (error) throw error;

      setQuotations(prev => prev.filter(q => q.id !== quotation.id));
      
      toast({
        title: "تم الحذف",
        description: "تم حذف عرض السعر بنجاح",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ أثناء حذف الملف",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-5 h-5" />
            رفع عرض سعر جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم العرض</Label>
              <Input
                id="name"
                placeholder="مثال: عرض سعر المواد"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">اسم المورد</Label>
              <Input
                id="supplier"
                placeholder="مثال: شركة ABC للمقاولات"
                value={formData.supplier_name}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">تاريخ العرض</Label>
              <Input
                id="date"
                type="date"
                value={formData.quotation_date}
                onChange={(e) => setFormData(prev => ({ ...prev, quotation_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">المبلغ الإجمالي (اختياري)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.total_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
              />
            </div>
          </div>

          {/* File Upload Area */}
          <div className="relative">
            <input
              type="file"
              accept=".pdf,.xls,.xlsx"
              onChange={handleFileUpload}
              disabled={isUploading || !user}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-colors
              ${isUploading ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              ${!user ? 'opacity-50' : ''}
            `}>
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">جاري رفع الملف...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-3">
                    <FileText className="w-10 h-10 text-red-500" />
                    <FileSpreadsheet className="w-10 h-10 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">اسحب الملف هنا أو انقر للاختيار</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      PDF أو Excel • الحد الأقصى 10 ميجابايت
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!user && (
            <p className="text-sm text-amber-600 text-center">
              يرجى تسجيل الدخول لرفع عروض الأسعار
            </p>
          )}
        </CardContent>
      </Card>

      {/* Uploaded Quotations List */}
      {quotations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">عروض الأسعار المرفوعة ({quotations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quotations.map((quotation) => (
                <Collapsible
                  key={quotation.id}
                  open={expandedId === quotation.id}
                  onOpenChange={(open) => setExpandedId(open ? quotation.id : null)}
                >
                  <div className="rounded-lg border border-border hover:border-primary/30 transition-colors overflow-hidden">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className={`
                          w-10 h-10 rounded-lg flex items-center justify-center
                          ${quotation.file_type === 'pdf' ? 'bg-red-500/10' : 'bg-green-500/10'}
                        `}>
                          {quotation.file_type === 'pdf' ? (
                            <FileText className="w-5 h-5 text-red-500" />
                          ) : (
                            <FileSpreadsheet className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{quotation.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {quotation.supplier_name && (
                              <span className="text-xs text-muted-foreground">
                                {quotation.supplier_name}
                              </span>
                            )}
                            {quotation.total_amount && (
                              <Badge variant="outline" className="text-xs">
                                {quotation.total_amount.toLocaleString()} {quotation.currency}
                              </Badge>
                            )}
                            <Badge 
                              variant={quotation.status === 'analyzed' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {quotation.status === 'analyzed' ? 'تم التحليل' : 'قيد الانتظار'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => analyzeQuotation(quotation)}
                          disabled={analyzingId === quotation.id}
                          className="gap-1"
                        >
                          {analyzingId === quotation.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          تحليل AI
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(quotation.file_url, '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteQuotation(quotation)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {quotation.ai_analysis && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon">
                              {expandedId === quotation.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        )}
                      </div>
                    </div>

                    {/* Analysis Results */}
                    <CollapsibleContent>
                      {quotation.ai_analysis && (
                        <div className="border-t border-border p-4 bg-muted/30 space-y-4">
                          {/* Summary */}
                          {quotation.ai_analysis.summary && (
                            <div className="p-3 bg-primary/5 rounded-lg">
                              <p className="text-sm">{quotation.ai_analysis.summary}</p>
                            </div>
                          )}

                          {/* Supplier & Quotation Info */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {quotation.ai_analysis.supplier && (
                              <div className="space-y-1">
                                <h5 className="text-sm font-medium">معلومات المورد</h5>
                                <div className="text-sm text-muted-foreground space-y-0.5">
                                  {quotation.ai_analysis.supplier.name && <p>الاسم: {quotation.ai_analysis.supplier.name}</p>}
                                  {quotation.ai_analysis.supplier.phone && <p>الهاتف: {quotation.ai_analysis.supplier.phone}</p>}
                                  {quotation.ai_analysis.supplier.email && <p>البريد: {quotation.ai_analysis.supplier.email}</p>}
                                </div>
                              </div>
                            )}
                            {quotation.ai_analysis.quotation_info && (
                              <div className="space-y-1">
                                <h5 className="text-sm font-medium">معلومات العرض</h5>
                                <div className="text-sm text-muted-foreground space-y-0.5">
                                  {quotation.ai_analysis.quotation_info.number && <p>رقم العرض: {quotation.ai_analysis.quotation_info.number}</p>}
                                  {quotation.ai_analysis.quotation_info.date && <p>التاريخ: {quotation.ai_analysis.quotation_info.date}</p>}
                                  {quotation.ai_analysis.quotation_info.validity && <p>الصلاحية: {quotation.ai_analysis.quotation_info.validity}</p>}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Items Table */}
                          {quotation.ai_analysis.items && quotation.ai_analysis.items.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-2">البنود ({quotation.ai_analysis.items.length})</h5>
                              <div className="rounded-lg border overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-right w-12">#</TableHead>
                                      <TableHead className="text-right">الوصف</TableHead>
                                      <TableHead className="text-right w-20">الوحدة</TableHead>
                                      <TableHead className="text-right w-20">الكمية</TableHead>
                                      <TableHead className="text-right w-24">السعر</TableHead>
                                      <TableHead className="text-right w-24">الإجمالي</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {quotation.ai_analysis.items.map((item, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell className="font-mono text-xs">{item.item_number || idx + 1}</TableCell>
                                        <TableCell className="text-sm">{item.description}</TableCell>
                                        <TableCell className="text-sm">{item.unit}</TableCell>
                                        <TableCell className="text-sm">{item.quantity}</TableCell>
                                        <TableCell className="text-sm">{item.unit_price?.toLocaleString()}</TableCell>
                                        <TableCell className="font-medium">{item.total?.toLocaleString()}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}

                          {/* Totals */}
                          {quotation.ai_analysis.totals && (
                            <div className="flex justify-end">
                              <div className="w-64 space-y-1 text-sm">
                                {quotation.ai_analysis.totals.subtotal !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">المجموع الفرعي:</span>
                                    <span>{quotation.ai_analysis.totals.subtotal.toLocaleString()}</span>
                                  </div>
                                )}
                                {quotation.ai_analysis.totals.tax !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      الضريبة {quotation.ai_analysis.totals.tax_percentage ? `(${quotation.ai_analysis.totals.tax_percentage}%)` : ''}:
                                    </span>
                                    <span>{quotation.ai_analysis.totals.tax.toLocaleString()}</span>
                                  </div>
                                )}
                                {quotation.ai_analysis.totals.discount !== undefined && quotation.ai_analysis.totals.discount > 0 && (
                                  <div className="flex justify-between text-success">
                                    <span>الخصم:</span>
                                    <span>-{quotation.ai_analysis.totals.discount.toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-bold pt-1 border-t">
                                  <span>الإجمالي:</span>
                                  <span>{quotation.ai_analysis.totals.grand_total?.toLocaleString()} {quotation.currency}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {quotation.ai_analysis.notes && quotation.ai_analysis.notes.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-1">ملاحظات</h5>
                              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
                                {quotation.ai_analysis.notes.map((note, idx) => (
                                  <li key={idx}>{note}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
