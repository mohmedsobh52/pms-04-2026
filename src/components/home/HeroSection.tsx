import { PMSLogo } from "@/components/PMSLogo";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface HeroSectionProps {
  stats?: {
    totalProjects: number;
    totalItems: number;
    totalValue: number;
  };
  recentTrend?: { value: number }[];
}

export function HeroSection({ stats, recentTrend }: HeroSectionProps) {
  const { isArabic } = useLanguage();

  const formatCurrency = (value: number) => {
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

  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-primary/5 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 md:w-72 h-48 md:h-72 bg-accent/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-40 md:w-64 h-40 md:h-64 bg-purple-500/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center space-y-6">
        {/* Animated Logo */}
        <div className="flex items-center justify-center gap-4 animate-fade-in">
          <PMSLogo size="xl" className="drop-shadow-2xl" />
        </div>
        
        {/* Title with Gradient */}
        <h1 className="text-4xl md:text-6xl font-bold animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            PMS
          </span>
        </h1>
        
        {/* Subtitle */}
        <p 
          className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4 animate-slide-up"
          style={{ animationDelay: '0.3s' }}
        >
          {isArabic 
            ? "نظام متكامل لإدارة المشاريع الإنشائية - من التحليل إلى التسليم"
            : "Comprehensive Construction Project Management - From Analysis to Delivery"
          }
        </p>
        
        {/* Enhanced Stats with Progress Ring and Sparkline */}
        {stats && (
          <div 
            className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-sm animate-fade-in pt-4"
            style={{ animationDelay: '0.4s' }}
          >
            {/* Progress Ring */}
            <div className="flex items-center gap-3 bg-card/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border/50 shadow-lg">
              <div className="relative w-14 h-14">
                <svg className="w-full h-full transform -rotate-90">
                  <circle 
                    cx="28" cy="28" r="24" 
                    className="fill-none stroke-muted/30 stroke-[4]" 
                  />
                  <circle 
                    cx="28" cy="28" r="24" 
                    className="fill-none stroke-primary stroke-[4] transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                    strokeDasharray="151"
                    strokeDashoffset={progressOffset}
                    style={{ animation: 'progressRing 1.5s ease-out forwards' }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">
                  {stats.totalProjects}
                </span>
              </div>
              <div className="text-start">
                <span className="block text-xs text-muted-foreground">{isArabic ? "المشاريع" : "Projects"}</span>
                <span className="block text-sm font-semibold text-foreground">{isArabic ? "نشط" : "Active"}</span>
              </div>
            </div>

            {/* Sparkline Trend */}
            <div className="flex items-center gap-3 bg-card/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border/50 shadow-lg">
              <div className="w-20 h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData}>
                    <defs>
                      <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      fill="url(#sparklineGradient)" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-start">
                <span className="block text-xs text-muted-foreground">{isArabic ? "الاتجاه" : "Trend"}</span>
                <span className="block text-sm font-semibold text-green-500">↑ 12%</span>
              </div>
            </div>

            {/* Quick Stats with Enhanced Styling */}
            <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border/50 shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50" />
              <span className="font-medium">{stats.totalItems.toLocaleString()}</span>
              <span className="text-muted-foreground">{isArabic ? "بند" : "Items"}</span>
            </div>
            
            <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border/50 shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shadow-lg shadow-purple-500/50" style={{ animationDelay: '0.5s' }} />
              <span className="font-medium">{formatCurrency(stats.totalValue)}</span>
              <span className="text-muted-foreground">SAR</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
