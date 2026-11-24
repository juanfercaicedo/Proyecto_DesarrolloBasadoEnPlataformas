import { models } from "../models/index.js";
import { createResourceController } from "./resourceControllerFactory.js";

export const orderStatusesController = createResourceController(models.EstadoPedido);