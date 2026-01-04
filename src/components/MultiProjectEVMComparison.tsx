import { useState, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  X,
  BarChart3,
  Download,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell
} from "recharts";

interface ProjectEVMData {
  id: string;
  name: string;
  bac: number;
  actualProgress: number;
  actualSpent: number;
  plannedProgress: number;
  currency?: string;
  color?: string;
}

interface MultiProjectEVMComparisonProps {
  initialProjects?: ProjectEVMData[];
  currency?: string;
}

const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", 
  "#06b6d4", "#3b82f6", "#ef4444", "#84cc16", "#14b8a6"
];

export function MultiProjectEVMComparison({
  initialProjects = [],
  currency = "SAR",
}: MultiProjectEVMComparisonProps) {
  const { isArabic } = useLanguage();
  const [projects, setProjects] = useState<ProjectEVMData[]>(initialProjects);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProject, setNewProject] = useState<Partial<ProjectEVMData>>({
    name: "",
    bac: 1000000,
    actualProgress: 50,
    actualSpent: 500000,
    plannedProgress: 50,
  });

  // Calculate EVM metrics for each project
  const projectMetrics = useMemo(() => {
    return projects.map((project, index) => {
      const pv = project.bac * (project.plannedProgress / 100);
      const ev = project.bac * (project.actualProgress / 100);
      const ac = project.actualSpent;

      const sv = ev - pv;
      const cv = ev - ac;
      const spi = pv > 0 ? ev / pv : 1;
      const cpi = ac > 0 ? ev / ac : 1;
      const eac = cpi > 0 ? project.bac / cpi : project.bac;
      const vac = project.bac - eac;

      return {
        ...project,
        pv, ev, ac, sv, cv, spi, cpi, eac, vac,
        color: project.color || PROJECT_COLORS[index % PROJECT_COLORS.length],
      };
    });
  }, [projects]);

  // Prepare chart data
  const barChartData = useMemo(() => {
    return projectMetrics.map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + "..." : p.name,
      fullName: p.name,
      SPI: Number(p.spi.toFixed(2)),
      CPI: Number(p.cpi.toFixed(2)),
      color: p.color,
    }));
  }, [projectMetrics]);

  const radarData = useMemo(() => {
    const metrics = ["SPI", "CPI", "Progress", "Cost Eff.", "Schedule"];
    return metrics.map(metric => {
      const dataPoint: any = { metric };
      projectMetrics.forEach(p => {
        let value = 0;
        switch (metric) {
          case "SPI": value = p.spi * 100; break;
          case "CPI": value = p.cpi * 100; break;
          case "Progress": value = p.actualProgress; break;
          case "Cost Eff.": value = Math.min(100, (p.ev / p.ac) * 100); break;
          case "Schedule": value = Math.min(100, (p.ev / p.pv) * 100); break;
        }
        dataPoint[p.name] = Math.min(150, Math.max(0, value));
      });
      return dataPoint;
    });
  }, [projectMetrics]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toFixed(0);
  };

  const addProject = () => {
    if (newProject.name && newProject.bac) {
      const project: ProjectEVMData = {
        id: `project-${Date.now()}`,
        name: newProject.name,
        bac: newProject.bac || 1000000,
        actualProgress: newProject.actualProgress || 50,
        actualSpent: newProject.actualSpent || 500000,
        plannedProgress: newProject.plannedProgress || 50,
        currency,
        color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
      };
      setProjects([...projects, project]);
      setNewProject({
        name: "",
        bac: 1000000,
        actualProgress: 50,
        actualSpent: 500000,
        plannedProgress: 50,
      });
      setShowAddDialog(false);
    }
  };

  const removeProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-4 text-sm">
              <span style={{ color: entry.fill || entry.color }}>{entry.name}</span>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>
                {isArabic ? "مقارنة EVM لعدة مشاريع" : "Multi-Project EVM Comparison"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isArabic 
                  ? `مقارنة أداء ${projects.length} مشروع(ات)` 
                  : `Comparing ${projects.length} project(s) performance`}
              </p>
            </div>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                {isArabic ? "إضافة مشروع" : "Add Project"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isArabic ? "إضافة مشروع للمقارنة" : "Add Project for Comparison"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "اسم المشروع" : "Project Name"}</Label>
                  <Input
                    value={newProject.name || ""}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder={isArabic ? "أدخل اسم المشروع" : "Enter project name"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "الميزانية (BAC)" : "Budget (BAC)"}</Label>
                    <Input
                      type="number"
                      value={newProject.bac || ""}
                      onChange={(e) => setNewProject({ ...newProject, bac: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "التكلفة الفعلية" : "Actual Cost"}</Label>
                    <Input
                      type="number"
                      value={newProject.actualSpent || ""}
                      onChange={(e) => setNewProject({ ...newProject, actualSpent: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "التقدم الفعلي %" : "Actual Progress %"}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newProject.actualProgress || ""}
                      onChange={(e) => setNewProject({ ...newProject, actualProgress: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "التقدم المخطط %" : "Planned Progress %"}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newProject.plannedProgress || ""}
                      onChange={(e) => setNewProject({ ...newProject, plannedProgress: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <Button onClick={addProject} className="w-full">
                  {isArabic ? "إضافة" : "Add"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {isArabic ? "لا توجد مشاريع للمقارنة" : "No projects to compare"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isArabic 
                ? "أضف مشروعين أو أكثر لبدء المقارنة" 
                : "Add two or more projects to start comparison"}
            </p>
            <Button onClick={() => setShowAddDialog(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              {isArabic ? "إضافة مشروع" : "Add Project"}
            </Button>
          </div>
        ) : (
          <>
            {/* Projects List */}
            <div className="flex flex-wrap gap-2">
              {projectMetrics.map((project) => (
                <Badge
                  key={project.id}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-1.5"
                  style={{ borderColor: project.color, borderWidth: 2 }}
                >
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: project.color }}
                  />
                  <span>{project.name}</span>
                  <span className="text-xs text-muted-foreground">
                    SPI: {project.spi.toFixed(2)} | CPI: {project.cpi.toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeProject(project.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SPI/CPI Bar Chart */}
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="text-sm font-medium mb-4">
                  {isArabic ? "مقارنة SPI و CPI" : "SPI & CPI Comparison"}
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 2]} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="SPI" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="CPI" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Radar Chart */}
              {projects.length >= 2 && (
                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="text-sm font-medium mb-4">
                    {isArabic ? "مقارنة الأداء الشامل" : "Overall Performance Comparison"}
                  </h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 150]} tick={{ fontSize: 9 }} />
                      {projectMetrics.map((project) => (
                        <Radar
                          key={project.id}
                          name={project.name}
                          dataKey={project.name}
                          stroke={project.color}
                          fill={project.color}
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      ))}
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Detailed Metrics Table */}
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right p-3 font-medium">{isArabic ? "المشروع" : "Project"}</th>
                    <th className="text-center p-3 font-medium">BAC</th>
                    <th className="text-center p-3 font-medium">EV</th>
                    <th className="text-center p-3 font-medium">AC</th>
                    <th className="text-center p-3 font-medium">SPI</th>
                    <th className="text-center p-3 font-medium">CPI</th>
                    <th className="text-center p-3 font-medium">EAC</th>
                    <th className="text-center p-3 font-medium">VAC</th>
                  </tr>
                </thead>
                <tbody>
                  {projectMetrics.map((project, index) => (
                    <tr key={project.id} className={cn("border-t", index % 2 === 0 && "bg-muted/20")}>
                      <td className="p-3 font-medium">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: project.color }}
                          />
                          {project.name}
                        </div>
                      </td>
                      <td className="text-center p-3">{formatCurrency(project.bac)}</td>
                      <td className="text-center p-3">{formatCurrency(project.ev)}</td>
                      <td className="text-center p-3">{formatCurrency(project.ac)}</td>
                      <td className={cn(
                        "text-center p-3 font-medium",
                        project.spi >= 1 ? "text-green-600" : project.spi >= 0.9 ? "text-amber-600" : "text-red-600"
                      )}>
                        {project.spi.toFixed(2)}
                      </td>
                      <td className={cn(
                        "text-center p-3 font-medium",
                        project.cpi >= 1 ? "text-green-600" : project.cpi >= 0.9 ? "text-amber-600" : "text-red-600"
                      )}>
                        {project.cpi.toFixed(2)}
                      </td>
                      <td className="text-center p-3">{formatCurrency(project.eac)}</td>
                      <td className={cn(
                        "text-center p-3 font-medium",
                        project.vac >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {project.vac >= 0 ? "+" : ""}{formatCurrency(project.vac)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
