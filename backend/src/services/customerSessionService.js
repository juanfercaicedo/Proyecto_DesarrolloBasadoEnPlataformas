import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../errors/AppError.js";

const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createCustomerSession(account, secret = process.env.CUSTOMER_SESSION_SECRET, now = Date.now()) {
  if (!secret) {
    throw new AppError(503, "Configura CUSTOMER_SESSION_SECRET para habilitar las cuentas de clientes.");
  }

  const expiresAt = now + sessionDurationMs;
  const payload = Buffer.from(JSON.stringify({
    sub: account.id_cuenta_cliente,
    name: `${account.nombres} ${account.apellidos}`,
    email: account.correo,
    phone: account.telefono,
    role: "Cliente",
    exp: expiresAt,
  })).toString("base64url");

  return { token: `${payload}.${sign(payload, secret)}`, expiresAt };
}

export function verifyCustomerSession(token, secret = process.env.CUSTOMER_SESSION_SECRET, now = Date.now()) {
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
    session.role !== "Cliente" ||
    typeof session.name !== "string" ||
    typeof session.email !== "string" ||
    typeof session.phone !== "string" ||
    !Number.isSafeInteger(session.exp) ||
    session.exp <= now
  ) {
    return null;
  }

  return session;
}
