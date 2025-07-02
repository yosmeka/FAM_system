'use client';

import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Import chart registration
import '@/lib/chart-registry';

// Import custom HeatMap component
import { HeatMap } from './HeatMap';

const ClientChart = dynamic(() => import("./ClientChart").then(mod => mod.ClientChart), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse bg-gray-200 rounded-lg" />,
});

import { ChartType } from '@/types/chart';

export interface ChartDataItem {
  category?: string;
  status?: string;
  year?: string;
  month?: string;
  count?: number;
  value?: number;
}

interface RoleBasedChartProps {
  type: ChartType;
  data: ChartDataItem[] | {
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
    yAxis?: string[];
    series?: Array<{
      name: string;
      data: number[];
    }>;
    customColors?: string[];
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

  // Check if data is empty
  const isEmptyData = () => {
    if (!data) return true;

    // For array data
    if (Array.isArray(data) && data.length === 0) return true;

    // For heatmap data with options
    if (type === 'heatmap' && options) {
      if (!options.xAxis || options.xAxis.length === 0) return true;
      if (!options.yAxis || options.yAxis.length === 0) return true;
      if (!options.values || options.values.length === 0) return true;
    }

    return false;
  };

  if (isEmptyData()) {
    return (
      <div className={cn("bg-white dark:bg-gray-800 p-4 rounded-lg shadow", className)}>
        {title && (
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </h3>
        )}
        <div className="text-center text-gray-500 dark:text-gray-400 py-10">No data available</div>
      </div>
    );
  }

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: 'rgb(156, 163, 175)', // text-gray-400
        },
      },
      title: {
        display: !!title,
        text: title,
        color: 'rgb(17, 24, 39)', // text-gray-900
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)', // text-gray-400 with opacity
        },
        ticks: {
          color: 'rgb(156, 163, 175)', // text-gray-400
        },
      },
      y: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)', // text-gray-400 with opacity
        },
        ticks: {
          color: 'rgb(156, 163, 175)', // text-gray-400
        },
      },
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
  };

  // Format data based on chart type
  const formattedData = (() => {
    if (!Array.isArray(data)) {
      return data;
    }

    switch (type) {
      case 'heatmap':
        if (!options || !options.xAxis || !options.yAxis || !options.values) {
          console.error('Missing required options for heatmap chart');
          return {
            labels: ['No Data'],
            datasets: [{
              label: 'No Data',
              data: [0],
              backgroundColor: '#f0f0f0',
            }]
          };
        }

        // Create a heatmap using a modified bar chart
        const xLabels = options.xAxis || [];
        const yLabels = options.yAxis || [];
        const values = options.values || [];

        // Create a simple dataset for heatmap visualization
        return {
          labels: xLabels,
          datasets: [{
            label: 'Transfers',
            data: values,
            backgroundColor: values.map(value => {
              // Color gradient based on value
              if (value === 0) return 'rgba(220, 220, 220, 0.5)';
              if (value < 3) return 'rgba(54, 162, 235, 0.3)';
              if (value < 6) return 'rgba(54, 162, 235, 0.6)';
              return 'rgba(54, 162, 235, 0.9)';
            }),
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          }]
        };

      case 'pie':
        // Ensure unique labels by appending index if needed
        const pieLabels = data.map((item: ChartDataItem, index: number) => {
          const baseLabel = item.category || item.status || `Item ${index + 1}`;
          return baseLabel;
        });
        return {
          labels: pieLabels,
          datasets: [{
            data: data.map((item: ChartDataItem) => item.count || item.value || 0),
            backgroundColor: options?.customColors || [
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
        const barLabels = data.map((item: ChartDataItem, index: number) => {
          const baseLabel = item.category || item.status || `Item ${index + 1}`;
          return baseLabel;
        });
        return {
          labels: barLabels,
          datasets: [{
            label: 'Count',
            data: data.map((item: ChartDataItem) => item.count || item.value || 0),
            backgroundColor: '#36A2EB',
            borderColor: '#36A2EB',
            borderWidth: 1,
          }],
        };
      case 'line':
        // For line charts with series data from options
        if (options && options.xAxis && options.series) {
          return {
            labels: options.xAxis,
            datasets: options.series.map((series, index) => ({
              label: series.name,
              data: series.data,
              borderColor: index === 0 ? '#FF6384' : '#36A2EB',
              backgroundColor: index === 0 ? 'rgba(255, 99, 132, 0.2)' : 'rgba(54, 162, 235, 0.2)',
              tension: 0.1,
              fill: true,
            })),
          };
        }

        // Standard line chart from data array
        const lineLabels = data.map((item: ChartDataItem, index: number) => {
          const baseLabel = item.year || item.month || `Item ${index + 1}`;
          return baseLabel;
        });
        return {
          labels: lineLabels,
          datasets: [{
            label: 'Value',
            data: data.map((item: ChartDataItem) => item.value || item.count || 0),
            borderColor: '#FF6384',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1,
            fill: true,
          }],
        };
      default:
        return data;
    }
  })();

  return (
    <div className={cn("bg-white dark:bg-gray-800 p-4 rounded-lg shadow", className)}>
      {title && (
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
      )}

      {/* Use custom HeatMap component for heatmap type */}
      {type === 'heatmap' && options && options.xAxis && options.yAxis && options.values ? (
        <div className="relative h-[300px] overflow-auto">
          <HeatMap
            xAxis={options.xAxis}
            yAxis={options.yAxis}
            values={options.values}
          />
        </div>
      ) : (
        <div className="relative h-[300px]">
          <ClientChart
            key={`chart-${type}-${Math.random()}`}
            type={type}
            data={formattedData}
            options={mergedOptions}
          />
        </div>
      )}
    </div>
  );
}