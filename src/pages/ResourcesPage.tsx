import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Wrench, 
  Package, 
  Calendar,
  DollarSign,
  BarChart3,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Loader2,
  Sparkles,
  Download,
  Link2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageLayout } from "@/components/PageLayout";
import { GanttChart } from "@/components/GanttChart";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResourceItem {
  id: string;
  type: 'labor' | 'equipment' | 'material';
  name: string;
  category: string;
  quantity: number;
  unit: string;
  ratePerDay: number;
  totalCost: number;
  startDate: string;
  endDate: string;
  utilizationPercentage: number;
  status: 'available' | 'assigned' | 'unavailable';
  linkedItemNumber?: string;
  linkedItemDescription?: string;
  aiGenerated?: boolean;
  aiReasoning?: string;
}

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface TimelineTask {
  id: string;
  taskCode: string;
  taskTitle: string;
  startDay: number;
  duration: number;
  progress: number;
}

const ResourcesPage = () => {
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const { analysisData } = useAnalysisData();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [timelineTasks, setTimelineTasks] = useState<TimelineTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  
  const [newResource, setNewResource] = useState<Partial<ResourceItem>>({
    type: 'labor',
    name: '',
    category: '',
    quantity: 1,
    unit: '',
    ratePerDay: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    utilizationPercentage: 80,
    status: 'available'
  });

  // Get BOQ items from analysis data
  const boqItems: BOQItem[] = useMemo(() => {
    if (!analysisData?.items) return [];
    return analysisData.items;
  }, [analysisData]);

  // Load saved resources
  useEffect(() => {
    if (user) {
      loadResources();
      loadTimeline();
    }
  }, [user]);

  const loadResources = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('resource_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedResources: ResourceItem[] = data.map(item => ({
          id: item.id,
          type: (item.type as ResourceItem['type']) || 'labor',
          name: item.name,
          category: item.category || 'عام',
          quantity: Number(item.quantity) || 1,
          unit: item.unit || '',
          ratePerDay: Number(item.rate_per_day) || 0,
          totalCost: Number(item.total_cost) || 0,
          startDate: item.start_date || new Date().toISOString().split('T')[0],
          endDate: item.end_date || new Date().toISOString().split('T')[0],
          utilizationPercentage: Number(item.utilization_percent) || 80,
          status: (item.status as ResourceItem['status']) || 'available',
          aiGenerated: item.ai_generated || false,
          aiReasoning: item.ai_reasoning || ''
        }));
        setResources(loadedResources);
      }
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTimeline = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('timeline_estimates')
        .select('*')
        .eq('user_id', user.id)
        .order('custom_start_day', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const tasks: TimelineTask[] = data.map(item => ({
          id: item.id,
          taskCode: item.task_code,
          taskTitle: item.task_title,
          startDay: item.custom_start_day || 1,
          duration: item.custom_duration || 7,
          progress: item.custom_progress || 0
        }));
        setTimelineTasks(tasks);
      }
    } catch (error) {
      console.error('Error loading timeline:', error);
    }
  };

  // AI Analysis for resources
  const analyzeResourcesWithAI = async () => {
    if (!boqItems || boqItems.length === 0) {
      toast.error(isArabic ? 'لا توجد بنود للتحليل. قم برفع ملف BOQ أولاً' : 'No items to analyze. Upload a BOQ file first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-resources', {
        body: {
          items: boqItems.slice(0, 30),
          projectStartDate: new Date().toISOString(),
          projectDuration: 180,
          language: isArabic ? 'ar' : 'en'
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const newResources: ResourceItem[] = (data.resource_analysis || []).map((item: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        type: item.type || 'labor',
        name: item.name || '',
        category: item.category || 'عام',
        quantity: item.quantity || 1,
        unit: item.unit || '',
        ratePerDay: item.rate_per_day || 0,
        totalCost: item.total_cost || 0,
        startDate: item.start_date || new Date().toISOString().split('T')[0],
        endDate: item.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        utilizationPercentage: item.utilization_percent || 80,
        status: 'available' as const,
        linkedItemNumber: item.boq_item_number,
        linkedItemDescription: item.boq_description,
        aiGenerated: true,
        aiReasoning: item.ai_reasoning || ''
      }));

      setResources(prev => [...newResources, ...prev]);
      toast.success(isArabic ? `تم تحليل ${newResources.length} مورد بنجاح` : `Successfully analyzed ${newResources.length} resources`);
    } catch (error) {
      console.error('Resource analysis error:', error);
      toast.error(isArabic ? 'خطأ في تحليل الموارد' : 'Error analyzing resources');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save resources to database
  const saveResources = async () => {
    if (!user) {
      toast.error(isArabic ? 'يجب تسجيل الدخول للحفظ' : 'Please login to save');
      return;
    }

    setIsSaving(true);
    try {
      // Delete existing resources
      await supabase.from('resource_items').delete().eq('user_id', user.id);

      // Insert new resources
      const resourcesToSave = resources.map(item => ({
        user_id: user.id,
        type: item.type,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        rate_per_day: item.ratePerDay,
        total_cost: item.totalCost,
        start_date: item.startDate,
        end_date: item.endDate,
        utilization_percent: item.utilizationPercentage,
        status: item.status,
        ai_generated: item.aiGenerated,
        ai_reasoning: item.aiReasoning
      }));

      const { error } = await supabase.from('resource_items').insert(resourcesToSave);
      if (error) throw error;

      toast.success(isArabic ? 'تم حفظ الموارد بنجاح' : 'Resources saved successfully');
    } catch (error) {
      console.error('Error saving resources:', error);
      toast.error(isArabic ? 'خطأ في حفظ الموارد' : 'Error saving resources');
    } finally {
      setIsSaving(false);
    }
  };

  // Add new resource
  const handleAddResource = () => {
    if (!newResource.name) {
      toast.error(isArabic ? 'يرجى إدخال اسم المورد' : 'Please enter resource name');
      return;
    }

    const days = Math.ceil((new Date(newResource.endDate!).getTime() - new Date(newResource.startDate!).getTime()) / (1000 * 60 * 60 * 24));
    const totalCost = (newResource.quantity || 1) * (newResource.ratePerDay || 0) * days;

    const resource: ResourceItem = {
      id: `manual-${Date.now()}`,
      type: newResource.type as ResourceItem['type'],
      name: newResource.name,
      category: newResource.category || 'عام',
      quantity: newResource.quantity || 1,
      unit: newResource.unit || '',
      ratePerDay: newResource.ratePerDay || 0,
      totalCost,
      startDate: newResource.startDate!,
      endDate: newResource.endDate!,
      utilizationPercentage: newResource.utilizationPercentage || 80,
      status: newResource.status as ResourceItem['status'],
      aiGenerated: false
    };

    setResources(prev => [resource, ...prev]);
    setShowAddDialog(false);
    setNewResource({
      type: 'labor',
      name: '',
      category: '',
      quantity: 1,
      unit: '',
      ratePerDay: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      utilizationPercentage: 80,
      status: 'available'
    });
    toast.success(isArabic ? 'تم إضافة المورد' : 'Resource added');
  };

  // Delete resource
  const handleDeleteResource = (id: string) => {
    setResources(prev => prev.filter(r => r.id !== id));
    toast.success(isArabic ? 'تم حذف المورد' : 'Resource deleted');
  };

  // Link resource to BOQ item
  const handleLinkToBOQ = (item: BOQItem) => {
    if (selectedResource) {
      setResources(prev => prev.map(r => 
        r.id === selectedResource.id 
          ? { ...r, linkedItemNumber: item.item_number, linkedItemDescription: item.description }
          : r
      ));
      setShowLinkDialog(false);
      setSelectedResource(null);
      toast.success(isArabic ? 'تم ربط المورد بالبند' : 'Resource linked to item');
    }
  };

  // Filter resources
  const filteredResources = useMemo(() => {
    return resources.filter(resource => {
      const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           resource.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || resource.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || resource.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [resources, searchTerm, typeFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const laborResources = resources.filter(r => r.type === 'labor');
    const equipmentResources = resources.filter(r => r.type === 'equipment');
    const materialResources = resources.filter(r => r.type === 'material');

    return {
      totalResources: resources.length,
      laborCount: laborResources.length,
      equipmentCount: equipmentResources.length,
      materialCount: materialResources.length,
      totalCost: resources.reduce((sum, r) => sum + r.totalCost, 0),
      laborCost: laborResources.reduce((sum, r) => sum + r.totalCost, 0),
      equipmentCost: equipmentResources.reduce((sum, r) => sum + r.totalCost, 0),
      materialCost: materialResources.reduce((sum, r) => sum + r.totalCost, 0),
      linkedItems: resources.filter(r => r.linkedItemNumber).length,
      avgUtilization: resources.length > 0 
        ? Math.round(resources.reduce((sum, r) => sum + r.utilizationPercentage, 0) / resources.length)
        : 0
    };
  }, [resources]);

  // Prepare data for Gantt chart (convert to Activity format)
  const ganttActivities = useMemo(() => {
    if (resources.length === 0) return [];
    
    const baseDate = new Date(Math.min(...resources.map(r => new Date(r.startDate).getTime())));
    
    return resources.map((resource, index) => {
      const startDate = new Date(resource.startDate);
      const endDate = new Date(resource.endDate);
      const duration = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        id: resource.id,
        name: resource.name,
        wbs: resource.type,
        startDate: startDate,
        endDate: endDate,
        duration: duration,
        cost: resource.totalCost,
        costWeight: resource.utilizationPercentage / 100,
        isCritical: resource.status === 'assigned'
      };
    });
  }, [resources]);

  // Calculate project dates for Gantt
  const projectDates = useMemo(() => {
    if (resources.length === 0) {
      return {
        start: new Date(),
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
    }
    const startDates = resources.map(r => new Date(r.startDate).getTime());
    const endDates = resources.map(r => new Date(r.endDate).getTime());
    return {
      start: new Date(Math.min(...startDates)),
      end: new Date(Math.max(...endDates))
    };
  }, [resources]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'labor': return <Users className="h-4 w-4" />;
      case 'equipment': return <Wrench className="h-4 w-4" />;
      case 'material': return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      labor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      equipment: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      material: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    };
    const labels: Record<string, string> = {
      labor: isArabic ? 'عمالة' : 'Labor',
      equipment: isArabic ? 'معدات' : 'Equipment',
      material: isArabic ? 'مواد' : 'Material'
    };
    return <Badge className={colors[type]}>{labels[type]}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      available: 'bg-green-100 text-green-800',
      assigned: 'bg-blue-100 text-blue-800',
      unavailable: 'bg-red-100 text-red-800'
    };
    const labels: Record<string, string> = {
      available: isArabic ? 'متاح' : 'Available',
      assigned: isArabic ? 'مخصص' : 'Assigned',
      unavailable: isArabic ? 'غير متاح' : 'Unavailable'
    };
    return <Badge className={colors[status]}>{labels[status]}</Badge>;
  };

  if (!user) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {isArabic ? 'يجب تسجيل الدخول' : 'Login Required'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {isArabic ? 'يرجى تسجيل الدخول للوصول إلى صفحة الموارد' : 'Please login to access the resources page'}
            </p>
            <Button onClick={() => navigate('/auth')}>
              {isArabic ? 'تسجيل الدخول' : 'Login'}
            </Button>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              {isArabic ? 'إدارة الموارد' : 'Resource Management'}
            </h1>
            <p className="text-muted-foreground">
              {isArabic ? 'إدارة العمالة والمعدات والمواد الخام للمشروع' : 'Manage labor, equipment, and materials for the project'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={analyzeResourcesWithAI}
              disabled={isAnalyzing || boqItems.length === 0}
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="mr-2">{isArabic ? 'تحليل بالذكاء الاصطناعي' : 'AI Analysis'}</span>
            </Button>
            <Button variant="outline" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4" />
              <span className="mr-2">{isArabic ? 'إضافة مورد' : 'Add Resource'}</span>
            </Button>
            <Button onClick={saveResources} disabled={isSaving || resources.length === 0}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="mr-2">{isArabic ? 'حفظ' : 'Save'}</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{isArabic ? 'إجمالي الموارد' : 'Total Resources'}</p>
                  <p className="text-xl font-bold">{stats.totalResources}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{isArabic ? 'عمالة' : 'Labor'}</p>
                  <p className="text-xl font-bold">{stats.laborCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{isArabic ? 'معدات' : 'Equipment'}</p>
                  <p className="text-xl font-bold">{stats.equipmentCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{isArabic ? 'مواد' : 'Materials'}</p>
                  <p className="text-xl font-bold">{stats.materialCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{isArabic ? 'التكلفة الإجمالية' : 'Total Cost'}</p>
                  <p className="text-lg font-bold">{stats.totalCost.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{isArabic ? 'مرتبطة بالبنود' : 'Linked Items'}</p>
                  <p className="text-xl font-bold">{stats.linkedItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">{isArabic ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
            <TabsTrigger value="labor">{isArabic ? 'العمالة' : 'Labor'}</TabsTrigger>
            <TabsTrigger value="equipment">{isArabic ? 'المعدات' : 'Equipment'}</TabsTrigger>
            <TabsTrigger value="materials">{isArabic ? 'المواد' : 'Materials'}</TabsTrigger>
            <TabsTrigger value="timeline">{isArabic ? 'الجدول الزمني' : 'Timeline'}</TabsTrigger>
            <TabsTrigger value="boq-link">{isArabic ? 'ربط البنود' : 'BOQ Link'}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={isArabic ? 'بحث...' : 'Search...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={isArabic ? 'النوع' : 'Type'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="labor">{isArabic ? 'عمالة' : 'Labor'}</SelectItem>
                  <SelectItem value="equipment">{isArabic ? 'معدات' : 'Equipment'}</SelectItem>
                  <SelectItem value="material">{isArabic ? 'مواد' : 'Material'}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={isArabic ? 'الحالة' : 'Status'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="available">{isArabic ? 'متاح' : 'Available'}</SelectItem>
                  <SelectItem value="assigned">{isArabic ? 'مخصص' : 'Assigned'}</SelectItem>
                  <SelectItem value="unavailable">{isArabic ? 'غير متاح' : 'Unavailable'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resources Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredResources.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">{isArabic ? 'لا توجد موارد' : 'No Resources'}</h3>
                <p className="text-muted-foreground mb-4">
                  {isArabic ? 'قم بإضافة موارد يدوياً أو استخدم التحليل بالذكاء الاصطناعي' : 'Add resources manually or use AI analysis'}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {isArabic ? 'إضافة يدوي' : 'Add Manually'}
                  </Button>
                  <Button onClick={analyzeResourcesWithAI} disabled={boqItems.length === 0}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isArabic ? 'تحليل آلي' : 'AI Analysis'}
                  </Button>
                </div>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? 'النوع' : 'Type'}</TableHead>
                      <TableHead>{isArabic ? 'الاسم' : 'Name'}</TableHead>
                      <TableHead>{isArabic ? 'الفئة' : 'Category'}</TableHead>
                      <TableHead>{isArabic ? 'الكمية' : 'Qty'}</TableHead>
                      <TableHead>{isArabic ? 'المعدل/يوم' : 'Rate/Day'}</TableHead>
                      <TableHead>{isArabic ? 'التكلفة' : 'Cost'}</TableHead>
                      <TableHead>{isArabic ? 'الاستخدام' : 'Utilization'}</TableHead>
                      <TableHead>{isArabic ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead>{isArabic ? 'مرتبط بـ' : 'Linked To'}</TableHead>
                      <TableHead>{isArabic ? 'إجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResources.map((resource) => (
                      <TableRow key={resource.id}>
                        <TableCell>{getTypeBadge(resource.type)}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(resource.type)}
                            {resource.name}
                            {resource.aiGenerated && (
                              <Sparkles className="h-3 w-3 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{resource.category}</TableCell>
                        <TableCell>{resource.quantity} {resource.unit}</TableCell>
                        <TableCell>{resource.ratePerDay.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">{resource.totalCost.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={resource.utilizationPercentage} className="w-16 h-2" />
                            <span className="text-xs">{resource.utilizationPercentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(resource.status)}</TableCell>
                        <TableCell>
                          {resource.linkedItemNumber ? (
                            <Badge variant="outline" className="text-xs">
                              {resource.linkedItemNumber}
                            </Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedResource(resource);
                                setShowLinkDialog(true);
                              }}
                            >
                              <Link2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteResource(resource.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="labor">
            <ResourceTypeSection 
              resources={resources.filter(r => r.type === 'labor')}
              type="labor"
              isArabic={isArabic}
              onDelete={handleDeleteResource}
            />
          </TabsContent>

          <TabsContent value="equipment">
            <ResourceTypeSection 
              resources={resources.filter(r => r.type === 'equipment')}
              type="equipment"
              isArabic={isArabic}
              onDelete={handleDeleteResource}
            />
          </TabsContent>

          <TabsContent value="materials">
            <ResourceTypeSection 
              resources={resources.filter(r => r.type === 'material')}
              type="material"
              isArabic={isArabic}
              onDelete={handleDeleteResource}
            />
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {isArabic ? 'الجدول الزمني للموارد' : 'Resource Timeline'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ganttActivities.length > 0 ? (
                  <GanttChart 
                    activities={ganttActivities}
                    projectStartDate={projectDates.start}
                    projectEndDate={projectDates.end}
                    currency="SAR"
                    title={isArabic ? 'الجدول الزمني للموارد' : 'Resource Timeline'}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {isArabic ? 'لا توجد موارد لعرضها في الجدول الزمني' : 'No resources to display in timeline'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="boq-link">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  {isArabic ? 'ربط الموارد بالبنود' : 'Link Resources to BOQ Items'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {boqItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {isArabic ? 'لا توجد بنود BOQ. قم برفع ملف أولاً' : 'No BOQ items. Upload a file first'}
                    </p>
                    <Button onClick={() => navigate('/')}>
                      {isArabic ? 'الذهاب للصفحة الرئيسية' : 'Go to Home'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {boqItems.slice(0, 20).map((item, index) => {
                      const linkedResources = resources.filter(r => r.linkedItemNumber === item.item_number);
                      return (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge variant="outline" className="mb-2">{item.item_number}</Badge>
                              <p className="font-medium">{item.description}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} {item.unit} × {item.unit_price.toLocaleString()} = {item.total_price.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-left">
                              {linkedResources.length > 0 ? (
                                <div className="space-y-1">
                                  {linkedResources.map(r => (
                                    <Badge key={r.id} className="block">
                                      {getTypeIcon(r.type)} {r.name}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <Badge variant="secondary">
                                  {isArabic ? 'غير مرتبط' : 'Not Linked'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Resource Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isArabic ? 'إضافة مورد جديد' : 'Add New Resource'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{isArabic ? 'النوع' : 'Type'}</label>
                <Select 
                  value={newResource.type} 
                  onValueChange={(value) => setNewResource(prev => ({ ...prev, type: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="labor">{isArabic ? 'عمالة' : 'Labor'}</SelectItem>
                    <SelectItem value="equipment">{isArabic ? 'معدات' : 'Equipment'}</SelectItem>
                    <SelectItem value="material">{isArabic ? 'مواد' : 'Material'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">{isArabic ? 'الاسم' : 'Name'}</label>
                <Input
                  value={newResource.name}
                  onChange={(e) => setNewResource(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={isArabic ? 'اسم المورد' : 'Resource name'}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{isArabic ? 'الفئة' : 'Category'}</label>
                <Input
                  value={newResource.category}
                  onChange={(e) => setNewResource(prev => ({ ...prev, category: e.target.value }))}
                  placeholder={isArabic ? 'فئة المورد' : 'Resource category'}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{isArabic ? 'الكمية' : 'Quantity'}</label>
                  <Input
                    type="number"
                    value={newResource.quantity}
                    onChange={(e) => setNewResource(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{isArabic ? 'الوحدة' : 'Unit'}</label>
                  <Input
                    value={newResource.unit}
                    onChange={(e) => setNewResource(prev => ({ ...prev, unit: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{isArabic ? 'المعدل اليومي' : 'Rate per Day'}</label>
                <Input
                  type="number"
                  value={newResource.ratePerDay}
                  onChange={(e) => setNewResource(prev => ({ ...prev, ratePerDay: Number(e.target.value) }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{isArabic ? 'تاريخ البدء' : 'Start Date'}</label>
                  <Input
                    type="date"
                    value={newResource.startDate}
                    onChange={(e) => setNewResource(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{isArabic ? 'تاريخ الانتهاء' : 'End Date'}</label>
                  <Input
                    type="date"
                    value={newResource.endDate}
                    onChange={(e) => setNewResource(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                {isArabic ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleAddResource}>
                {isArabic ? 'إضافة' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Link to BOQ Dialog */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isArabic ? 'ربط المورد ببند' : 'Link Resource to Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {boqItems.slice(0, 30).map((item, index) => (
                <div 
                  key={index}
                  className="border rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleLinkToBOQ(item)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <Badge variant="outline">{item.item_number}</Badge>
                      <p className="font-medium mt-1">{item.description}</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

// Resource Type Section Component
const ResourceTypeSection = ({ 
  resources, 
  type, 
  isArabic, 
  onDelete 
}: { 
  resources: ResourceItem[]; 
  type: string; 
  isArabic: boolean;
  onDelete: (id: string) => void;
}) => {
  const typeLabels: Record<string, string> = {
    labor: isArabic ? 'العمالة' : 'Labor',
    equipment: isArabic ? 'المعدات' : 'Equipment',
    material: isArabic ? 'المواد' : 'Materials'
  };

  const totalCost = resources.reduce((sum, r) => sum + r.totalCost, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{typeLabels[type]}</h3>
        <Badge variant="secondary">
          {isArabic ? 'إجمالي التكلفة:' : 'Total Cost:'} {totalCost.toLocaleString()}
        </Badge>
      </div>

      {resources.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {isArabic ? 'لا توجد موارد من هذا النوع' : 'No resources of this type'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <Card key={resource.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {type === 'labor' && <Users className="h-5 w-5 text-blue-500" />}
                    {type === 'equipment' && <Wrench className="h-5 w-5 text-orange-500" />}
                    {type === 'material' && <Package className="h-5 w-5 text-green-500" />}
                    <span className="font-medium">{resource.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(resource.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isArabic ? 'الفئة' : 'Category'}</span>
                    <span>{resource.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isArabic ? 'الكمية' : 'Quantity'}</span>
                    <span>{resource.quantity} {resource.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isArabic ? 'المعدل' : 'Rate'}</span>
                    <span>{resource.ratePerDay.toLocaleString()}/{isArabic ? 'يوم' : 'day'}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>{isArabic ? 'التكلفة' : 'Cost'}</span>
                    <span>{resource.totalCost.toLocaleString()}</span>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{isArabic ? 'الاستخدام' : 'Utilization'}</span>
                      <span>{resource.utilizationPercentage}%</span>
                    </div>
                    <Progress value={resource.utilizationPercentage} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResourcesPage;
