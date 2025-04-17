import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Role } from "@/types/auth";

export function useAuth(requiredRole?: Role) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    if (requiredRole && session.user.role !== requiredRole) {
      router.push("/dashboard");
      return;
    }
  }, [session, status, requiredRole, router]);

  return {
    session,
    status,
    isAuthenticated: !!session,
    user: session?.user,
  };
} 