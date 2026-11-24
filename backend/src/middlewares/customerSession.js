import { verifyCustomerSession } from "../services/customerSessionService.js";

function readCustomerSession(request, response) {
  const authorization = request.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const session = verifyCustomerSession(token);

  if (session) {
    request.customerSession = session;
    return true;
  }

  if (!process.env.CUSTOMER_SESSION_SECRET && token) {
    response.status(503).json({ error: "Configura CUSTOMER_SESSION_SECRET para habilitar las cuentas de clientes." });
  } else {
    response.status(401).json({ error: "Inicia sesión con una cuenta de cliente válida." });
  }
  return false;
}

export function requireCustomerSession(request, response, next) {
  if (!readCustomerSession(request, response)) return;
  next();
}

export function optionalCustomerSession(request, response, next) {
  const authorization = request.get("authorization");
  if (!authorization) {
    next();
    return;
  }
  if (!readCustomerSession(request, response)) return;
  next();
}
