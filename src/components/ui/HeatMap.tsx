'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface HeatMapProps {
  xAxis: string[];
  yAxis: string[];
  values: number[];
  className?: string;
}

export function HeatMap({ xAxis, yAxis, values, className }: HeatMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  // Create a 2D matrix from the values
  const createMatrix = () => {
    const matrix: number[][] = [];
    let valueIndex = 0;
    
    for (let i = 0; i < yAxis.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < xAxis.length; j++) {
        if (valueIndex < values.length) {
          row.push(values[valueIndex]);
          valueIndex++;
        } else {
          row.push(0);
        }
      }
      matrix.push(row);
    }
    
    return matrix;
  };

  const matrix = createMatrix();
  
  // Find the maximum value for color scaling
  const maxValue = Math.max(...values, 1);

  // Get color based on value
  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-100';
    
    const intensity = Math.min(Math.max(value / maxValue, 0.1), 1);
    
    if (intensity < 0.3) return 'bg-blue-100';
    if (intensity < 0.5) return 'bg-blue-200';
    if (intensity < 0.7) return 'bg-blue-300';
    if (intensity < 0.9) return 'bg-blue-400';
    return 'bg-blue-500';
  };

  return (
    <div className={cn('w-full overflow-auto', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 border"></th>
            {xAxis.map((label, index) => (
              <th key={`x-${index}`} className="p-2 text-xs font-medium text-gray-700 border">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {yAxis.map((yLabel, rowIndex) => (
            <tr key={`y-${rowIndex}`}>
              <th className="p-2 text-xs font-medium text-gray-700 border">
                {yLabel}
              </th>
              {matrix[rowIndex]?.map((value, colIndex) => (
                <td 
                  key={`cell-${rowIndex}-${colIndex}`} 
                  className={cn(
                    'p-2 border text-center relative group cursor-pointer',
                    getColor(value)
                  )}
                  title={`${yLabel} → ${xAxis[colIndex]}: ${value}`}
                >
                  <span className="text-xs font-medium">{value}</span>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black bg-opacity-5 transition-opacity"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
