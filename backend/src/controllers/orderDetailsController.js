import { models } from "../models/index.js";
import { createResourceController } from "./resourceControllerFactory.js";

export const orderDetailsController = createResourceController(models.DetallePedido);