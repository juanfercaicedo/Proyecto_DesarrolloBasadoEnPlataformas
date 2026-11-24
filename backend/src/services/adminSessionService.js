import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../errors/AppError.js";

const sessionDurationMs = 8 * 60 * 60 * 1000;

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminSession(user, secret = process.env.ADMIN_API_KEY, now = Date.now()) {
  if (!secret) {
    throw new AppError(503, "Configura ADMIN_API_KEY para habilitar la administración.");
  }

  const expiresAt = now + sessionDurationMs;
  const payload = Buffer.from(JSON.stringify({
    sub: user.id_usuario,
    name: `${user.nombres} ${user.apellidos}`,
    email: user.correo,
    role: "Administrador",
    exp: expiresAt,
  })).toString("base64url");

  return { token: `${payload}.${sign(payload, secret)}`, expiresAt };
}

export function verifyAdminSession(token, secret = process.env.ADMIN_API_KEY, now = Date.now()) {
  if (!secret || typeof token !== "string") return null;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload, secret));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  let session;
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (
    !session ||
    typeof session !== "object" ||
    !Number.isSafeInteger(session.sub) ||
    session.sub < 1 ||
    session.role !== "Administrador" ||
    typeof session.name !== "string" ||
    typeof session.email !== "string" ||
    !Number.isSafeInteger(session.exp) ||
    session.exp <= now
  ) {
    return null;
  }

  return session;
}
