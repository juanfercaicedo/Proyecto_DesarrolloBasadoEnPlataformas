import { models } from "../models/index.js";
import { createOrder } from "../services/orderService.js";
import { createResourceController } from "./resourceControllerFactory.js";

const resourceController = createResourceController(models.Pedido);

export const ordersController = {
  ...resourceController,
  checkout: async (request, response, next) => {
    try {
      const order = await createOrder(request.body);
      response.status(201).json({ message: "Pedido recibido.", order });
    } catch (error) {
      next(error);
    }
  },
};