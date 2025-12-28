import { useState, useMemo } from "react";
import { 
  Package, 
  Users, 
  Truck, 
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: string;
}

interface ProcurementItem {
  id: string;
  itemNumber: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  leadTime: number; // days
  supplier?: string;
  orderDate?: string;
  deliveryDate?: string;
  status: 'pending' | 'ordered' | 'in_transit' | 'delivered' | 'delayed';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

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
}

interface ProcurementResourcesScheduleProps {
  items?: BOQItem[];
  currency?: string;
}

export function ProcurementResourcesSchedule({ 
  items = [], 
  currency = "SAR" 
}: ProcurementResourcesScheduleProps) {
  const { isArabic } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Generate procurement items from BOQ items
  const procurementItems: ProcurementItem[] = useMemo(() => {
    return items.map((item, index) => {
      const leadTime = Math.floor(Math.random() * 30) + 7; // 7-37 days
      const statuses: ProcurementItem['status'][] = ['pending', 'ordered', 'in_transit', 'delivered', 'delayed'];
      const priorities: ProcurementItem['priority'][] = ['low', 'medium', 'high', 'critical'];
      
      const today = new Date();
      const orderDate = new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const deliveryDate = new Date(orderDate.getTime() + leadTime * 24 * 60 * 60 * 1000);
      
      return {
        id: `proc-${index}`,
        itemNumber: item.item_number,
        description: item.description,
        category: item.category || 'General',
        quantity: item.quantity,
        unit: item.unit,
        estimatedCost: item.total_price || item.quantity * (item.unit_price || 0),
        leadTime,
        supplier: ['Saudi Suppliers Co.', 'Al-Muhaidib', 'Binladin Group', 'Al-Rajhi Trading'][Math.floor(Math.random() * 4)],
        orderDate: orderDate.toISOString().split('T')[0],
        deliveryDate: deliveryDate.toISOString().split('T')[0],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
      };
    });
  }, [items]);

  // Generate resource items from BOQ items
  const resourceItems: ResourceItem[] = useMemo(() => {
    const resources: ResourceItem[] = [];
    let resourceId = 0;
    
    items.forEach((item) => {
      const category = item.category || 'General';
      const totalCost = item.total_price || item.quantity * (item.unit_price || 0);
      
      // Labor resource
      if (Math.random() > 0.3) {
        const laborCost = totalCost * 0.3;
        const days = Math.max(7, Math.floor(laborCost / 500));
        resources.push({
          id: `res-${resourceId++}`,
          type: 'labor',
          name: `${category} - ${isArabic ? 'عمال' : 'Workers'}`,
          category,
          quantity: Math.max(1, Math.floor(days / 5)),
          unit: isArabic ? 'عامل' : 'worker',
          ratePerDay: 150 + Math.random() * 200,
          totalCost: laborCost,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          utilizationPercentage: 60 + Math.random() * 40,
          status: ['available', 'assigned', 'unavailable'][Math.floor(Math.random() * 3)] as ResourceItem['status'],
        });
      }
      
      // Equipment resource
      if (Math.random() > 0.5) {
        const equipCost = totalCost * 0.2;
        const days = Math.max(3, Math.floor(equipCost / 1000));
        resources.push({
          id: `res-${resourceId++}`,
          type: 'equipment',
          name: `${category} - ${isArabic ? 'معدات' : 'Equipment'}`,
          category,
          quantity: Math.max(1, Math.floor(Math.random() * 5)),
          unit: isArabic ? 'وحدة' : 'unit',
          ratePerDay: 500 + Math.random() * 1500,
          totalCost: equipCost,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          utilizationPercentage: 40 + Math.random() * 50,
          status: ['available', 'assigned', 'unavailable'][Math.floor(Math.random() * 3)] as ResourceItem['status'],
        });
      }
      
      // Material resource
      resources.push({
        id: `res-${resourceId++}`,
        type: 'material',
        name: item.description.slice(0, 50),
        category,
        quantity: item.quantity,
        unit: item.unit,
        ratePerDay: item.unit_price || 0,
        totalCost: totalCost * 0.5,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        utilizationPercentage: 100,
        status: 'assigned',
      });
    });
    
    return resources;
  }, [items, isArabic]);

  // Filter procurement items
  const filteredProcurement = useMemo(() => {
    return procurementItems.filter(item => {
      const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.itemNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [procurementItems, searchTerm, statusFilter, priorityFilter]);

  // Group by category
  const categorizedProcurement = useMemo(() => {
    const grouped: Record<string, ProcurementItem[]> = {};
    filteredProcurement.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, [filteredProcurement]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalItems = procurementItems.length;
    const totalCost = procurementItems.reduce((sum, item) => sum + item.estimatedCost, 0);
    const pending = procurementItems.filter(i => i.status === 'pending').length;
    const ordered = procurementItems.filter(i => i.status === 'ordered').length;
    const delivered = procurementItems.filter(i => i.status === 'delivered').length;
    const delayed = procurementItems.filter(i => i.status === 'delayed').length;
    const critical = procurementItems.filter(i => i.priority === 'critical').length;
    
    return { totalItems, totalCost, pending, ordered, delivered, delayed, critical };
  }, [procurementItems]);

  const resourceSummary = useMemo(() => {
    const labor = resourceItems.filter(r => r.type === 'labor');
    const equipment = resourceItems.filter(r => r.type === 'equipment');
    const materials = resourceItems.filter(r => r.type === 'material');
    
    return {
      laborCount: labor.length,
      laborCost: labor.reduce((sum, r) => sum + r.totalCost, 0),
      equipmentCount: equipment.length,
      equipmentCost: equipment.reduce((sum, r) => sum + r.totalCost, 0),
      materialCount: materials.length,
      materialCost: materials.reduce((sum, r) => sum + r.totalCost, 0),
      avgUtilization: resourceItems.reduce((sum, r) => sum + r.utilizationPercentage, 0) / resourceItems.length || 0,
    };
  }, [resourceItems]);

  const getStatusBadge = (status: ProcurementItem['status']) => {
    const config = {
      pending: { label: isArabic ? 'معلق' : 'Pending', variant: 'secondary' as const },
      ordered: { label: isArabic ? 'تم الطلب' : 'Ordered', variant: 'default' as const },
      in_transit: { label: isArabic ? 'في الطريق' : 'In Transit', variant: 'outline' as const },
      delivered: { label: isArabic ? 'تم التسليم' : 'Delivered', variant: 'default' as const },
      delayed: { label: isArabic ? 'متأخر' : 'Delayed', variant: 'destructive' as const },
    };
    const { label, variant } = config[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getPriorityBadge = (priority: ProcurementItem['priority']) => {
    const config = {
      low: { label: isArabic ? 'منخفض' : 'Low', className: 'bg-gray-100 text-gray-700' },
      medium: { label: isArabic ? 'متوسط' : 'Medium', className: 'bg-blue-100 text-blue-700' },
      high: { label: isArabic ? 'عالي' : 'High', className: 'bg-orange-100 text-orange-700' },
      critical: { label: isArabic ? 'حرج' : 'Critical', className: 'bg-red-100 text-red-700' },
    };
    const { label, className } = config[priority];
    return <Badge className={className}>{label}</Badge>;
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Procurement sheet
    const procData = [
      ['Item No', 'Description', 'Category', 'Quantity', 'Unit', 'Est. Cost', 'Lead Time', 'Supplier', 'Order Date', 'Delivery Date', 'Status', 'Priority'],
      ...procurementItems.map(item => [
        item.itemNumber,
        item.description,
        item.category,
        item.quantity,
        item.unit,
        item.estimatedCost,
        item.leadTime,
        item.supplier,
        item.orderDate,
        item.deliveryDate,
        item.status,
        item.priority,
      ])
    ];
    const procSheet = XLSX.utils.aoa_to_sheet(procData);
    XLSX.utils.book_append_sheet(wb, procSheet, 'Procurement');
    
    // Resources sheet
    const resData = [
      ['Type', 'Name', 'Category', 'Quantity', 'Unit', 'Rate/Day', 'Total Cost', 'Start Date', 'End Date', 'Utilization %', 'Status'],
      ...resourceItems.map(item => [
        item.type,
        item.name,
        item.category,
        item.quantity,
        item.unit,
        item.ratePerDay,
        item.totalCost,
        item.startDate,
        item.endDate,
        item.utilizationPercentage,
        item.status,
      ])
    ];
    const resSheet = XLSX.utils.aoa_to_sheet(resData);
    XLSX.utils.book_append_sheet(wb, resSheet, 'Resources');
    
    XLSX.writeFile(wb, 'procurement-resources-schedule.xlsx');
    toast.success(isArabic ? 'تم تصدير الجدول بنجاح' : 'Schedule exported successfully');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.text(isArabic ? 'جدول المشتريات والموارد' : 'Procurement & Resources Schedule', pageWidth / 2, 20, { align: 'center' });
    
    // Summary
    doc.setFontSize(12);
    doc.text(isArabic ? 'ملخص المشتريات' : 'Procurement Summary', 14, 35);
    
    autoTable(doc, {
      startY: 40,
      head: [[isArabic ? 'البند' : 'Item', isArabic ? 'القيمة' : 'Value']],
      body: [
        [isArabic ? 'إجمالي البنود' : 'Total Items', summaryStats.totalItems.toString()],
        [isArabic ? 'التكلفة الإجمالية' : 'Total Cost', `${currency} ${summaryStats.totalCost.toLocaleString()}`],
        [isArabic ? 'معلق' : 'Pending', summaryStats.pending.toString()],
        [isArabic ? 'تم التسليم' : 'Delivered', summaryStats.delivered.toString()],
        [isArabic ? 'متأخر' : 'Delayed', summaryStats.delayed.toString()],
      ],
      theme: 'grid',
    });
    
    // Procurement list
    const finalY = (doc as any).lastAutoTable.finalY || 80;
    doc.text(isArabic ? 'قائمة المشتريات' : 'Procurement List', 14, finalY + 15);
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['#', isArabic ? 'الوصف' : 'Description', isArabic ? 'الكمية' : 'Qty', isArabic ? 'التكلفة' : 'Cost', isArabic ? 'الحالة' : 'Status']],
      body: procurementItems.slice(0, 20).map(item => [
        item.itemNumber,
        item.description.slice(0, 30),
        item.quantity.toString(),
        `${currency} ${item.estimatedCost.toLocaleString()}`,
        item.status,
      ]),
      theme: 'striped',
    });
    
    doc.save('procurement-resources-schedule.pdf');
    toast.success(isArabic ? 'تم تصدير التقرير بنجاح' : 'Report exported successfully');
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            {isArabic 
              ? 'لا توجد بنود لعرض جدول المشتريات والموارد. قم بتحليل BOQ أولاً.'
              : 'No items available. Analyze a BOQ first to see procurement and resources schedule.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Package className="w-5 h-5" />
            {isArabic ? 'جدول المشتريات والموارد' : 'Procurement & Resources Schedule'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isArabic ? 'إدارة المواد والموارد البشرية والمعدات' : 'Manage materials, labor, and equipment resources'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'إجمالي البنود' : 'Total Items'}</p>
                <p className="text-2xl font-bold">{summaryStats.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'تم التسليم' : 'Delivered'}</p>
                <p className="text-2xl font-bold">{summaryStats.delivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'معلق' : 'Pending'}</p>
                <p className="text-2xl font-bold">{summaryStats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'متأخر' : 'Delayed'}</p>
                <p className="text-2xl font-bold">{summaryStats.delayed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="procurement" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="procurement" className="gap-2">
            <Truck className="w-4 h-4" />
            {isArabic ? 'المشتريات' : 'Procurement'}
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-2">
            <Users className="w-4 h-4" />
            {isArabic ? 'الموارد' : 'Resources'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="procurement" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isArabic ? 'بحث...' : 'Search...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={isArabic ? 'الحالة' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="pending">{isArabic ? 'معلق' : 'Pending'}</SelectItem>
                <SelectItem value="ordered">{isArabic ? 'تم الطلب' : 'Ordered'}</SelectItem>
                <SelectItem value="in_transit">{isArabic ? 'في الطريق' : 'In Transit'}</SelectItem>
                <SelectItem value="delivered">{isArabic ? 'تم التسليم' : 'Delivered'}</SelectItem>
                <SelectItem value="delayed">{isArabic ? 'متأخر' : 'Delayed'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={isArabic ? 'الأولوية' : 'Priority'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="critical">{isArabic ? 'حرج' : 'Critical'}</SelectItem>
                <SelectItem value="high">{isArabic ? 'عالي' : 'High'}</SelectItem>
                <SelectItem value="medium">{isArabic ? 'متوسط' : 'Medium'}</SelectItem>
                <SelectItem value="low">{isArabic ? 'منخفض' : 'Low'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categorized Procurement Table */}
          <div className="space-y-3">
            {Object.entries(categorizedProcurement).map(([category, items]) => (
              <Collapsible 
                key={category} 
                open={expandedCategories.includes(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedCategories.includes(category) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          <CardTitle className="text-base">{category}</CardTitle>
                          <Badge variant="outline">{items.length} {isArabic ? 'بند' : 'items'}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {currency} {items.reduce((sum, i) => sum + i.estimatedCost, 0).toLocaleString()}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{isArabic ? 'رقم' : '#'}</TableHead>
                            <TableHead>{isArabic ? 'الوصف' : 'Description'}</TableHead>
                            <TableHead>{isArabic ? 'الكمية' : 'Qty'}</TableHead>
                            <TableHead>{isArabic ? 'التكلفة' : 'Cost'}</TableHead>
                            <TableHead>{isArabic ? 'المورد' : 'Supplier'}</TableHead>
                            <TableHead>{isArabic ? 'التسليم' : 'Delivery'}</TableHead>
                            <TableHead>{isArabic ? 'الحالة' : 'Status'}</TableHead>
                            <TableHead>{isArabic ? 'الأولوية' : 'Priority'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-xs">{item.itemNumber}</TableCell>
                              <TableCell className="max-w-[200px] truncate" title={item.description}>
                                {item.description}
                              </TableCell>
                              <TableCell>{item.quantity} {item.unit}</TableCell>
                              <TableCell>{currency} {item.estimatedCost.toLocaleString()}</TableCell>
                              <TableCell className="text-sm">{item.supplier}</TableCell>
                              <TableCell className="text-sm">{item.deliveryDate}</TableCell>
                              <TableCell>{getStatusBadge(item.status)}</TableCell>
                              <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          {/* Resource Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">{isArabic ? 'العمالة' : 'Labor'}</span>
                  </div>
                  <Badge variant="outline">{resourceSummary.laborCount}</Badge>
                </div>
                <p className="text-2xl font-bold">{currency} {resourceSummary.laborCost.toLocaleString()}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-orange-500" />
                    <span className="font-medium">{isArabic ? 'المعدات' : 'Equipment'}</span>
                  </div>
                  <Badge variant="outline">{resourceSummary.equipmentCount}</Badge>
                </div>
                <p className="text-2xl font-bold">{currency} {resourceSummary.equipmentCost.toLocaleString()}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-500" />
                    <span className="font-medium">{isArabic ? 'المواد' : 'Materials'}</span>
                  </div>
                  <Badge variant="outline">{resourceSummary.materialCount}</Badge>
                </div>
                <p className="text-2xl font-bold">{currency} {resourceSummary.materialCost.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Average Utilization */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{isArabic ? 'متوسط الاستخدام' : 'Average Utilization'}</span>
                <span className="text-sm font-bold">{resourceSummary.avgUtilization.toFixed(1)}%</span>
              </div>
              <Progress value={resourceSummary.avgUtilization} className="h-2" />
            </CardContent>
          </Card>

          {/* Resources Table */}
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isArabic ? 'النوع' : 'Type'}</TableHead>
                    <TableHead>{isArabic ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead>{isArabic ? 'الكمية' : 'Qty'}</TableHead>
                    <TableHead>{isArabic ? 'المعدل/يوم' : 'Rate/Day'}</TableHead>
                    <TableHead>{isArabic ? 'التكلفة' : 'Cost'}</TableHead>
                    <TableHead>{isArabic ? 'الفترة' : 'Period'}</TableHead>
                    <TableHead>{isArabic ? 'الاستخدام' : 'Util.'}</TableHead>
                    <TableHead>{isArabic ? 'الحالة' : 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resourceItems.slice(0, 20).map(resource => (
                    <TableRow key={resource.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {resource.type === 'labor' ? (isArabic ? 'عمالة' : 'Labor') :
                           resource.type === 'equipment' ? (isArabic ? 'معدات' : 'Equipment') :
                           (isArabic ? 'مواد' : 'Material')}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={resource.name}>
                        {resource.name}
                      </TableCell>
                      <TableCell>{resource.quantity} {resource.unit}</TableCell>
                      <TableCell>{currency} {resource.ratePerDay.toFixed(0)}</TableCell>
                      <TableCell>{currency} {resource.totalCost.toLocaleString()}</TableCell>
                      <TableCell className="text-xs">
                        {resource.startDate} - {resource.endDate}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={resource.utilizationPercentage} className="h-2 w-16" />
                          <span className="text-xs">{resource.utilizationPercentage.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={resource.status === 'available' ? 'default' : 
                                   resource.status === 'assigned' ? 'secondary' : 'destructive'}
                        >
                          {resource.status === 'available' ? (isArabic ? 'متاح' : 'Available') :
                           resource.status === 'assigned' ? (isArabic ? 'مخصص' : 'Assigned') :
                           (isArabic ? 'غير متاح' : 'Unavailable')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
