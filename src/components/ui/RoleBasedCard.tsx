import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

interface RoleBasedCardProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  permission?: string;
  className?: string;
  footer?: React.ReactNode;
  onClick?: () => void;
}

export function RoleBasedCard({
  title,
  description,
  children,
  permission,
  className,
  footer,
  onClick,
}: RoleBasedCardProps) {
  const { checkPermission } = usePermissions();

  if (permission && !checkPermission(permission)) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-white shadow rounded-lg overflow-hidden",
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      onClick={onClick}
    >
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
      {footer && (
        <div className="px-4 py-4 sm:px-6 bg-gray-50">{footer}</div>
      )}
    </div>
  );
} 