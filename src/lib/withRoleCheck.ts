import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { Role } from "@/types/auth";
import { NextApiRequest, NextApiResponse } from "next";

export function withRoleCheck(handler: (req: NextApiRequest, res: NextApiResponse) => unknown, requiredRole: Role | Role[]) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userRole = session.user.role as Role;
    const hasRole = Array.isArray(requiredRole)
      ? requiredRole.includes(userRole)
      : userRole === requiredRole;

    if (!hasRole) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return handler(req, res);
  };
} 