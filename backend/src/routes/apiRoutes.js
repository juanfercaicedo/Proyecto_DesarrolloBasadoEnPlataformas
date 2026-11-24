import { Router } from "express";
import { ingredientsController } from "../controllers/ingredientsController.js";
import { ingredientLotsController } from "../controllers/ingredientLotsController.js";
import { productsController } from "../controllers/productsController.js";
import { ordersController } from "../controllers/ordersController.js";
import { orderDetailsController } from "../controllers/orderDetailsController.js";
import { salesController } from "../controllers/salesController.js";
import { inventoryController } from "../controllers/inventoryController.js";
import { paymentsController } from "../controllers/paymentsController.js";
import { invoicesController } from "../controllers/invoicesController.js";
import { usersController } from "../controllers/usersController.js";
import { rolesController } from "../controllers/rolesController.js";
import { categoriesController } from "../controllers/categoriesController.js";
import { recipesController } from "../controllers/recipesController.js";
import { orderTypesController } from "../controllers/orderTypesController.js";
import { orderStatusesController } from "../controllers/orderStatusesController.js";
import { paymentMethodsController } from "../controllers/paymentMethodsController.js";
import { dispatchStatusesController } from "../controllers/dispatchStatusesController.js";
import { dispatchOrdersController } from "../controllers/dispatchOrdersController.js";
import { requireAdminKey } from "../middlewares/requireAdminKey.js";
import { adminSessionController } from "../controllers/adminSessionController.js";
import { supplierOrdersController } from "../controllers/supplierOrdersController.js";
import { suppliersController } from "../controllers/suppliersController.js";

export const apiRouter = Router();

function addCrudRoutes(path, controller) {
  apiRouter.get(path, requireAdminKey, controller.list);
  apiRouter.get(`${path}/:id`, requireAdminKey, controller.get);
  apiRouter.post(path, requireAdminKey, controller.create);
  apiRouter.patch(`${path}/:id`, requireAdminKey, controller.update);
  apiRouter.delete(`${path}/:id`, requireAdminKey, controller.remove);
}

apiRouter.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});
apiRouter.post("/admin/session", adminSessionController.create);
apiRouter.get("/admin/session", requireAdminKey, adminSessionController.current);
apiRouter.get("/products", productsController.listPublic);
apiRouter.post("/orders", ordersController.checkout);
apiRouter.get("/sales/summary", requireAdminKey, salesController.summary);
apiRouter.get("/sales", requireAdminKey, salesController.list);
apiRouter.get("/inventory/low-stock", requireAdminKey, inventoryController.lowStock);
apiRouter.get("/inventory/lots", requireAdminKey, inventoryController.lots);
apiRouter.get("/supplier-orders", requireAdminKey, supplierOrdersController.list);
apiRouter.post("/supplier-orders", requireAdminKey, supplierOrdersController.create);
apiRouter.post("/supplier-orders/:id/receive", requireAdminKey, supplierOrdersController.receive);

for (const [path, controller] of [
  ["/ingredients", ingredientsController],
  ["/suppliers", suppliersController],
  ["/ingredient-lots", ingredientLotsController],
  ["/products/manage", productsController],
  ["/orders/manage", ordersController],
  ["/order-details", orderDetailsController],
  ["/payments", paymentsController],
  ["/invoices", invoicesController],
  ["/users", usersController],
  ["/roles", rolesController],
  ["/categories", categoriesController],
  ["/recipes", recipesController],
  ["/order-types", orderTypesController],
  ["/order-statuses", orderStatusesController],
  ["/payment-methods", paymentMethodsController],
  ["/dispatch-statuses", dispatchStatusesController],
  ["/dispatch-orders", dispatchOrdersController],
]) {
  addCrudRoutes(path, controller);
}
