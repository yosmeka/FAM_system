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

// Only support line and bar charts
type ChartType = "line" | "bar";

interface RoleBasedChartProps {
  type: ChartType;
  data: any;
  options?: any;
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

  const defaultOptions = {
    responsive: true,
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
      <div className="relative">
        <ClientChart key={type} type={type} data={data} options={mergedOptions} />
      </div>
    </div>
  );
} 