import { models } from "../models/index.js";
import { createResourceController } from "./resourceControllerFactory.js";

export const dispatchOrdersController = createResourceController(models.OrdenSalida);