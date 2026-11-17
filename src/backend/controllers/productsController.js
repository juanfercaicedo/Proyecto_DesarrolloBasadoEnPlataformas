import { models } from "../models/index.js";
import { listProducts } from "../services/productService.js";
import { createResourceController } from "./resourceControllerFactory.js";

const resourceController = createResourceController(models.Producto);

export const productsController = {
	...resourceController,
	listPublic: async (_request, response, next) => {
		try {
			response.json({ products: await listProducts() });
		} catch (error) {
			next(error);
		}
	},
};