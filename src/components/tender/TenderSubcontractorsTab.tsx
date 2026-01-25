import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Trash2, Edit, Building2, FileText, DollarSign, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TenderSubcontractor {
  id: string;
  subcontractorId: string;
  subcontractorName: string;
  linkedItems: string[];
  scope: string;
  contractValue: number;
  paymentTerms: string;
  retentionPercentage: number;
  status: 'draft' | 'negotiating' | 'confirmed' | 'signed';
}

interface ProjectItem {
  itemNumber: string;
  description: string;
  totalPrice: number;
}

interface TenderSubcontractorsTabProps {
  projectId: string;
  initialData?: TenderSubcontractor[];
  projectItems?: ProjectItem[];
  contractValue: number;
  currency?: string;
  onDataChange: (data: TenderSubcontractor[], total: number) => void;
}

const TenderSubcontractorsTab = ({
  projectId,
  initialData = [],
  projectItems = [],
  contractValue,
  currency = "SAR",
  onDataChange
}: TenderSubcontractorsTabProps) => {
  const { isArabic: isRTL } = useLanguage();
  const [subcontractors, setSubcontractors] = useState<TenderSubcontractor[]>(initialData);
  const [availableSubcontractors, setAvailableSubcontractors] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<TenderSubcontractor | null>(null);
  const [formData, setFormData] = useState<Partial<TenderSubcontractor>>({
    subcontractorId: "",
    subcontractorName: "",
    linkedItems: [],
    scope: "",
    contractValue: 0,
    paymentTerms: "",
    retentionPercentage: 5,
    status: 'draft'
  });

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setSubcontractors(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    loadAvailableSubcontractors();
  }, []);

  const loadAvailableSubcontractors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('subcontractors')
        .select('id, name, specialty, status')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      setAvailableSubcontractors(data || []);
    } catch (error) {
      console.error('Error loading subcontractors:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalSubcontractorsCost = subcontractors.reduce((sum, s) => sum + (s.contractValue || 0), 0);
  const subcontractorsPercentage = contractValue > 0 ? (totalSubcontractorsCost / contractValue) * 100 : 0;
  const linkedItemsCount = new Set(subcontractors.flatMap(s => s.linkedItems)).size;

  const handleSave = () => {
    if (!formData.subcontractorName || !formData.contractValue) {
      toast.error(isRTL ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields");
      return;
    }

    let updatedList: TenderSubcontractor[];

    if (editingItem) {
      updatedList = subcontractors.map(s => 
        s.id === editingItem.id ? { ...s, ...formData } as TenderSubcontractor : s
      );
    } else {
      const newItem: TenderSubcontractor = {
        id: `sub-${Date.now()}`,
        subcontractorId: formData.subcontractorId || "",
        subcontractorName: formData.subcontractorName || "",
        linkedItems: formData.linkedItems || [],
        scope: formData.scope || "",
        contractValue: formData.contractValue || 0,
        paymentTerms: formData.paymentTerms || "",
        retentionPercentage: formData.retentionPercentage || 5,
        status: formData.status || 'draft'
      };
      updatedList = [...subcontractors, newItem];
    }

    setSubcontractors(updatedList);
    const total = updatedList.reduce((sum, s) => sum + (s.contractValue || 0), 0);
    onDataChange(updatedList, total);
    
    setShowAddDialog(false);
    setEditingItem(null);
    resetForm();
    toast.success(isRTL ? "تم الحفظ بنجاح" : "Saved successfully");
  };

  const handleDelete = (id: string) => {
    const updatedList = subcontractors.filter(s => s.id !== id);
    setSubcontractors(updatedList);
    const total = updatedList.reduce((sum, s) => sum + (s.contractValue || 0), 0);
    onDataChange(updatedList, total);
    toast.success(isRTL ? "تم الحذف بنجاح" : "Deleted successfully");
  };

  const handleEdit = (item: TenderSubcontractor) => {
    setEditingItem(item);
    setFormData(item);
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({
      subcontractorId: "",
      subcontractorName: "",
      linkedItems: [],
      scope: "",
      contractValue: 0,
      paymentTerms: "",
      retentionPercentage: 5,
      status: 'draft'
    });
  };

  const handleSubcontractorSelect = (id: string) => {
    const selected = availableSubcontractors.find(s => s.id === id);
    if (selected) {
      setFormData({
        ...formData,
        subcontractorId: id,
        subcontractorName: selected.name
      });
    }
  };

  const handleItemToggle = (itemNumber: string, checked: boolean) => {
    const currentItems = formData.linkedItems || [];
    if (checked) {
      setFormData({ ...formData, linkedItems: [...currentItems, itemNumber] });
    } else {
      setFormData({ ...formData, linkedItems: currentItems.filter(i => i !== itemNumber) });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: isRTL ? "مسودة" : "Draft", variant: "secondary" as const },
      negotiating: { label: isRTL ? "تفاوض" : "Negotiating", variant: "outline" as const },
      confirmed: { label: isRTL ? "مؤكد" : "Confirmed", variant: "default" as const },
      signed: { label: isRTL ? "موقع" : "Signed", variant: "default" as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "عدد المقاولين" : "Subcontractors"}</p>
                <p className="text-2xl font-bold">{subcontractors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "البنود المرتبطة" : "Linked Items"}</p>
                <p className="text-2xl font-bold">{linkedItemsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي التكاليف" : "Total Costs"}</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSubcontractorsCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "من قيمة العقد" : "Of Contract Value"}</p>
                <p className="text-2xl font-bold">{subcontractorsPercentage.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {isRTL ? "مقاولو الباطن" : "Subcontractors"}
            </CardTitle>
            <Dialog open={showAddDialog} onOpenChange={(open) => {
              setShowAddDialog(open);
              if (!open) {
                setEditingItem(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-1" />
                  {isRTL ? "إضافة مقاول" : "Add Subcontractor"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem 
                      ? (isRTL ? "تعديل مقاول الباطن" : "Edit Subcontractor")
                      : (isRTL ? "إضافة مقاول باطن" : "Add Subcontractor")
                    }
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Subcontractor Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{isRTL ? "اختر من القائمة" : "Select from List"}</Label>
                      <Select 
                        value={formData.subcontractorId} 
                        onValueChange={handleSubcontractorSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isRTL ? "اختر مقاول" : "Select subcontractor"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubcontractors.map(sub => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name} - {sub.specialty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{isRTL ? "أو أدخل اسم جديد" : "Or Enter New Name"}</Label>
                      <Input
                        value={formData.subcontractorName}
                        onChange={(e) => setFormData({ ...formData, subcontractorName: e.target.value })}
                        placeholder={isRTL ? "اسم المقاول" : "Subcontractor name"}
                      />
                    </div>
                  </div>

                  {/* Scope of Work */}
                  <div>
                    <Label>{isRTL ? "نطاق العمل" : "Scope of Work"}</Label>
                    <Textarea
                      value={formData.scope}
                      onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                      placeholder={isRTL ? "وصف نطاق العمل..." : "Describe scope of work..."}
                      rows={3}
                    />
                  </div>

                  {/* Contract Details */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>{isRTL ? "قيمة العقد" : "Contract Value"}</Label>
                      <Input
                        type="number"
                        value={formData.contractValue}
                        onChange={(e) => setFormData({ ...formData, contractValue: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>{isRTL ? "نسبة الضمان المحتجز" : "Retention %"}</Label>
                      <Input
                        type="number"
                        value={formData.retentionPercentage}
                        onChange={(e) => setFormData({ ...formData, retentionPercentage: parseFloat(e.target.value) || 0 })}
                        placeholder="5"
                      />
                    </div>
                    <div>
                      <Label>{isRTL ? "الحالة" : "Status"}</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">{isRTL ? "مسودة" : "Draft"}</SelectItem>
                          <SelectItem value="negotiating">{isRTL ? "تفاوض" : "Negotiating"}</SelectItem>
                          <SelectItem value="confirmed">{isRTL ? "مؤكد" : "Confirmed"}</SelectItem>
                          <SelectItem value="signed">{isRTL ? "موقع" : "Signed"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Payment Terms */}
                  <div>
                    <Label>{isRTL ? "شروط الدفع" : "Payment Terms"}</Label>
                    <Input
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      placeholder={isRTL ? "مثال: 30 يوم من تاريخ الفاتورة" : "e.g., Net 30 days"}
                    />
                  </div>

                  {/* Linked BOQ Items */}
                  {projectItems.length > 0 && (
                    <div>
                      <Label>{isRTL ? "البنود المرتبطة" : "Linked BOQ Items"}</Label>
                      <div className="max-h-40 overflow-y-auto border rounded p-2 mt-2 space-y-2">
                        {projectItems.map((item) => (
                          <div key={item.itemNumber} className="flex items-center gap-2">
                            <Checkbox
                              id={item.itemNumber}
                              checked={(formData.linkedItems || []).includes(item.itemNumber)}
                              onCheckedChange={(checked) => handleItemToggle(item.itemNumber, checked as boolean)}
                            />
                            <label htmlFor={item.itemNumber} className="text-sm flex-1">
                              <span className="font-medium">{item.itemNumber}</span> - {item.description?.slice(0, 50)}...
                            </label>
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(item.totalPrice)} {currency}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={handleSave} className="w-full">
                    {editingItem ? (isRTL ? "تحديث" : "Update") : (isRTL ? "إضافة" : "Add")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {subcontractors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{isRTL ? "لم يتم إضافة مقاولين بعد" : "No subcontractors added yet"}</p>
              <p className="text-sm">{isRTL ? "اضغط على زر الإضافة للبدء" : "Click add button to start"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "المقاول" : "Subcontractor"}</TableHead>
                  <TableHead>{isRTL ? "البنود المرتبطة" : "Linked Items"}</TableHead>
                  <TableHead>{isRTL ? "قيمة العقد" : "Contract Value"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subcontractors.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sub.subcontractorName}</p>
                        {sub.scope && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{sub.scope}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sub.linkedItems.slice(0, 3).map((item) => (
                          <Badge key={item} variant="outline" className="text-xs">{item}</Badge>
                        ))}
                        {sub.linkedItems.length > 3 && (
                          <Badge variant="secondary" className="text-xs">+{sub.linkedItems.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(sub.contractValue)} {currency}
                    </TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(sub)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(sub.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cost Summary */}
      {subcontractors.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{isRTL ? "إجمالي تكاليف مقاولي الباطن" : "Total Subcontractor Costs"}</p>
                <p className="text-xl font-bold">{formatCurrency(totalSubcontractorsCost)} {currency}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{isRTL ? "نسبة من قيمة العقد" : "Percentage of Contract"}</p>
                <p className="text-xl font-bold">{subcontractorsPercentage.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">{isRTL ? "البنود المغطاة" : "Items Covered"}</p>
                <p className="text-xl font-bold">
                  {linkedItemsCount} {isRTL ? "من" : "of"} {projectItems.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TenderSubcontractorsTab;
