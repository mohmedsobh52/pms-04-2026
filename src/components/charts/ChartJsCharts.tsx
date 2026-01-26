import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register required Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PricingDistributionChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  isArabic: boolean;
}

export const PricingDistributionChart: React.FC<PricingDistributionChartProps> = ({ 
  data, 
  isArabic 
}) => {
  const chartData = {
    labels: data.map(item => item.name),
    datasets: [
      {
        data: data.map(item => item.value),
        backgroundColor: data.map(item => item.color),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        rtl: isArabic,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.label}: ${context.parsed}`;
          }
        }
      }
    },
  };

  return (
    <div style={{ height: '200px' }}>
      <Pie data={chartData} options={options} />
    </div>
  );
};

interface CategoryDistributionChartProps {
  data: Array<{ name: string; value: number }>;
  isArabic: boolean;
}

export const CategoryDistributionChart: React.FC<CategoryDistributionChartProps> = ({ 
  data,
  isArabic 
}) => {
  const chartData = {
    labels: data.map(item => item.name),
    datasets: [
      {
        label: isArabic ? 'عدد البنود' : 'Items Count',
        data: data.map(item => item.value),
        backgroundColor: 'hsl(var(--primary))',
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ height: '200px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

interface TopItemsChartProps {
  data: Array<{ name: string; value: number }>;
  isArabic: boolean;
  formatCurrency: (value: number) => string;
}

export const TopItemsChart: React.FC<TopItemsChartProps> = ({ 
  data, 
  isArabic, 
  formatCurrency 
}) => {
  const chartData = {
    labels: data.map(item => item.name),
    datasets: [
      {
        label: isArabic ? 'القيمة' : 'Value',
        data: data.map(item => item.value),
        backgroundColor: '#22c55e',
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return formatCurrency(context.parsed.y);
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            const num = Number(value);
            if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
            if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
            return num;
          }
        }
      },
    },
  };

  return (
    <div style={{ height: '200px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};
