'use client';

// Import the chart registration file first
import '@/lib/chart-registry';

import { Bar, Line } from 'react-chartjs-2';
import { useEffect, useState } from 'react';

// Only support line and bar charts
type ChartType = 'line' | 'bar';

interface ClientChartProps {
  type: ChartType;
  data: any;
  options?: any;
}

// Define specific chart components with their types
const ChartComponents = {
  line: Line as any,
  bar: Bar as any,
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

  // Use a key to force re-render when type changes
  return <ChartComponent key={type} data={data} options={options} />;
} 