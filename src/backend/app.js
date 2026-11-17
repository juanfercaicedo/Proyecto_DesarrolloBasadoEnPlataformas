import express from "express";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { apiRouter } from "./routes/apiRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { AppError } from "./errors/AppError.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "20kb" }));
  app.use("/api", apiRouter);
  app.use("/src/assets", express.static(resolve(projectRoot, "src/assets")));
  app.get("/", (_request, response) => {
    response.sendFile(resolve(projectRoot, "index.html"));
  });
  app.use((_request, _response, next) => {
    next(new AppError(404, "La ruta solicitada no existe."));
  });
  app.use(errorHandler);

  return app;
}