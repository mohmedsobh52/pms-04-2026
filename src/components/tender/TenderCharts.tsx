import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { EmptyState } from "@/components/ui/page-skeleton";

interface TenderChartsProps {
  isArabic: boolean;
  totals: {
    staffCosts: number;
    facilitiesCosts: number;
    insuranceCosts: number;
    guaranteesCosts: number;
    indirectCosts: number;
    subcontractorsCosts: number;
  };
  directCosts?: number;
}

const COLORS = [
  "hsl(142 71% 45%)",
  "hsl(217 91% 60%)",
  "hsl(160 84% 39%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(262 83% 58%)",
  "hsl(189 94% 43%)",
];

export function TenderCharts({ isArabic, totals, directCosts = 0 }: TenderChartsProps) {
  // Build pie data with direct costs first if available
  const basePieData = [
    ...(directCosts > 0 ? [{ 
      name: isArabic ? "التكاليف المباشرة (BOQ)" : "Direct Costs (BOQ)", 
      value: directCosts,
      color: COLORS[0] // Green for direct costs
    }] : []),
    { 
      name: isArabic ? "طاقم الموقع" : "Site Staff", 
      value: totals.staffCosts || 0,
      color: COLORS[1]
    },
    { 
      name: isArabic ? "المرافق" : "Facilities", 
      value: totals.facilitiesCosts || 0,
      color: COLORS[2]
    },
    { 
      name: isArabic ? "التأمين" : "Insurance", 
      value: totals.insuranceCosts || 0,
      color: COLORS[3]
    },
    { 
      name: isArabic ? "الضمانات" : "Guarantees", 
      value: totals.guaranteesCosts || 0,
      color: COLORS[4]
    },
    { 
      name: isArabic ? "تكاليف غير مباشرة" : "Indirect Costs", 
      value: totals.indirectCosts || 0,
      color: COLORS[5]
    },
    { 
      name: isArabic ? "مقاولي الباطن" : "Subcontractors", 
      value: totals.subcontractorsCosts || 0,
      color: COLORS[6]
    },
  ].filter(item => item.value > 0);

  const pieData = basePieData;

  const barData = [
    ...(directCosts > 0 ? [{ 
      name: isArabic ? "مباشرة" : "Direct", 
      value: directCosts,
      fill: COLORS[0]
    }] : []),
    { 
      name: isArabic ? "طاقم الموقع" : "Staff", 
      value: totals.staffCosts || 0,
      fill: COLORS[1]
    },
    { 
      name: isArabic ? "المرافق" : "Facilities", 
      value: totals.facilitiesCosts || 0,
      fill: COLORS[2]
    },
    { 
      name: isArabic ? "التأمين" : "Insurance", 
      value: totals.insuranceCosts || 0,
      fill: COLORS[3]
    },
    { 
      name: isArabic ? "الضمانات" : "Guarantees", 
      value: totals.guaranteesCosts || 0,
      fill: COLORS[4]
    },
    { 
      name: isArabic ? "غير مباشرة" : "Indirect", 
      value: totals.indirectCosts || 0,
      fill: COLORS[5]
    },
    { 
      name: isArabic ? "مقاولين" : "Subcontractors", 
      value: totals.subcontractorsCosts || 0,
      fill: COLORS[6]
    },
  ];

  const totalIndirect = totals.staffCosts + totals.facilitiesCosts + totals.insuranceCosts + totals.guaranteesCosts + totals.indirectCosts + (totals.subcontractorsCosts || 0);
  const grandTotal = directCosts + totalIndirect;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toFixed(0);
  };

  const tooltipFormatter = (value: any) =>
    `SAR ${new Intl.NumberFormat("en-US").format(value)}`;

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

  if (grandTotal === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6">
          <EmptyState
            icon={BarChart3}
            title={isArabic ? "لا توجد بيانات لعرضها" : "No data to display"}
            description={
              isArabic
                ? "أضف بيانات في التبويبات الأخرى لعرض الرسوم البيانية"
                : "Add data in other tabs to display charts"
            }
          />
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
