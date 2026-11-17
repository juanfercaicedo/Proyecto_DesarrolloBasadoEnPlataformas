import { models } from "../models/index.js";
import { createResourceController } from "./resourceControllerFactory.js";

export const ingredientsController = createResourceController(models.Ingrediente);