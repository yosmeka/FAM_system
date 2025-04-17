import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

interface SortOption {
  id: string;
  label: string;
  permission?: string;
}

interface RoleBasedSortProps {
  options: SortOption[];
  currentSort: string | null;
  currentOrder: "asc" | "desc" | null;
  onSort: (optionId: string) => void;
  className?: string;
}

export function RoleBasedSort({
  options,
  currentSort,
  currentOrder,
  onSort,
  className,
}: RoleBasedSortProps) {
  const { checkPermission } = usePermissions();

  const filteredOptions = options.filter(
    (option) => !option.permission || checkPermission(option.permission)
  );

  if (filteredOptions.length === 0) {
    return null;
  }

  const getSortIcon = (optionId: string) => {
    if (currentSort !== optionId) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return currentOrder === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <span className="text-sm text-gray-500">Sort by:</span>
      <div className="flex items-center space-x-2">
        {filteredOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onSort(option.id)}
            className={cn(
              "inline-flex items-center space-x-1 px-3 py-1.5 text-sm font-medium rounded-md",
              currentSort === option.id
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <span>{option.label}</span>
            {getSortIcon(option.id)}
          </button>
        ))}
      </div>
    </div>
  );
} 