import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";

interface RoleBasedStatsProps {
  name: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  description?: string;
  variant?: 'success' | 'warning' | 'danger' | 'default';
  className?: string;
}

export function RoleBasedStats({
  name,
  value,
  trend,
  trendLabel,
  description,
  variant = 'default',
  className,
}: RoleBasedStatsProps) {
  const variantStyles = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    default: 'text-gray-600',
  };

  return (
    <div className={cn('bg-white p-4 shadow rounded-lg flex flex-col', className)}>
      <div className="flex-1">
        <dt>
          <p className="text-sm font-medium text-gray-500 truncate">{name}</p>
        </dt>
        <dd className="mt-2 flex items-baseline">
          <p className={cn('text-2xl font-semibold', variantStyles[variant])}>{value}</p>
          {trend !== undefined && trendLabel && (
            <p
              className={cn(
                'ml-2 flex items-baseline text-sm font-semibold',
                trend >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              <span className="sr-only">
                {trend >= 0 ? 'Increased by' : 'Decreased by'}
              </span>
              {trend >= 0 ? (
                <ArrowUp
                  className="self-center flex-shrink-0 h-4 w-4 text-green-500"
                  aria-hidden="true"
                />
              ) : (
                <ArrowDown
                  className="self-center flex-shrink-0 h-4 w-4 text-red-500"
                  aria-hidden="true"
                />
              )}
              <span className="ml-1">{Math.abs(trend)}%</span>
              {trendLabel && <span className="ml-1 text-gray-500">{trendLabel}</span>}
            </p>
          )}
        </dd>
      </div>
      {description && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      )}
    </div>
  );
}