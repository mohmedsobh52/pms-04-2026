import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Plus, Phone, Mail, Star, Building2, FileText, 
  Trash2, Edit, CheckCircle, Clock, AlertTriangle, TrendingUp 
} from "lucide-react";

interface Subcontractor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  license_number: string | null;
  rating: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Assignment {
  id: string;
  subcontractor_id: string;
  project_id: string | null;
  scope_of_work: string | null;
  contract_value: number | null;
  start_date: string | null;
  end_date: string | null;
  progress_percentage: number;
  status: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
}

export function SubcontractorManagement() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<Subcontractor | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    license_number: "",
    notes: ""
  });

  const [assignmentData, setAssignmentData] = useState({
    subcontractor_id: "",
    scope_of_work: "",
    contract_value: "",
    start_date: "",
    end_date: "",
    status: "pending"
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subRes, assignRes] = await Promise.all([
        supabase.from("subcontractors").select("*").order("created_at", { ascending: false }),
        supabase.from("subcontractor_assignments").select("*").order("created_at", { ascending: false })
      ]);

      if (subRes.data) setSubcontractors(subRes.data);
      if (assignRes.data) setAssignments(assignRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubcontractor = async () => {
    if (!user || !formData.name) return;

    try {
      const { data, error } = await supabase.from("subcontractors").insert({
        user_id: user.id,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        specialty: formData.specialty || null,
        license_number: formData.license_number || null,
        notes: formData.notes || null,
        status: "active"
      }).select().single();

      if (error) throw error;

      setSubcontractors(prev => [data, ...prev]);
      setShowAddDialog(false);
      setFormData({ name: "", email: "", phone: "", specialty: "", license_number: "", notes: "" });
      
      toast({
        title: isArabic ? "تمت الإضافة" : "Added",
        description: isArabic ? "تم إضافة المقاول الفرعي بنجاح" : "Subcontractor added successfully"
      });
    } catch (error) {
      console.error("Error adding subcontractor:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في إضافة المقاول" : "Failed to add subcontractor",
        variant: "destructive"
      });
    }
  };

  const handleUpdateProgress = async (assignmentId: string, newProgress: number) => {
    try {
      const { error } = await supabase
        .from("subcontractor_assignments")
        .update({ 
          progress_percentage: newProgress,
          status: newProgress >= 100 ? "completed" : "in_progress"
        })
        .eq("id", assignmentId);

      if (error) throw error;

      setAssignments(prev => prev.map(a => 
        a.id === assignmentId 
          ? { ...a, progress_percentage: newProgress, status: newProgress >= 100 ? "completed" : "in_progress" } 
          : a
      ));

      toast({
        title: isArabic ? "تم التحديث" : "Updated",
        description: isArabic ? "تم تحديث التقدم" : "Progress updated"
      });
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const handleDeleteSubcontractor = async (id: string) => {
    try {
      const { error } = await supabase.from("subcontractors").delete().eq("id", id);
      if (error) throw error;
      
      setSubcontractors(prev => prev.filter(s => s.id !== id));
      toast({
        title: isArabic ? "تم الحذف" : "Deleted",
        description: isArabic ? "تم حذف المقاول الفرعي" : "Subcontractor deleted"
      });
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleAddAssignment = async () => {
    if (!assignmentData.subcontractor_id) return;

    try {
      const { data, error } = await supabase.from("subcontractor_assignments").insert({
        subcontractor_id: assignmentData.subcontractor_id,
        scope_of_work: assignmentData.scope_of_work || null,
        contract_value: assignmentData.contract_value ? parseFloat(assignmentData.contract_value) : null,
        start_date: assignmentData.start_date || null,
        end_date: assignmentData.end_date || null,
        status: assignmentData.status,
        progress_percentage: 0,
        payment_status: "pending"
      }).select().single();

      if (error) throw error;

      setAssignments(prev => [data, ...prev]);
      setShowAssignmentDialog(false);
      setAssignmentData({ subcontractor_id: "", scope_of_work: "", contract_value: "", start_date: "", end_date: "", status: "pending" });
      
      toast({
        title: isArabic ? "تم إنشاء المهمة" : "Assignment Created",
        description: isArabic ? "تم إسناد العمل للمقاول" : "Work assigned to subcontractor"
      });
    } catch (error) {
      console.error("Error adding assignment:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      pending: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
      in_progress: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: TrendingUp },
      completed: { color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle },
      delayed: { color: "bg-red-500/10 text-red-600 border-red-500/20", icon: AlertTriangle }
    };
    const { color, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant="outline" className={`gap-1 ${color}`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  // Stats calculation
  const totalSubcontractors = subcontractors.length;
  const activeAssignments = assignments.filter(a => a.status === "in_progress").length;
  const completedAssignments = assignments.filter(a => a.status === "completed").length;
  const totalContractValue = assignments.reduce((sum, a) => sum + (a.contract_value || 0), 0);

  if (!user) {
    return (
      <Card className="p-8 text-center">
        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {isArabic ? "يرجى تسجيل الدخول لإدارة المقاولين الفرعيين" : "Please login to manage subcontractors"}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSubcontractors}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "مقاولين" : "Subcontractors"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeAssignments}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "جاري التنفيذ" : "In Progress"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedAssignments}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "مكتمل" : "Completed"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalContractValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي العقود" : "Total Value"}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="subcontractors" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="subcontractors" className="gap-2">
              <Users className="w-4 h-4" />
              {isArabic ? "المقاولين" : "Subcontractors"}
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2">
              <FileText className="w-4 h-4" />
              {isArabic ? "المهام" : "Assignments"}
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  {isArabic ? "مهمة جديدة" : "New Assignment"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isArabic ? "إسناد عمل جديد" : "New Assignment"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{isArabic ? "المقاول" : "Subcontractor"}</Label>
                    <Select value={assignmentData.subcontractor_id} onValueChange={v => setAssignmentData(p => ({ ...p, subcontractor_id: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={isArabic ? "اختر المقاول" : "Select subcontractor"} />
                      </SelectTrigger>
                      <SelectContent>
                        {subcontractors.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{isArabic ? "نطاق العمل" : "Scope of Work"}</Label>
                    <Textarea 
                      value={assignmentData.scope_of_work}
                      onChange={e => setAssignmentData(p => ({ ...p, scope_of_work: e.target.value }))}
                      placeholder={isArabic ? "وصف العمل المطلوب..." : "Describe the work..."}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{isArabic ? "قيمة العقد" : "Contract Value"}</Label>
                      <Input 
                        type="number"
                        value={assignmentData.contract_value}
                        onChange={e => setAssignmentData(p => ({ ...p, contract_value: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>{isArabic ? "الحالة" : "Status"}</Label>
                      <Select value={assignmentData.status} onValueChange={v => setAssignmentData(p => ({ ...p, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{isArabic ? "معلق" : "Pending"}</SelectItem>
                          <SelectItem value="in_progress">{isArabic ? "جاري" : "In Progress"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{isArabic ? "تاريخ البدء" : "Start Date"}</Label>
                      <Input 
                        type="date"
                        value={assignmentData.start_date}
                        onChange={e => setAssignmentData(p => ({ ...p, start_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>{isArabic ? "تاريخ الانتهاء" : "End Date"}</Label>
                      <Input 
                        type="date"
                        value={assignmentData.end_date}
                        onChange={e => setAssignmentData(p => ({ ...p, end_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddAssignment} className="w-full">{isArabic ? "إسناد العمل" : "Create Assignment"}</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  {isArabic ? "مقاول جديد" : "Add Subcontractor"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isArabic ? "إضافة مقاول فرعي" : "Add Subcontractor"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{isArabic ? "الاسم" : "Name"} *</Label>
                    <Input 
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{isArabic ? "البريد الإلكتروني" : "Email"}</Label>
                      <Input 
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>{isArabic ? "الهاتف" : "Phone"}</Label>
                      <Input 
                        value={formData.phone}
                        onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{isArabic ? "التخصص" : "Specialty"}</Label>
                      <Input 
                        value={formData.specialty}
                        onChange={e => setFormData(p => ({ ...p, specialty: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>{isArabic ? "رقم الرخصة" : "License No."}</Label>
                      <Input 
                        value={formData.license_number}
                        onChange={e => setFormData(p => ({ ...p, license_number: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                    <Textarea 
                      value={formData.notes}
                      onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                  <Button onClick={handleAddSubcontractor} className="w-full">{isArabic ? "إضافة" : "Add"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="subcontractors" className="space-y-4">
          {subcontractors.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{isArabic ? "لا يوجد مقاولين فرعيين" : "No subcontractors yet"}</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subcontractors.map(sub => (
                <Card key={sub.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{sub.name}</CardTitle>
                          <CardDescription>{sub.specialty || (isArabic ? "غير محدد" : "Not specified")}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                        {sub.status === "active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sub.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{sub.email}</span>
                      </div>
                    )}
                    {sub.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{sub.phone}</span>
                      </div>
                    )}
                    {sub.license_number && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        <span>{sub.license_number}</span>
                      </div>
                    )}
                    {sub.rating && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < sub.rating! ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} 
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setSelectedSubcontractor(sub);
                          setAssignmentData(p => ({ ...p, subcontractor_id: sub.id }));
                          setShowAssignmentDialog(true);
                        }}
                      >
                        {isArabic ? "إسناد عمل" : "Assign Work"}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteSubcontractor(sub.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          {assignments.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{isArabic ? "لا توجد مهام" : "No assignments yet"}</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {assignments.map(assign => {
                const sub = subcontractors.find(s => s.id === assign.subcontractor_id);
                return (
                  <Card key={assign.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">{sub?.name || "Unknown"}</h4>
                          <p className="text-sm text-muted-foreground">{assign.scope_of_work}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(assign.status)}
                          {assign.contract_value && (
                            <Badge variant="outline">{assign.contract_value.toLocaleString()} SAR</Badge>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{isArabic ? "التقدم" : "Progress"}</span>
                          <span className="font-medium">{assign.progress_percentage}%</span>
                        </div>
                        <Progress value={assign.progress_percentage} className="h-2" />
                        <div className="flex gap-2 mt-3">
                          {[25, 50, 75, 100].map(p => (
                            <Button 
                              key={p}
                              variant={assign.progress_percentage >= p ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleUpdateProgress(assign.id, p)}
                            >
                              {p}%
                            </Button>
                          ))}
                        </div>
                      </div>
                      {(assign.start_date || assign.end_date) && (
                        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                          {assign.start_date && <span>{isArabic ? "البدء:" : "Start:"} {assign.start_date}</span>}
                          {assign.end_date && <span>{isArabic ? "الانتهاء:" : "End:"} {assign.end_date}</span>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
