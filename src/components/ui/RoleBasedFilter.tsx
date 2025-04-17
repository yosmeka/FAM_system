import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { Filter } from "lucide-react";

interface FilterOption {
  id: string;
  label: string;
  permission?: string;
}

interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  permission?: string;
}

interface RoleBasedFilterProps {
  groups: FilterGroup[];
  selectedFilters: Record<string, string[]>;
  onFilterChange: (groupId: string, optionId: string) => void;
  className?: string;
}

export function RoleBasedFilter({
  groups,
  selectedFilters,
  onFilterChange,
  className,
}: RoleBasedFilterProps) {
  const { checkPermission } = usePermissions();

  const filteredGroups = groups.filter(
    (group) => !group.permission || checkPermission(group.permission)
  );

  if (filteredGroups.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center space-x-2">
        <Filter className="h-5 w-5 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-900">Filters</h3>
      </div>
      <div className="space-y-4">
        {filteredGroups.map((group) => (
          <div key={group.id}>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {group.label}
            </h4>
            <div className="mt-2 space-y-2">
              {group.options
                .filter(
                  (option) =>
                    !option.permission || checkPermission(option.permission)
                )
                .map((option) => (
                  <div key={option.id} className="flex items-center">
                    <input
                      id={`${group.id}-${option.id}`}
                      name={`${group.id}[]`}
                      type="checkbox"
                      checked={selectedFilters[group.id]?.includes(option.id)}
                      onChange={() => onFilterChange(group.id, option.id)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label
                      htmlFor={`${group.id}-${option.id}`}
                      className="ml-3 text-sm text-gray-600"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 