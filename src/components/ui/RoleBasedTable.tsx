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
      <div className="text-center py-4 text-gray-500">No data available</div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {filteredColumns.map((column) => (
              <th
                key={String(column.key)}
                scope="col"
                className={cn(
                  "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(item)}
              className={cn(
                "hover:bg-gray-50",
                onRowClick && "cursor-pointer"
              )}
            >
              {filteredColumns.map((column) => (
                <td
                  key={`${String(column.key)}-${index}`}
                  className={cn(
                    "px-6 py-4 whitespace-nowrap text-sm text-gray-500",
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