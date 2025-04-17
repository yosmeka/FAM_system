import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";

interface Stat {
  name: string;
  value: string | number;
  change?: number;
  permission?: string;
  description?: string;
}

interface RoleBasedStatsProps {
  stats: Stat[];
  className?: string;
}

export function RoleBasedStats({ stats, className }: RoleBasedStatsProps) {
  const { checkPermission } = usePermissions();

  const filteredStats = stats.filter(
    (stat) => !stat.permission || checkPermission(stat.permission)
  );

  if (filteredStats.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredStats.map((stat) => (
          <div
            key={stat.name}
            className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden"
          >
            <dt>
              <p className="text-sm font-medium text-gray-500 truncate">
                {stat.name}
              </p>
            </dt>
            <dd className="pb-6 flex items-baseline sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">
                {stat.value}
              </p>
              {stat.change !== undefined && (
                <p
                  className={cn(
                    "ml-2 flex items-baseline text-sm font-semibold",
                    stat.change >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  )}
                >
                  {stat.change >= 0 ? (
                    <ArrowUp
                      className="self-center flex-shrink-0 h-5 w-5"
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowDown
                      className="self-center flex-shrink-0 h-5 w-5"
                      aria-hidden="true"
                    />
                  )}
                  <span className="sr-only">
                    {stat.change >= 0 ? "Increased" : "Decreased"} by
                  </span>
                  {Math.abs(stat.change)}%
                </p>
              )}
              {stat.description && (
                <div className="absolute bottom-0 inset-x-0 bg-gray-50 px-4 py-4 sm:px-6">
                  <div className="text-sm">
                    <p className="font-medium text-gray-500">
                      {stat.description}
                    </p>
                  </div>
                </div>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
} 