import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

interface RoleBasedSearchProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  permission?: string;
  className?: string;
  debounceMs?: number;
  initialValue?: string;
}

export function RoleBasedSearch({
  onSearch,
  placeholder = "Search...",
  permission,
  className,
  debounceMs = 300,
  initialValue = "",
}: RoleBasedSearchProps) {
  const { checkPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [debouncedValue] = useDebounce(searchTerm, debounceMs);

  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  if (permission && !checkPermission(permission)) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="block w-full rounded-md border-gray-300 pl-10 pr-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        placeholder={placeholder}
      />
      {searchTerm && (
        <button
          type="button"
          onClick={() => setSearchTerm("")}
          className="absolute inset-y-0 right-0 flex items-center pr-3"
        >
          <X className="h-5 w-5 text-gray-400 hover:text-gray-500" aria-hidden="true" />
        </button>
      )}
    </div>
  );
} 