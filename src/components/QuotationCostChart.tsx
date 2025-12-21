import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";

interface QuotationItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface QuotationCostChartProps {
  items: QuotationItem[];
  currency?: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
];

export function QuotationCostChart({ items, currency = "ر.س" }: QuotationCostChartProps) {
  if (!items || items.length === 0) {
    return null;
  }

  // Prepare data for pie chart - group by description or take top items
  const chartData = items
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((item, index) => ({
      name: item.description.length > 25 
        ? item.description.substring(0, 25) + '...' 
        : item.description,
      value: item.total,
      fullName: item.description,
      color: COLORS[index % COLORS.length],
    }));

  // Add "Others" if there are more items
  const otherItems = items.slice(8);
  if (otherItems.length > 0) {
    const othersTotal = otherItems.reduce((sum, item) => sum + (item.total || 0), 0);
    if (othersTotal > 0) {
      chartData.push({
        name: 'أخرى',
        value: othersTotal,
        fullName: `${otherItems.length} بنود أخرى`,
        color: '#94a3b8',
      });
    }
  }

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalValue) * 100).toFixed(1);
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-1">{data.fullName}</p>
          <p className="text-primary font-bold">
            {data.value.toLocaleString()} {currency}
          </p>
          <p className="text-xs text-muted-foreground">
            {percentage}% من الإجمالي
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for small slices
    
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

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <PieChartIcon className="w-4 h-4" />
          توزيع تكاليف البنود
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value, entry: any) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">إجمالي التكاليف</span>
            <span className="font-bold text-lg text-primary">
              {totalValue.toLocaleString()} {currency}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
