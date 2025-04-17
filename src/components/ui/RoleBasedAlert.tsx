import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

interface RoleBasedAlertProps {
  permission?: string;
  type?: "info" | "success" | "warning" | "error";
  title: string;
  description?: string;
  className?: string;
}

export function RoleBasedAlert({
  permission,
  type = "info",
  title,
  description,
  className,
}: RoleBasedAlertProps) {
  const { checkPermission } = usePermissions();

  if (permission && !checkPermission(permission)) {
    return null;
  }

  const styles = {
    info: {
      container: "bg-blue-50 border-blue-200",
      icon: "text-blue-400",
      title: "text-blue-800",
      description: "text-blue-700",
      Icon: Info,
    },
    success: {
      container: "bg-green-50 border-green-200",
      icon: "text-green-400",
      title: "text-green-800",
      description: "text-green-700",
      Icon: CheckCircle,
    },
    warning: {
      container: "bg-yellow-50 border-yellow-200",
      icon: "text-yellow-400",
      title: "text-yellow-800",
      description: "text-yellow-700",
      Icon: AlertCircle,
    },
    error: {
      container: "bg-red-50 border-red-200",
      icon: "text-red-400",
      title: "text-red-800",
      description: "text-red-700",
      Icon: AlertCircle,
    },
  };

  const { container, icon, title: titleStyle, description: descStyle, Icon } = styles[type];

  return (
    <div
      className={cn(
        "flex items-start p-4 space-x-3 border rounded-md",
        container,
        className
      )}
    >
      <Icon className={cn("w-5 h-5 mt-0.5", icon)} />
      <div>
        <h3 className={cn("text-sm font-medium", titleStyle)}>{title}</h3>
        {description && (
          <p className={cn("mt-1 text-sm", descStyle)}>{description}</p>
        )}
      </div>
    </div>
  );
} 