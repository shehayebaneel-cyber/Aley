import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "aley-dev-secret-change-me";

export function signToken(payload: object): string {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: number;
      ownerId?: number;
      driverId?: number;
    }
  }
}

/** Rejects unless a valid admin token is present. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Please sign in." });
  try {
    const payload = jwt.verify(header.slice(7), SECRET) as { role?: string };
    if (payload.role !== "admin") return res.status(403).json({ error: "Admin access only." });
    next();
  } catch {
    return res.status(401).json({ error: "Your session expired — please sign in again." });
  }
}

/** Rejects unless a valid business-owner token is present; sets req.ownerId. */
export function requireOwner(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Please log in to your business account." });
  try {
    const payload = jwt.verify(header.slice(7), SECRET) as { ownerId?: number; role?: string };
    if (payload.role !== "owner" || !payload.ownerId) return res.status(403).json({ error: "Business account required." });
    req.ownerId = payload.ownerId;
    next();
  } catch {
    return res.status(401).json({ error: "Your session expired — please log in again." });
  }
}

/** Requires a valid visitor (user) token; sets req.userId. */
export function requireUser(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Please log in." });
  try {
    const payload = jwt.verify(header.slice(7), SECRET) as { userId?: number; role?: string };
    if (payload.role !== "user" || !payload.userId) return res.status(403).json({ error: "Account required." });
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Your session expired — please log in again." });
  }
}

/** Requires a valid driver token; sets req.driverId. */
export function requireDriver(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Please log in to your driver account." });
  try {
    const payload = jwt.verify(header.slice(7), SECRET) as { driverId?: number; role?: string };
    if (payload.role !== "driver" || !payload.driverId) return res.status(403).json({ error: "Driver account required." });
    req.driverId = payload.driverId;
    next();
  } catch {
    return res.status(401).json({ error: "Your session expired — please log in again." });
  }
}

/** Attaches req.userId if a valid user token is present, but never blocks. */
export function optionalUser(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), SECRET) as { userId?: number; role?: string };
      if (payload.role === "user" && payload.userId) req.userId = payload.userId;
    } catch {
      /* ignore */
    }
  }
  next();
}

/** Accepts any valid signed token (visitor, owner or admin) — used for uploads. */
export function requireAnyAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Please sign in." });
  try {
    const payload = jwt.verify(header.slice(7), SECRET) as { role?: string };
    if (["user", "owner", "admin", "driver"].includes(payload.role ?? "")) return next();
    return res.status(403).json({ error: "Not allowed." });
  } catch {
    return res.status(401).json({ error: "Your session expired." });
  }
}
