import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { PieChart as PieChartIcon, BarChart3 } from "lucide-react";

interface TenderChartsProps {
  isArabic: boolean;
  totals: {
    staffCosts: number;
    facilitiesCosts: number;
    insuranceCosts: number;
    guaranteesCosts: number;
    indirectCosts: number;
  };
  directCosts?: number;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function TenderCharts({ isArabic, totals, directCosts = 0 }: TenderChartsProps) {
  const pieData = [
    { 
      name: isArabic ? "طاقم الموقع" : "Site Staff", 
      value: totals.staffCosts,
      color: COLORS[0]
    },
    { 
      name: isArabic ? "المرافق" : "Facilities", 
      value: totals.facilitiesCosts,
      color: COLORS[1]
    },
    { 
      name: isArabic ? "التأمين" : "Insurance", 
      value: totals.insuranceCosts,
      color: COLORS[2]
    },
    { 
      name: isArabic ? "الضمانات" : "Guarantees", 
      value: totals.guaranteesCosts,
      color: COLORS[3]
    },
    { 
      name: isArabic ? "تكاليف غير مباشرة" : "Indirect Costs", 
      value: totals.indirectCosts,
      color: COLORS[4]
    },
  ].filter(item => item.value > 0);

  const barData = [
    { 
      name: isArabic ? "طاقم الموقع" : "Staff", 
      value: totals.staffCosts,
      fill: COLORS[0]
    },
    { 
      name: isArabic ? "المرافق" : "Facilities", 
      value: totals.facilitiesCosts,
      fill: COLORS[1]
    },
    { 
      name: isArabic ? "التأمين" : "Insurance", 
      value: totals.insuranceCosts,
      fill: COLORS[2]
    },
    { 
      name: isArabic ? "الضمانات" : "Guarantees", 
      value: totals.guaranteesCosts,
      fill: COLORS[3]
    },
    { 
      name: isArabic ? "غير مباشرة" : "Indirect", 
      value: totals.indirectCosts,
      fill: COLORS[4]
    },
  ];

  const totalIndirect = totals.staffCosts + totals.facilitiesCosts + totals.insuranceCosts + totals.guaranteesCosts + totals.indirectCosts;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toFixed(0);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium">{payload[0].name || payload[0].payload?.name}</p>
          <p className="text-primary font-bold">
            SAR {new Intl.NumberFormat("en-US").format(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (totalIndirect === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{isArabic ? "لا توجد بيانات لعرضها" : "No data to display"}</p>
            <p className="text-sm mt-2">
              {isArabic ? "أضف بيانات في التبويبات الأخرى لعرض الرسوم البيانية" : "Add data in other tabs to display charts"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pie Chart - Cost Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="w-5 h-5 text-primary" />
            {isArabic ? "توزيع التكاليف" : "Cost Distribution"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ paddingTop: "20px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart - Section Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5 text-primary" />
            {isArabic ? "مقارنة الأقسام" : "Section Comparison"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis 
                  type="number" 
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={80}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  radius={[0, 4, 4, 0]}
                  label={{ 
                    position: "right", 
                    formatter: formatCurrency,
                    fill: "hsl(var(--foreground))",
                    fontSize: 11
                  }}
                >
                  {barData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
