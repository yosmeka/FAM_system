declare module 'chart.js' {
  import { ChartData, ChartOptions } from 'chart.js';

  export interface ChartProps {
    type: 'line' | 'bar' | 'pie';
    data: ChartData;
    options?: ChartOptions;
    className?: string;
  }

  export const Line: React.FC<ChartProps>;
  export const Bar: React.FC<ChartProps>;
  export const Pie: React.FC<ChartProps>;
}

declare module 'react-chartjs-2' {
  export * from 'chart.js';
} 