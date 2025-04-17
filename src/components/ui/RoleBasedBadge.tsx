import { Role } from "@/types/auth";
import { cn } from "@/lib/utils";

interface RoleBasedBadgeProps {
  role: Role;
  className?: string;
}

export function RoleBasedBadge({ role, className }: RoleBasedBadgeProps) {
  const badgeStyles = {
    [Role.ADMIN]: "bg-red-100 text-red-800",
    [Role.MANAGER]: "bg-blue-100 text-blue-800",
    [Role.USER]: "bg-green-100 text-green-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        badgeStyles[role],
        className
      )}
    >
      {role}
    </span>
  );
} 