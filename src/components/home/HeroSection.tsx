import { PMSLogo } from "@/components/PMSLogo";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Layers, DollarSign, Users } from "lucide-react";

interface ProjectDistribution {
  name: string;
  value: number;
  color: string;
}

interface HeroSectionProps {
  stats?: {
    totalProjects: number;
    totalItems: number;
    totalValue: number;
  };
  recentTrend?: { value: number }[];
  projectDistribution?: ProjectDistribution[];
}

export function HeroSection({ stats, recentTrend, projectDistribution }: HeroSectionProps) {
  const { isArabic } = useLanguage();

  const formatCurrency = (value: number) => {
    if (value == null) return '0';
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString();
  };

  // Calculate progress based on projects (example: out of 100 target)
  const projectsProgress = stats ? Math.min((stats.totalProjects / 100) * 100, 100) : 0;
  const progressOffset = 176 - (projectsProgress * 1.76);

  // Generate sample sparkline data if not provided
  const sparklineData = recentTrend || [
    { value: 30 }, { value: 45 }, { value: 35 }, { value: 50 }, 
    { value: 40 }, { value: 60 }, { value: 55 }
  ];

  // Default project distribution if not provided
  const defaultDistribution: ProjectDistribution[] = [
    { name: isArabic ? "نشط" : "Active", value: 45, color: "#22c55e" },
    { name: isArabic ? "معلق" : "Pending", value: 25, color: "#f59e0b" },
    { name: isArabic ? "مكتمل" : "Completed", value: 30, color: "#3b82f6" }
  ];

  const distribution = projectDistribution?.length ? projectDistribution : defaultDistribution;
  const totalDistribution = distribution.reduce((sum, d) => sum + d.value, 0);

  return (
    <section className="relative py-6 md:py-8 overflow-hidden">
      {/* Content */}
      <div className="relative z-10 space-y-5">
        {/* Logo & Title Row */}
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <PMSLogo size="lg" className="drop-shadow-xl" />
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                PMS
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl mx-auto">
              {isArabic 
                ? "نظام متكامل لإدارة المشاريع الإنشائية"
                : "Comprehensive Construction Project Management"
              }
            </p>
          </div>
        </div>
        
        {/* Enhanced Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {/* Progress Ring - Projects */}
            <div className="flex items-center gap-3 bg-card/70 backdrop-blur-md rounded-xl px-3 py-3 border border-border/40 shadow-lg hover:bg-card/80 transition-all group">
              <div className="relative w-12 h-12 shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle 
                    cx="24" cy="24" r="20" 
                    className="fill-none stroke-muted/30 stroke-[3]" 
                  />
                  <circle 
                    cx="24" cy="24" r="20" 
                    className="fill-none stroke-primary stroke-[3] transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                    strokeDasharray="126"
                    strokeDashoffset={126 - (projectsProgress * 1.26)}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">
                  {stats.totalProjects}
                </span>
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] text-muted-foreground truncate">{isArabic ? "المشاريع" : "Projects"}</span>
                <span className="block text-sm font-semibold text-foreground">{isArabic ? "نشط" : "Active"}</span>
              </div>
            </div>

            {/* Mini Pie Chart - Distribution */}
            <div className="flex items-center gap-3 bg-card/70 backdrop-blur-md rounded-xl px-3 py-3 border border-border/40 shadow-lg hover:bg-card/80 transition-all group">
              <div className="w-12 h-12 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={12}
                      outerRadius={22}
                      dataKey="value"
                      strokeWidth={0}
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] text-muted-foreground truncate mb-0.5">
                  {isArabic ? "التوزيع" : "Status"}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {distribution.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[9px] text-muted-foreground">
                        {totalDistribution > 0 ? Math.round((item.value / totalDistribution) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sparkline Trend */}
            <div className="flex items-center gap-3 bg-card/70 backdrop-blur-md rounded-xl px-3 py-3 border border-border/40 shadow-lg hover:bg-card/80 transition-all group">
              <div className="w-16 h-10 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData}>
                    <defs>
                      <linearGradient id="heroSparkline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      fill="url(#heroSparkline)" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] text-muted-foreground truncate">{isArabic ? "الاتجاه" : "Trend"}</span>
                <span className="flex items-center gap-1 text-sm font-semibold text-green-500">
                  <TrendingUp className="w-3 h-3" />
                  12%
                </span>
              </div>
            </div>

            {/* Items Count */}
            <div className="flex items-center gap-3 bg-card/70 backdrop-blur-md rounded-xl px-3 py-3 border border-border/40 shadow-lg hover:bg-card/80 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] text-muted-foreground truncate">{isArabic ? "البنود" : "Items"}</span>
                <span className="block text-lg font-bold">{stats.totalItems.toLocaleString()}</span>
              </div>
            </div>
            
            {/* Total Value */}
            <div className="flex items-center gap-3 bg-card/70 backdrop-blur-md rounded-xl px-3 py-3 border border-border/40 shadow-lg hover:bg-card/80 transition-all group col-span-2 md:col-span-1">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] text-muted-foreground truncate">{isArabic ? "القيمة" : "Value"}</span>
                <span className="block text-lg font-bold">{formatCurrency(stats.totalValue)} <span className="text-xs text-muted-foreground">SAR</span></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
