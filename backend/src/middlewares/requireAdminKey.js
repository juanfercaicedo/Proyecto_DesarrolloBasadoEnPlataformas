import { timingSafeEqual } from "node:crypto";
import { verifyAdminSession } from "../services/adminSessionService.js";

export function requireAdminKey(request, response, next) {
  const expected = process.env.ADMIN_API_KEY;
  const provided = request.get("x-admin-key") ?? "";
  if (!expected) {
    return response.status(503).json({ error: "Configura ADMIN_API_KEY para habilitar la administración." });
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer)) {
    next();
    return;
  }

  const authorization = request.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const adminUser = verifyAdminSession(token, expected);
  if (!adminUser) {
    return response.status(401).json({ error: "Credenciales administrativas no válidas." });
  }
  request.adminUser = adminUser;
  next();
}