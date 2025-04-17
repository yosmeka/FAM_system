import { useAuthContext } from "@/contexts/AuthContext";
import { Role } from "@/types/auth";

export function useRole() {
  const { user } = useAuthContext();

  const hasRole = (requiredRole: Role | Role[]) => {
    if (!user) return false;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    
    return user.role === requiredRole;
  };

  const isAdmin = () => hasRole('ADMIN');
  const isManager = () => hasRole('MANAGER');
  const isUser = () => hasRole('USER');

  return {
    hasRole,
    isAdmin,
    isManager,
    isUser,
    currentRole: user?.role,
  };
} 