import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RoleBasedPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  permission?: string;
  className?: string;
}

export function RoleBasedPagination({
  currentPage,
  totalPages,
  onPageChange,
  permission,
  className,
}: RoleBasedPaginationProps) {
  const { checkPermission } = usePermissions();

  if (permission && !checkPermission(permission)) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const showEllipsis = totalPages > 7;

  const getVisiblePages = () => {
    if (!showEllipsis) return pages;

    if (currentPage <= 4) {
      return [...pages.slice(0, 5), "...", totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, "...", ...pages.slice(totalPages - 5)];
    }

    return [
      1,
      "...",
      ...pages.slice(currentPage - 2, currentPage + 1),
      "...",
      totalPages,
    ];
  };

  return (
    <nav
      className={cn(
        "flex items-center justify-between border-t border-gray-200 px-4 sm:px-0",
        className
      )}
    >
      <div className="flex w-0 flex-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            "inline-flex items-center border-t-2 pt-4 pr-1 text-sm font-medium",
            currentPage === 1
              ? "border-transparent text-gray-400 cursor-not-allowed"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
          )}
        >
          <ChevronLeft className="mr-3 h-5 w-5" aria-hidden="true" />
          Previous
        </button>
      </div>
      <div className="hidden md:flex">
        {getVisiblePages().map((page, index) => (
          <button
            key={index}
            onClick={() =>
              typeof page === "number" ? onPageChange(page) : undefined
            }
            disabled={page === "..."}
            className={cn(
              "inline-flex items-center border-t-2 px-4 pt-4 text-sm font-medium",
              page === currentPage
                ? "border-indigo-500 text-indigo-600"
                : page === "..."
                ? "border-transparent text-gray-400 cursor-default"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            )}
          >
            {page}
          </button>
        ))}
      </div>
      <div className="flex w-0 flex-1 justify-end">
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            "inline-flex items-center border-t-2 pt-4 pl-1 text-sm font-medium",
            currentPage === totalPages
              ? "border-transparent text-gray-400 cursor-not-allowed"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
          )}
        >
          Next
          <ChevronRight className="ml-3 h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
} 