'use client';

// Import the chart registration file first
import '@/lib/chart-registry';

import { Bar, Line, Pie } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';

import { ChartType } from '@/types/chart';

interface ClientChartProps {
  type: ChartType;
  data: ChartData;
  options?: ChartOptions;
}

type ChartComponentType = React.ComponentType<{ data: ChartData; options?: ChartOptions }>;

const ChartComponents: Record<ChartType, ChartComponentType> = {
  line: Line,
  bar: Bar,
  pie: Pie,
  heatmap: Bar, // Using Bar as base for heatmap
};

export function ClientChart({ type, data, options }: ClientChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    // Force a re-render after component mounts
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const ChartComponent = ChartComponents[type];

  if (!ChartComponent) {
    console.error(`Invalid chart type: ${type}`);
    return null;
  }

  // Create a stable key based on the chart type
  const chartKey = `${type}-${Math.random()}`;

  // Ensure data has the required structure
  if (!data || (type !== 'heatmap' && !data.labels)) {
    console.error('Invalid chart data structure', data);
    return <div className="text-center text-red-500 dark:text-red-400">Invalid chart data</div>;
  }

  // Update chart options based on theme
  const themeOptions = {
    ...options,
    plugins: {
      ...options?.plugins,
      legend: {
        ...options?.plugins?.legend,
        labels: {
          ...options?.plugins?.legend?.labels,
          color: theme === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)', // text-gray-400 in dark mode, text-gray-500 in light mode
        },
      },
      title: {
        ...options?.plugins?.title,
        color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)', // text-gray-100 in dark mode, text-gray-900 in light mode
      },
    },
    scales: {
      ...options?.scales,
      x: {
        ...options?.scales?.x,
        grid: {
          ...options?.scales?.x?.grid,
          color: theme === 'dark' ? 'rgba(156, 163, 175, 0.1)' : 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          ...options?.scales?.x?.ticks,
          color: theme === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
        },
      },
      y: {
        ...options?.scales?.y,
        grid: {
          ...options?.scales?.y?.grid,
          color: theme === 'dark' ? 'rgba(156, 163, 175, 0.1)' : 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          ...options?.scales?.y?.ticks,
          color: theme === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
        },
      },
    },
  };

  return <ChartComponent key={chartKey} data={data} options={themeOptions} />;
}