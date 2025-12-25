import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Settings,
  ChevronDown,
  ChevronUp,
  Building2,
  DollarSign,
  Clock,
  Network,
  Users,
  Target,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface P6Activity {
  activity_id: string;
  activity_name: string;
  wbs_code: string;
  wbs_name: string;
  wbs_level: number;
  duration: number;
  original_duration: number;
  start_date: string;
  finish_date: string;
  predecessors: string[];
  predecessor_types: string[];
  lag_days: number[];
  cost: number;
  cost_weight_percent: number;
  resource_names: string[];
  resource_units: number[];
  activity_codes: {
    phase: string;
    area: string;
    trade: string;
    discipline: string;
  };
  calendar: string;
  constraint_type: string;
  constraint_date: string | null;
}

interface WBSElement {
  wbs_code: string;
  wbs_name: string;
  level: number;
  parent_code: string | null;
  total_cost: number;
  weight_percent: number;
}

interface P6ExportResult {
  project_info: {
    project_id: string;
    project_name: string;
    project_type: string;
    total_contract_value: number;
    currency: string;
    calendar_type: string;
    work_days_per_week: number;
    start_date: string;
    finish_date: string;
    total_duration: number;
  };
  wbs_structure: WBSElement[];
  activities: P6Activity[];
  summary: {
    total_activities: number;
    total_wbs_elements: number;
    total_cost: number;
    cost_weight_validation: number;
    critical_path_activities: string[];
  };
}

interface P6ExportProps {
  items: BOQItem[];
  currency?: string;
}

export function P6Export({ items, currency = "SAR" }: P6ExportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<P6ExportResult | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showSettings, setShowSettings] = useState(true);
  
  // Project settings
  const [projectName, setProjectName] = useState("Construction Project");
  const [projectType, setProjectType] = useState("Commercial");
  const [totalContractValue, setTotalContractValue] = useState("");
  const [calendarType, setCalendarType] = useState("6-day");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [projectDuration, setProjectDuration] = useState("180");

  const toggleRow = (index: number) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedRows(newSet);
  };

  const generateP6Export = async () => {
    if (!items || items.length === 0) {
      toast.error("No BOQ items available for P6 export");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-p6-export", {
        body: { 
          boq_items: items,
          project_name: projectName,
          project_type: projectType,
          total_contract_value: totalContractValue ? parseFloat(totalContractValue) : undefined,
          currency,
          calendar_type: calendarType,
          start_date: startDate,
          project_duration: projectDuration ? parseInt(projectDuration) : 180,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      setResult(data);
      setShowSettings(false);
      toast.success("P6 export structure generated successfully");
    } catch (error) {
      console.error("P6 export error:", error);
      toast.error("Failed to generate P6 export structure");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!result) return;

    const workbook = XLSX.utils.book_new();
    
    // Project Info Sheet
    const projectData = [
      ['Primavera P6 Export'],
      ['Generated:', new Date().toLocaleDateString('en-GB')],
      [''],
      ['Project Information'],
      ['Project ID:', result.project_info.project_id],
      ['Project Name:', result.project_info.project_name],
      ['Project Type:', result.project_info.project_type],
      ['Total Contract Value:', `${result.project_info.total_contract_value.toLocaleString()} ${result.project_info.currency}`],
      ['Calendar:', result.project_info.calendar_type],
      ['Start Date:', result.project_info.start_date],
      ['Finish Date:', result.project_info.finish_date],
      ['Duration:', `${result.project_info.total_duration} days`],
    ];
    
    const projectSheet = XLSX.utils.aoa_to_sheet(projectData);
    XLSX.utils.book_append_sheet(workbook, projectSheet, 'Project Info');

    // WBS Sheet
    const wbsHeaders = ['WBS Code', 'WBS Name', 'Level', 'Parent Code', 'Total Cost', 'Weight %'];
    const wbsData = result.wbs_structure.map(wbs => [
      wbs.wbs_code,
      wbs.wbs_name,
      wbs.level,
      wbs.parent_code || '-',
      wbs.total_cost,
      wbs.weight_percent,
    ]);
    const wbsSheet = XLSX.utils.aoa_to_sheet([wbsHeaders, ...wbsData]);
    XLSX.utils.book_append_sheet(workbook, wbsSheet, 'WBS');

    // Activities Sheet (P6 Compatible)
    const actHeaders = [
      'Activity ID', 'Activity Name', 'WBS', 
      'Duration', 'Start', 'Finish', 
      'Predecessors', 'Cost', 'Weight %',
      'Phase', 'Area', 'Trade', 'Discipline',
      'Resources', 'Calendar'
    ];
    const actData = result.activities.map(act => [
      act.activity_id,
      act.activity_name,
      act.wbs_code,
      act.duration,
      act.start_date,
      act.finish_date,
      act.predecessors.map((p, i) => 
        `${p}${act.predecessor_types[i] || 'FS'}${act.lag_days[i] ? `+${act.lag_days[i]}d` : ''}`
      ).join(', '),
      act.cost,
      act.cost_weight_percent,
      act.activity_codes.phase,
      act.activity_codes.area,
      act.activity_codes.trade,
      act.activity_codes.discipline,
      act.resource_names.join(', '),
      act.calendar,
    ]);
    const actSheet = XLSX.utils.aoa_to_sheet([actHeaders, ...actData]);
    XLSX.utils.book_append_sheet(workbook, actSheet, 'Activities');

    // Resources Sheet
    const resHeaders = ['Activity ID', 'Resource Name', 'Units'];
    const resData: any[][] = [];
    result.activities.forEach(act => {
      act.resource_names.forEach((res, i) => {
        resData.push([act.activity_id, res, act.resource_units[i] || 1]);
      });
    });
    const resSheet = XLSX.utils.aoa_to_sheet([resHeaders, ...resData]);
    XLSX.utils.book_append_sheet(workbook, resSheet, 'Resources');

    // Relationships Sheet
    const relHeaders = ['Predecessor', 'Successor', 'Type', 'Lag'];
    const relData: any[][] = [];
    result.activities.forEach(act => {
      act.predecessors.forEach((pred, i) => {
        relData.push([
          pred,
          act.activity_id,
          act.predecessor_types[i] || 'FS',
          act.lag_days[i] || 0,
        ]);
      });
    });
    const relSheet = XLSX.utils.aoa_to_sheet([relHeaders, ...relData]);
    XLSX.utils.book_append_sheet(workbook, relSheet, 'Relationships');

    const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    XLSX.writeFile(workbook, `P6_Export_${currentDate}.xlsx`);
    toast.success("Excel exported successfully");
  };

  const exportToXER = () => {
    if (!result) return;

    // Generate XER format (Primavera P6 native format)
    let xerContent = `ERMHDR\t23.12\t2024-01-01\tProject\tUSD\tProject Export\n`;
    xerContent += `%T\tPROJECT\n`;
    xerContent += `%F\tproj_id\tproj_short_name\tsum_data_date\torig_proj_id\n`;
    xerContent += `%R\t${result.project_info.project_id}\t${result.project_info.project_name}\t${result.project_info.start_date}\t${result.project_info.project_id}\n`;
    
    xerContent += `%T\tCALENDAR\n`;
    xerContent += `%F\tclndr_id\tclndr_name\tday_hr_cnt\tweek_hr_cnt\n`;
    xerContent += `%R\t1\t${result.project_info.calendar_type}\t8\t${result.project_info.work_days_per_week * 8}\n`;

    xerContent += `%T\tPROJWBS\n`;
    xerContent += `%F\twbs_id\twbs_short_name\twbs_name\tparent_wbs_id\n`;
    result.wbs_structure.forEach((wbs, idx) => {
      xerContent += `%R\t${idx + 1}\t${wbs.wbs_code}\t${wbs.wbs_name}\t${wbs.parent_code ? result.wbs_structure.findIndex(w => w.wbs_code === wbs.parent_code) + 1 : ''}\n`;
    });

    xerContent += `%T\tTASK\n`;
    xerContent += `%F\ttask_id\ttask_code\ttask_name\twbs_id\ttarget_drtn_hr_cnt\ttarget_start_date\ttarget_end_date\ttotal_cost\n`;
    result.activities.forEach((act, idx) => {
      const wbsIdx = result.wbs_structure.findIndex(w => w.wbs_code === act.wbs_code) + 1;
      xerContent += `%R\t${idx + 1}\t${act.activity_id}\t${act.activity_name}\t${wbsIdx}\t${act.duration * 8}\t${act.start_date}\t${act.finish_date}\t${act.cost}\n`;
    });

    xerContent += `%T\tTASKPRED\n`;
    xerContent += `%F\ttask_pred_id\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt\n`;
    let predId = 1;
    result.activities.forEach((act, actIdx) => {
      act.predecessors.forEach((pred, predIdx) => {
        const predActIdx = result.activities.findIndex(a => a.activity_id === pred);
        if (predActIdx >= 0) {
          xerContent += `%R\t${predId++}\t${actIdx + 1}\t${predActIdx + 1}\tPR_${act.predecessor_types[predIdx] || 'FS'}\t${(act.lag_days[predIdx] || 0) * 8}\n`;
        }
      });
    });

    xerContent += `%E\n`;

    const blob = new Blob([xerContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `P6_Export_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xer`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("XER file exported successfully");
  };

  const exportToPDF = () => {
    if (!result) return;

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const currentDate = new Date().toLocaleDateString('en-GB');

    // Header
    doc.setFillColor(124, 58, 237); // Purple
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Primavera P6 Schedule Export', 14, 15);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${result.project_info.project_name} | ${currentDate}`, 14, 23);
    
    doc.setTextColor(0, 0, 0);

    // Project Summary
    let yPos = 40;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Summary', 14, yPos);

    yPos += 8;
    const summaryData = [
      ['Project ID', result.project_info.project_id],
      ['Project Type', result.project_info.project_type],
      ['Total Contract Value', `${result.project_info.total_contract_value.toLocaleString()} ${result.project_info.currency}`],
      ['Duration', `${result.project_info.total_duration} days`],
      ['Start Date', result.project_info.start_date],
      ['Finish Date', result.project_info.finish_date],
      ['Calendar', result.project_info.calendar_type],
      ['Total Activities', result.summary.total_activities.toString()],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [124, 58, 237], textColor: 255 },
      margin: { left: 14 },
      tableWidth: 120,
    });

    // Activities Table
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Schedule Activities', 14, yPos);

    yPos += 10;
    const actTableData = result.activities.map(act => [
      act.activity_id,
      act.activity_name.substring(0, 35),
      act.wbs_code,
      act.duration.toString(),
      act.start_date,
      act.finish_date,
      act.predecessors.join(', '),
      `${act.cost.toLocaleString()}`,
      `${act.cost_weight_percent.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Activity Name', 'WBS', 'Dur', 'Start', 'Finish', 'Predecessors', 'Cost', 'Wt%']],
      body: actTableData,
      theme: 'striped',
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontSize: 7 },
      styles: { fontSize: 6, cellPadding: 1 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${pageCount} | P6 Schedule Export | ${currentDate}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`P6_Schedule_${currentDate.replace(/\//g, '-')}.pdf`);
    toast.success("PDF exported successfully");
  };

  if (!result && !showSettings) {
    setShowSettings(true);
  }

  return (
    <div className="space-y-6">
      {/* Settings Panel */}
      {showSettings && (
        <div className="border rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Project Setup</h3>
                <p className="text-sm text-muted-foreground">Configure project settings for P6 export</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Residential">Residential</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="Industrial">Industrial</SelectItem>
                  <SelectItem value="Mixed Use">Mixed Use</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tcv">Total Contract Value ({currency})</Label>
              <Input
                id="tcv"
                type="number"
                value={totalContractValue}
                onChange={(e) => setTotalContractValue(e.target.value)}
                placeholder="Auto-calculate from BOQ"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="calendar">Calendar Type</Label>
              <Select value={calendarType} onValueChange={setCalendarType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select calendar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6-day">6-Day Week (Sat-Thu)</SelectItem>
                  <SelectItem value="5-day">5-Day Week (Sun-Thu)</SelectItem>
                  <SelectItem value="7-day">7-Day Week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Project Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDuration">Project Duration (Days)</Label>
              <Input
                id="projectDuration"
                type="number"
                value={projectDuration}
                onChange={(e) => setProjectDuration(e.target.value)}
                placeholder="Enter duration in days"
                min="1"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={generateP6Export}
              disabled={isLoading || !items || items.length === 0}
              size="lg"
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating P6 Structure...
                </>
              ) : (
                <>
                  <Network className="w-5 h-5" />
                  Generate P6 Export
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-5 h-5 text-purple-500" />
                <span className="text-sm text-muted-foreground">Project</span>
              </div>
              <span className="text-lg font-bold text-purple-600">{result.project_info.project_name}</span>
              <p className="text-xs text-muted-foreground">{result.project_info.project_type}</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">TCV</span>
              </div>
              <span className="text-lg font-bold text-green-600">
                {result.project_info.total_contract_value.toLocaleString()}
              </span>
              <p className="text-xs text-muted-foreground">{result.project_info.currency}</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-muted-foreground">Duration</span>
              </div>
              <span className="text-lg font-bold text-blue-600">{result.project_info.total_duration}</span>
              <p className="text-xs text-muted-foreground">days</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
              <div className="flex items-center gap-3 mb-2">
                <Layers className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-muted-foreground">Activities</span>
              </div>
              <span className="text-lg font-bold text-orange-600">{result.summary.total_activities}</span>
              <p className="text-xs text-muted-foreground">{result.summary.total_wbs_elements} WBS elements</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/20">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-pink-500" />
                <span className="text-sm text-muted-foreground">Cost Weight</span>
              </div>
              <span className={cn(
                "text-lg font-bold",
                Math.abs(result.summary.cost_weight_validation - 100) < 1 ? "text-green-600" : "text-yellow-600"
              )}>
                {result.summary.cost_weight_validation.toFixed(1)}%
              </span>
              <p className="text-xs text-muted-foreground">validation</p>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={exportToExcel} variant="outline" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Export to Excel
            </Button>
            <Button onClick={exportToXER} variant="outline" className="gap-2 border-purple-500 text-purple-600 hover:bg-purple-50">
              <Download className="w-4 h-4" />
              Export to XER (P6)
            </Button>
            <Button onClick={exportToPDF} variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              Export to PDF
            </Button>
            <Button onClick={() => setShowSettings(true)} variant="ghost" className="gap-2">
              <Settings className="w-4 h-4" />
              Modify Settings
            </Button>
          </div>

          {/* Activities Table */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-muted/50 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Network className="w-5 h-5" />
                P6 Activities ({result.activities.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Activity ID</TableHead>
                    <TableHead>Activity Name</TableHead>
                    <TableHead>WBS</TableHead>
                    <TableHead className="text-center">Duration</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Finish</TableHead>
                    <TableHead>Predecessors</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-center">Weight %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.activities.map((activity, idx) => (
                    <>
                      <TableRow
                        key={idx}
                        className={cn(
                          "cursor-pointer hover:bg-muted/30",
                          result.summary.critical_path_activities.includes(activity.activity_id) && "bg-red-50 dark:bg-red-950/20"
                        )}
                        onClick={() => toggleRow(idx)}
                      >
                        <TableCell>
                          {expandedRows.has(idx) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "font-mono text-xs px-2 py-1 rounded",
                            result.summary.critical_path_activities.includes(activity.activity_id)
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-primary/10 text-primary"
                          )}>
                            {activity.activity_id}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium max-w-xs truncate">
                          {activity.activity_name}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{activity.wbs_code}</span>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {activity.duration}d
                        </TableCell>
                        <TableCell className="text-sm text-green-600">
                          {activity.start_date}
                        </TableCell>
                        <TableCell className="text-sm text-red-600">
                          {activity.finish_date}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {activity.predecessors.slice(0, 3).map((pred, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                                {pred}{activity.predecessor_types[i] !== 'FS' ? activity.predecessor_types[i] : ''}
                              </span>
                            ))}
                            {activity.predecessors.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{activity.predecessors.length - 3}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {activity.cost.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2">
                            <Progress value={activity.cost_weight_percent} className="h-2 w-12" />
                            <span className="text-xs">{activity.cost_weight_percent.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(idx) && (
                        <TableRow>
                          <TableCell colSpan={10} className="bg-muted/20 p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Activity Codes</p>
                                <div className="flex flex-wrap gap-1">
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded text-xs">
                                    {activity.activity_codes.phase}
                                  </span>
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs">
                                    {activity.activity_codes.trade}
                                  </span>
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded text-xs">
                                    {activity.activity_codes.area}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Resources</p>
                                <div className="flex flex-wrap gap-1">
                                  {activity.resource_names.map((res, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded text-xs">
                                      {res} ({activity.resource_units[i] || 1})
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Calendar</p>
                                <span className="font-medium">{activity.calendar}</span>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Constraint</p>
                                <span className="font-medium">{activity.constraint_type}</span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* WBS Structure */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-muted/50 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5" />
                WBS Structure ({result.wbs_structure.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>WBS Code</TableHead>
                    <TableHead>WBS Name</TableHead>
                    <TableHead className="text-center">Level</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-center">Weight %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.wbs_structure.map((wbs, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                          {wbs.wbs_code}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium" style={{ paddingLeft: `${wbs.level * 12}px` }}>
                        {wbs.wbs_name}
                      </TableCell>
                      <TableCell className="text-center">{wbs.level}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {wbs.parent_code || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {wbs.total_cost.toLocaleString()} {currency}
                      </TableCell>
                      <TableCell className="text-center">
                        <Progress value={wbs.weight_percent} className="h-2 w-16 mx-auto" />
                        <span className="text-xs text-muted-foreground">{wbs.weight_percent.toFixed(1)}%</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!result && !showSettings && (
        <div className="flex flex-col items-center justify-center py-16 space-y-6">
          <div className="w-24 h-24 rounded-full bg-purple-500/10 flex items-center justify-center">
            <Network className="w-12 h-12 text-purple-500" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">Primavera P6 Export</h3>
            <p className="text-muted-foreground max-w-md">
              Convert your BOQ into a P6-ready schedule with WBS, activities, relationships, and cost loading.
            </p>
          </div>
          <Button onClick={() => setShowSettings(true)} size="lg" className="gap-2 bg-purple-600 hover:bg-purple-700">
            <Settings className="w-5 h-5" />
            Configure P6 Export
          </Button>
        </div>
      )}
    </div>
  );
}
