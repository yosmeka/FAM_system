import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T;
  header: string;
  permission?: string;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
  className?: string;
}

interface RoleBasedTableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
  onRowClick?: (item: T) => void;
  loading?: boolean;
}

export function RoleBasedTable<T>({
  columns,
  data,
  className,
  onRowClick,
}: RoleBasedTableProps<T>) {
  const { checkPermission } = usePermissions();

  const filteredColumns = columns.filter(
    (column) => !column.permission || checkPermission(column.permission)
  );

  if (filteredColumns.length === 0 || data.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">No data available</div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-full divide-y divide-red-200 dark:divide-red-700">
        <thead className="bg-red-600 dark:bg-red-700">
          <tr>
            {filteredColumns.map((column, columnIndex) => (
              <th
                key={`header-${String(column.key)}-${columnIndex}`}
                scope="col"
                className={cn(
                  "px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-r border-red-500 last:border-r-0",
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-black divide-y divide-red-200 dark:divide-red-700">
          {data.map((item, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(item)}
              className={cn(
                "hover:bg-red-50 dark:hover:bg-red-900 transition-colors",
                onRowClick && "cursor-pointer",
                index % 2 === 0 ? "bg-white dark:bg-black" : "bg-red-50 dark:bg-gray-900"
              )}
            >
              {filteredColumns.map((column, columnIndex) => (
                <td
                  key={`${String(column.key)}-${index}-${columnIndex}`}
                  className={cn(
                    "px-6 py-4 whitespace-nowrap text-sm text-black dark:text-white border-r border-red-200 dark:border-red-700 last:border-r-0",
                    column.className
                  )}
                >
                  {column.render
                    ? column.render(item[column.key], item)
                    : (item[column.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 