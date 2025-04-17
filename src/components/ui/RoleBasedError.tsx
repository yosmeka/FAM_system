import { useRole } from "@/hooks/useRole";
import { Role } from "@/types/auth";

interface RoleBasedErrorProps {
  role?: Role | Role[];
  message?: string;
}

export function RoleBasedError({
  role,
  message = "You don't have permission to access this resource.",
}: RoleBasedErrorProps) {
  const { hasRole } = useRole();

  if (!role || (role && hasRole(role))) {
    return null;
  }

  return (
    <div className="flex items-center justify-center p-4 text-red-500">
      <p>{message}</p>
    </div>
  );
} 