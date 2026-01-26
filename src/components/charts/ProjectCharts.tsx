import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface PricingDistributionChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  isArabic: boolean;
}

// ✅ Standard functional component - no forwardRef needed for recharts
export const PricingDistributionChart: React.FC<PricingDistributionChartProps> = ({ 
  data, 
  isArabic 
}) => {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => [value, isArabic ? "عدد" : "Count"]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

interface CategoryDistributionChartProps {
  data: Array<{ name: string; value: number }>;
  isArabic: boolean;
}

// ✅ Standard functional component - no forwardRef needed for recharts
export const CategoryDistributionChart: React.FC<CategoryDistributionChartProps> = ({ 
  data,
  isArabic 
}) => {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" />
        <YAxis 
          dataKey="name" 
          type="category" 
          width={80} 
          tick={{ fontSize: 11 }}
          tickFormatter={(value) => value.length > 10 ? `${value.slice(0, 10)}...` : value}
        />
        <Tooltip />
        <Bar 
          dataKey="value" 
          fill="hsl(var(--primary))" 
          radius={[0, 4, 4, 0]} 
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

interface TopItemsChartProps {
  data: Array<{ name: string; value: number }>;
  isArabic: boolean;
  formatCurrency: (value: number) => string;
}

// ✅ Standard functional component - no forwardRef needed for recharts
export const TopItemsChart: React.FC<TopItemsChartProps> = ({ 
  data, 
  isArabic, 
  formatCurrency 
}) => {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 10 }}
          tickFormatter={(value) => value.length > 8 ? `${value.slice(0, 8)}...` : value}
        />
        <YAxis 
          tickFormatter={(value) => 
            value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` :
            value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value
          }
        />
        <Tooltip 
          formatter={(value: number) => [formatCurrency(value), isArabic ? "القيمة" : "Value"]}
        />
        <Bar 
          dataKey="value" 
          fill="#22c55e" 
          radius={[4, 4, 0, 0]} 
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
