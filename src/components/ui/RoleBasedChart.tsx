'use client';

import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Import chart registration
import '@/lib/chart-registry';

const ClientChart = dynamic(() => import("./ClientChart").then(mod => mod.ClientChart), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse bg-gray-200 rounded-lg" />,
});

import { ChartType } from '@/types/chart';

interface RoleBasedChartProps {
  type: ChartType;
  data: any[] | {
    labels: string[];
    datasets: Array<{
      label?: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      tension?: number;
      fill?: boolean;
    }>;
  };
  options?: {
    labels?: string[];
    values?: number[];
    xAxis?: string[];
    yAxis?: number[];
    series?: Array<{
      name: string;
      data: number[];
    }>;
  };
  permission?: string;
  className?: string;
  title?: string;
  description?: string;
}

export function RoleBasedChart({
  type,
  data,
  options,
  permission,
  className,
  title,
  description,
}: RoleBasedChartProps) {
  const { checkPermission } = usePermissions();

  if (permission && !checkPermission(permission)) {
    return null;
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className={cn("bg-white p-4 rounded-lg shadow", className)}>
        <div className="text-center text-gray-500">No data available</div>
      </div>
    );
  }

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: !!title,
        text: title,
      },
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
  };

  // Format data based on chart type
  const formattedData = (() => {
    switch (type) {
      case 'pie':
        // Ensure unique labels by appending index if needed
        const pieLabels = data.map((item, index) => {
          const baseLabel = item.category || item.status;
          return `${baseLabel}-${index}`;
        });
        return {
          labels: pieLabels,
          datasets: [{
            data: data.map(item => item.count || item.value),
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40',
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
            ].slice(0, data.length),
            borderColor: '#fff',
            borderWidth: 1,
          }],
        };
      case 'bar':
        // Ensure unique labels for bar chart
        const barLabels = data.map((item, index) => {
          const baseLabel = item.category || item.status;
          return `${baseLabel}-${index}`;
        });
        return {
          labels: barLabels,
          datasets: [{
            label: 'Count',
            data: data.map(item => item.count || item.value),
            backgroundColor: '#36A2EB',
            borderColor: '#36A2EB',
            borderWidth: 1,
          }],
        };
      case 'line':
        // Ensure unique labels for line chart
        const lineLabels = data.map((item, index) => {
          const baseLabel = item.year || item.month;
          return `${baseLabel}-${index}`;
        });
        return {
          labels: lineLabels,
          datasets: [{
            label: 'Value',
            data: data.map(item => item.value),
            borderColor: '#FF6384',
            tension: 0.1,
            fill: false,
          }],
        };
      default:
        return data;
    }
  })();

  return (
    <div className={cn("bg-white p-4 rounded-lg shadow", className)}>
      {title && (
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-gray-500 mb-4">{description}</p>
      )}
      <div className="relative h-[300px]">
        <ClientChart 
          key={`chart-${type}-${Math.random()}`} 
          type={type} 
          data={formattedData} 
          options={mergedOptions} 
        />
      </div>
    </div>
  );
} 