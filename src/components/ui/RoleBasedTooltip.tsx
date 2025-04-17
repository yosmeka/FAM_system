import { usePermissions } from "@/hooks/usePermissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

interface RoleBasedTooltipProps {
  children: React.ReactNode;
  permission?: string;
  message?: string;
}

export function RoleBasedTooltip({
  children,
  permission,
  message = "You don't have permission to perform this action.",
}: RoleBasedTooltipProps) {
  const { checkPermission } = usePermissions();

  if (!permission || checkPermission(permission)) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-not-allowed opacity-50">{children}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 