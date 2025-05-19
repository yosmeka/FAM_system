'use client';

// Import the chart registration file first
import '@/lib/chart-registry';

import { Bar, Line, Pie } from 'react-chartjs-2';
import { useEffect, useState } from 'react';

import { ChartType } from '@/types/chart';

interface ClientChartProps {
  type: ChartType;
  data: any;
  options?: any;
}

// Define specific chart components with their types
const ChartComponents = {
  line: Line as any,
  bar: Bar as any,
  pie: Pie as any,
  heatmap: Bar as any, // Using Bar as base for heatmap
} as const;

export function ClientChart({ type, data, options }: ClientChartProps) {
  const [isMounted, setIsMounted] = useState(false);

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
    return <div className="text-center text-red-500">Invalid chart data</div>;
  }

  return <ChartComponent key={chartKey} data={data} options={options} />;
}