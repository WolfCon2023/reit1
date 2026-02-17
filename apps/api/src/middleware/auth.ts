import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { config } from "../config.js";
import type { JwtPayload, RequestUser } from "@reit1/shared";
import type { Permission } from "@reit1/shared";

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.cookies?.accessToken;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = await User.findById(decoded.userId)
      .select("email isActive roles")
      .populate<{ roles: { permissions: string[] }[] }>("roles");

    if (!user || !user.isActive) {
      res.status(401).json({ error: "User not found or disabled" });
      return;
    }

    const permissions: string[] = [];
    for (const r of user.roles as unknown as { permissions?: string[] }[]) {
      if (r?.permissions) permissions.push(...r.permissions);
    }
    const uniquePermissions = [...new Set(permissions)] as Permission[];

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      permissions: uniquePermissions,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!(req.user.permissions as string[]).includes(permission)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
