import express from "express";
import { apiRouter } from "./routes/apiRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { AppError } from "./errors/AppError.js";

const defaultOrigins = [
  "https://juanfercaicedo.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];
const allowedOrigins = new Set(
  (process.env.FRONTEND_ORIGINS || defaultOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use((request, response, next) => {
    const origin = request.get("origin");
    if (!origin) {
      next();
      return;
    }
    if (!allowedOrigins.has(origin)) {
      next(new AppError(403, "Este origen no está autorizado."));
      return;
    }

    response.set("Access-Control-Allow-Origin", origin);
    response.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type, x-admin-key");
    response.set("Vary", "Origin");
    if (request.method === "OPTIONS") {
      response.sendStatus(204);
      return;
    }
    next();
  });
  app.use(express.json({ limit: "20kb" }));
  app.use("/api", apiRouter);
  app.use((_request, _response, next) => {
    next(new AppError(404, "La ruta solicitada no existe."));
  });
  app.use(errorHandler);

  return app;
}