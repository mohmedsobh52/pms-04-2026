import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, ZoomIn, ZoomOut, Calendar, DollarSign } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import jsPDF from "jspdf";

interface Activity {
  id: string;
  name: string;
  wbs?: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  cost: number;
  costWeight: number;
  isCritical?: boolean;
  predecessors?: string[];
}

interface GanttChartProps {
  activities: Activity[];
  projectStartDate: Date;
  projectEndDate: Date;
  currency?: string;
  title?: string;
}

export function GanttChart({
  activities,
  projectStartDate,
  projectEndDate,
  currency = "SAR",
  title = "Cost Flow Timeline"
}: GanttChartProps) {
  const { t, isArabic } = useLanguage();
  const chartRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<"days" | "weeks" | "months">("weeks");
  const [hoveredActivity, setHoveredActivity] = useState<string | null>(null);

  // Calculate timeline
  const totalDays = Math.ceil((projectEndDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24)) || 30;
  
  const getTimeUnits = () => {
    switch (zoom) {
      case "days":
        return Array.from({ length: Math.min(totalDays, 90) }, (_, i) => {
          const date = new Date(projectStartDate);
          date.setDate(date.getDate() + i);
          return {
            label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            start: i,
            width: 1
          };
        });
      case "weeks":
        const weeks = Math.ceil(totalDays / 7);
        return Array.from({ length: weeks }, (_, i) => {
          const date = new Date(projectStartDate);
          date.setDate(date.getDate() + i * 7);
          return {
            label: `W${i + 1} (${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
            start: i * 7,
            width: 7
          };
        });
      case "months":
        const months = Math.ceil(totalDays / 30);
        return Array.from({ length: months }, (_, i) => {
          const date = new Date(projectStartDate);
          date.setMonth(date.getMonth() + i);
          return {
            label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            start: i * 30,
            width: 30
          };
        });
    }
  };

  const timeUnits = getTimeUnits();
  const unitWidth = zoom === "days" ? 40 : zoom === "weeks" ? 100 : 120;
  const chartWidth = timeUnits.length * unitWidth;

  // Calculate bar position and width
  const getBarStyle = (activity: Activity) => {
    const startOffset = Math.max(0, Math.ceil((activity.startDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24)));
    const endOffset = Math.ceil((activity.endDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const left = (startOffset / totalDays) * chartWidth;
    const width = Math.max(((endOffset - startOffset) / totalDays) * chartWidth, 20);
    
    // Color intensity based on cost weight (0-100%)
    const intensity = Math.min(activity.costWeight / 10, 1); // Normalize: 10% = max intensity
    const baseColor = activity.isCritical ? 'destructive' : 'primary';
    
    return {
      left: `${left}px`,
      width: `${width}px`,
      opacity: 0.4 + intensity * 0.6, // Range from 0.4 to 1.0
    };
  };

  // Export to PNG/PDF
  const exportChart = async (format: "png" | "pdf") => {
    if (!chartRef.current) return;

    // Create canvas from the chart
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chartElement = chartRef.current;
    const rect = chartElement.getBoundingClientRect();
    
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    
    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Draw title
    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 16px Inter, system-ui';
    ctx.fillText(title, 20, 30);
    
    // Draw timeline header
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(200, 50, rect.width - 220, 30);
    
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Inter, system-ui';
    timeUnits.forEach((unit, i) => {
      const x = 200 + (i * unitWidth);
      ctx.fillText(unit.label, x + 5, 70);
    });
    
    // Draw activities
    activities.forEach((activity, index) => {
      const y = 90 + index * 40;
      
      // Activity name
      ctx.fillStyle = '#1e293b';
      ctx.font = '11px Inter, system-ui';
      const displayName = activity.name.length > 25 ? activity.name.slice(0, 25) + '...' : activity.name;
      ctx.fillText(displayName, 10, y + 20);
      
      // Bar
      const barStyle = getBarStyle(activity);
      const barLeft = parseFloat(barStyle.left) + 200;
      const barWidth = parseFloat(barStyle.width);
      
      ctx.fillStyle = activity.isCritical ? '#dc2626' : '#1e40af';
      ctx.globalAlpha = parseFloat(String(barStyle.opacity));
      ctx.fillRect(barLeft, y + 5, barWidth, 25);
      ctx.globalAlpha = 1;
      
      // Cost weight text on bar
      if (barWidth > 40) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Inter, system-ui';
        ctx.fillText(`${activity.costWeight.toFixed(1)}%`, barLeft + 5, y + 22);
      }
    });

    if (format === "png") {
      const link = document.createElement('a');
      link.download = `gantt-chart-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } else {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));
      pdf.save(`gantt-chart-${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };

  // Calculate monthly cost distribution
  const getMonthlyCosts = () => {
    const months: { [key: string]: number } = {};
    
    activities.forEach(activity => {
      const startMonth = activity.startDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!months[startMonth]) months[startMonth] = 0;
      months[startMonth] += activity.cost;
    });
    
    return Object.entries(months).map(([month, cost]) => ({ month, cost }));
  };

  const monthlyCosts = getMonthlyCosts();
  const maxMonthlyCost = Math.max(...monthlyCosts.map(m => m.cost), 1);

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={zoom} onValueChange={(v: "days" | "weeks" | "months") => setZoom(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="days">Days</SelectItem>
              <SelectItem value="weeks">Weeks</SelectItem>
              <SelectItem value="months">Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => exportChart("png")}>
            <Download className="w-4 h-4 mr-2" />
            PNG
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportChart("pdf")}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Monthly Cost Distribution */}
        <div className="mb-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-success" />
            Monthly Cost Distribution
          </h4>
          <div className="flex items-end gap-2 h-24">
            {monthlyCosts.map((item, index) => (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                        style={{ height: `${(item.cost / maxMonthlyCost) * 80}px` }}
                      />
                      <span className="text-xs text-muted-foreground mt-1">{item.month}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{item.month}</p>
                    <p>{currency} {item.cost.toLocaleString()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {/* Gantt Chart */}
        <div ref={chartRef} className="overflow-x-auto">
          <div className="min-w-max">
            {/* Timeline Header */}
            <div className="flex border-b border-border">
              <div className="w-48 shrink-0 p-2 bg-muted/50 font-semibold text-sm">
                Activity
              </div>
              <div className="flex bg-muted/30">
                {timeUnits.map((unit, i) => (
                  <div
                    key={i}
                    className="text-xs text-muted-foreground p-2 border-r border-border/30 text-center"
                    style={{ width: `${unitWidth}px` }}
                  >
                    {unit.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Activities */}
            <div className="divide-y divide-border/30">
              {activities.map((activity, index) => {
                const barStyle = getBarStyle(activity);
                const isHovered = hoveredActivity === activity.id;
                
                return (
                  <div
                    key={activity.id}
                    className={`flex items-center transition-colors ${isHovered ? 'bg-muted/50' : ''}`}
                    onMouseEnter={() => setHoveredActivity(activity.id)}
                    onMouseLeave={() => setHoveredActivity(null)}
                  >
                    {/* Activity Name */}
                    <div className="w-48 shrink-0 p-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-default">
                              <p className="text-sm font-medium truncate">{activity.name}</p>
                              {activity.wbs && (
                                <p className="text-xs text-muted-foreground">{activity.wbs}</p>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">{activity.name}</p>
                              {activity.wbs && <p className="text-xs">WBS: {activity.wbs}</p>}
                              <p className="text-xs">Duration: {activity.duration} days</p>
                              <p className="text-xs">Cost: {currency} {activity.cost.toLocaleString()}</p>
                              <p className="text-xs">Weight: {activity.costWeight.toFixed(2)}%</p>
                              <p className="text-xs">
                                {activity.startDate.toLocaleDateString()} - {activity.endDate.toLocaleDateString()}
                              </p>
                              {activity.isCritical && (
                                <p className="text-xs text-destructive font-semibold">Critical Path</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    {/* Gantt Bar */}
                    <div 
                      className="relative h-10 flex items-center"
                      style={{ width: `${chartWidth}px` }}
                    >
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex">
                        {timeUnits.map((_, i) => (
                          <div
                            key={i}
                            className="border-r border-border/20"
                            style={{ width: `${unitWidth}px` }}
                          />
                        ))}
                      </div>
                      
                      {/* Bar */}
                      <div
                        className={`absolute h-6 rounded gantt-bar ${
                          activity.isCritical ? 'bg-destructive' : 'bg-primary'
                        }`}
                        style={{
                          left: barStyle.left,
                          width: barStyle.width,
                          opacity: barStyle.opacity,
                        }}
                      >
                        {parseFloat(barStyle.width) > 50 && (
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-primary-foreground">
                            {activity.costWeight.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary opacity-60" />
            <span>Normal Activity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive opacity-60" />
            <span>Critical Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary opacity-100" />
            <span>High Cost Weight</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary opacity-40" />
            <span>Low Cost Weight</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
