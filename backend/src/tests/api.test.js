import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, test } from "node:test";

const [{ createApp }, { models, prisma, Prisma }] = await Promise.all([
  import("../app.js"),
  import("../models/index.js"),
]);
const [
  { createResourceService },
  { calculateCurrentStock },
  { consumeIngredientStock, createOrder },
  { AppError },
  { errorHandler },
  { createAdminSession, verifyAdminSession },
  { createCustomerSession, verifyCustomerSession },
] = await Promise.all([
  import("../services/resourceService.js"),
  import("../controllers/inventoryController.js"),
  import("../services/orderService.js"),
  import("../errors/AppError.js"),
  import("../middlewares/errorHandler.js"),
  import("../services/adminSessionService.js"),
  import("../services/customerSessionService.js"),
]);
const server = createServer(createApp());
server.listen(0, "127.0.0.1");
await once(server, "listening");
const baseUrl = `http://127.0.0.1:${server.address().port}`;

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await prisma.$disconnect();
});

test("expone el estado de salud sin requerir una base de datos", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
});

test("permite el origen de GitHub Pages y responde solicitudes CORS", async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://juanfercaicedo.github.io",
      "Access-Control-Request-Method": "POST",
    },
  });

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "https://juanfercaicedo.github.io",
  );
  assert.match(response.headers.get("access-control-allow-methods"), /POST/);
  assert.match(response.headers.get("access-control-allow-headers"), /Authorization/);
});

test("rechaza orígenes web que no estén configurados", async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: "https://sitio-no-autorizado.example" },
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.match(body.error, /origen no está autorizado/);
});

test("registra las entidades administrativas y las relaciones Prisma del pedido", () => {
  assert.equal(Object.keys(models).length, 17);
  assert.equal(Prisma.dmmf.datamodel.models.length, 20);
  const pedido = Prisma.dmmf.datamodel.models.find((model) => model.name === "Pedido");
  const relations = pedido.fields.filter((field) => field.kind === "object").map((field) => field.name);
  assert.deepEqual(relations, ["cliente", "cuentaCliente", "tipo", "estado", "detalles", "pago", "factura", "ordenSalida"]);
  assert.equal(models.Usuario.fields.includes("contrasena_hash"), true);
});

test("protege recursos administrativos si falta la clave", async () => {
  delete process.env.ADMIN_API_KEY;
  const response = await fetch(`${baseUrl}/api/ingredients`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.match(body.error, /ADMIN_API_KEY/);
});

test("acepta sesiones individuales firmadas para consultar la sesión administrativa", async () => {
  process.env.ADMIN_API_KEY = "test-admin-session-secret";
  const { token } = createAdminSession({
    id_usuario: 7,
    nombres: "Ana",
    apellidos: "Pérez",
    correo: "ana@example.com",
  });
  const response = await fetch(`${baseUrl}/api/admin/session`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.user.sub, 7);
  assert.equal(body.user.email, "ana@example.com");
  delete process.env.ADMIN_API_KEY;
});

test("rechaza sesiones administrativas vencidas o alteradas", () => {
  const { token } = createAdminSession({
    id_usuario: 7,
    nombres: "Ana",
    apellidos: "Pérez",
    correo: "ana@example.com",
  }, "test-admin-session-secret", 1_000);

  assert.equal(verifyAdminSession(token, "test-admin-session-secret", 1_000 + 8 * 60 * 60 * 1000), null);
  assert.equal(verifyAdminSession(`${token}x`, "test-admin-session-secret", 2_000), null);
});

test("firma y valida sesiones temporales de clientes", () => {
  const account = {
    id_cuenta_cliente: 7,
    nombres: "Ana",
    apellidos: "Pérez",
    correo: "ana@example.com",
    telefono: "123456789",
  };
  const { token } = createCustomerSession(account, "test-customer-session-secret", 1_000);

  assert.equal(
    verifyCustomerSession(token, "test-customer-session-secret", 1_001).email,
    "ana@example.com",
  );
  assert.equal(
    verifyCustomerSession(token, "test-customer-session-secret", 1_000 + 7 * 24 * 60 * 60 * 1000),
    null,
  );
  assert.equal(verifyCustomerSession(`${token}x`, "test-customer-session-secret", 2_000), null);
});

test("rechaza el registro de clientes con contraseñas débiles antes de acceder a la base", async () => {
  const response = await fetch(`${baseUrl}/api/customer/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Ana",
      surname: "Pérez",
      email: "ana@example.com",
      phone: "123456789",
      password: "corta",
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /12 a 72 bytes/);
});

test("requiere configurar el secreto antes de habilitar el login de clientes", async () => {
  delete process.env.CUSTOMER_SESSION_SECRET;
  const response = await fetch(`${baseUrl}/api/customer/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ana@example.com", password: "una-clave-valida" }),
  });
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.match(body.error, /CUSTOMER_SESSION_SECRET/);
});

test("protege el historial de pedidos y rechaza sesiones de cliente inválidas", async () => {
  process.env.CUSTOMER_SESSION_SECRET = "test-customer-session-secret";
  const response = await fetch(`${baseUrl}/api/customer/orders`, {
    headers: { Authorization: "Bearer token-invalido" },
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.match(body.error, /Inicia sesión/);
  delete process.env.CUSTOMER_SESSION_SECRET;
});

test("rechaza un identificador de dirección guardada inválido antes de guardar el pedido", async () => {
  await assert.rejects(
    createOrder(
      {
        mode: "Delivery",
        addressId: 0,
        items: [{ name: "La Brasa", quantity: 1, extra: 0 }],
      },
      { sub: 7, role: "Cliente" },
    ),
    (error) => error.statusCode === 400 && /identificador de dirección/.test(error.message),
  );
});

test("requiere una sesión individual para crear solicitudes a proveedores", async () => {
  process.env.ADMIN_API_KEY = "test-admin-session-secret";
  const headers = { "Content-Type": "application/json" };
  const body = JSON.stringify({ id_proveedor: 1, cantidad: 2 });
  const apiKeyResponse = await fetch(`${baseUrl}/api/supplier-orders`, {
    method: "POST",
    headers: { ...headers, "x-admin-key": process.env.ADMIN_API_KEY },
    body,
  });
  assert.equal(apiKeyResponse.status, 401);

  const { token } = createAdminSession({
    id_usuario: 7,
    nombres: "Ana",
    apellidos: "Pérez",
    correo: "ana@example.com",
  });
  const invalidRequestResponse = await fetch(`${baseUrl}/api/supplier-orders`, {
    method: "POST",
    headers: { ...headers, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id_proveedor: 0, cantidad: 0.5 }),
  });
  const invalidRequest = await invalidRequestResponse.json();
  assert.equal(invalidRequestResponse.status, 400);
  assert.match(invalidRequest.error, /id_proveedor debe ser un entero positivo/);
  delete process.env.ADMIN_API_KEY;
});

test("rechaza el alta de usuarios sin contraseña", async () => {
  process.env.ADMIN_API_KEY = "test-admin-key";
  const response = await fetch(`${baseUrl}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": process.env.ADMIN_API_KEY,
    },
    body: JSON.stringify({
      id_rol: 1,
      nombres: "Ana",
      apellidos: "Pérez",
      correo: "ana@example.com",
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /contraseña debe tener al menos 10 caracteres/);
  delete process.env.ADMIN_API_KEY;
});

test("exige dirección para delivery antes de conectar a la base de datos", async () => {
  const response = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: { name: "Ana Pérez", phone: "123456789", email: "ana@example.com" },
      mode: "Delivery",
      items: [{ name: "La Brasa", quantity: 1, extra: 0 }],
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /dirección es obligatoria/);
});

test("rechaza direcciones que exceden el tamaño que se puede guardar", async () => {
  const response = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: { name: "Ana Pérez", phone: "123456789", email: "ana@example.com" },
      mode: "Delivery",
      address: "C".repeat(256),
      items: [{ name: "La Brasa", quantity: 1, extra: 0 }],
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /entre 5 y 255 caracteres/);
});

test("rechaza pedidos que superan el máximo de 99 unidades por producto", async () => {
  const response = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: { name: "Ana Pérez", phone: "123456789", email: "ana@example.com" },
      mode: "Para llevar",
      items: [{ name: "La Brasa", quantity: 100, extra: 0 }],
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /productos del pedido no es válido/);
});

test("rechaza cantidades negativas en recursos administrativos", async () => {
  process.env.ADMIN_API_KEY = "test-admin-key";
  const response = await fetch(`${baseUrl}/api/ingredients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": process.env.ADMIN_API_KEY,
    },
    body: JSON.stringify({
      nombre: "Harina",
      unidad_medida: "KG",
      stock_minimo: -1,
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /stock_minimo debe ser un número/);
  delete process.env.ADMIN_API_KEY;
});

test("pagina recursos y limita el tamaño de página", async () => {
  const service = createResourceService({
    delegate: {
      findMany: async (options) => [options],
      count: async () => 205,
    },
    idField: "id_ingrediente",
    fields: ["nombre"],
    name: "Ingrediente",
  });

  const result = await service.list({ page: "3", limit: "25" });
  assert.deepEqual(result.records, [{ skip: 50, take: 25, orderBy: { id_ingrediente: "asc" } }]);
  assert.deepEqual(result.pagination, { page: 3, limit: 25, total: 205, totalPages: 9 });
  await assert.rejects(service.list({ limit: "101" }), { statusCode: 400 });
  await assert.rejects(
    createResourceService({
      delegate: {},
      idField: "id_producto",
      fields: ["id_usuario_admin"],
      name: "Producto",
    }).create({ id_usuario_admin: null }),
    { statusCode: 400 },
  );
});

test("valida teléfono y cantidad habitual de proveedores", async () => {
  const supplierService = createResourceService({
    delegate: { create: async ({ data }) => data },
    idField: "id_proveedor",
    fields: ["nombre", "telefono", "id_ingrediente", "cantidad_por_pedido"],
    name: "Proveedor",
  });
  const supplier = {
    nombre: "Proveedor central",
    telefono: "+57 300 123 4567",
    id_ingrediente: 1,
    cantidad_por_pedido: "2.500",
  };

  await assert.rejects(
    supplierService.create({ ...supplier, telefono: "123" }),
    { statusCode: 400 },
  );
  assert.deepEqual(await supplierService.create(supplier), supplier);
});

test("no incluye en el stock utilizable los lotes vencidos", () => {
  const today = new Date("2026-11-23T12:00:00.000Z");
  const stock = calculateCurrentStock([
    { fecha_vencimiento: new Date("2026-11-22T00:00:00.000Z"), cantidad_disponible: "20.000" },
    { fecha_vencimiento: new Date("2026-11-23T00:00:00.000Z"), cantidad_disponible: "3.500" },
    { fecha_vencimiento: new Date("2026-11-30T00:00:00.000Z"), cantidad_disponible: "2.000" },
  ], today);

  assert.equal(stock, 5.5);
});

test("consume primero los lotes más antiguos y conserva la precisión de milésimas", async () => {
  const balances = new Map([[1, 1], [2, 2]]);
  const transaction = {
    loteIngrediente: {
      findMany: async ({ where, orderBy }) => {
        assert.deepEqual(orderBy, [{ fecha_vencimiento: "asc" }, { id_lote: "asc" }]);
        assert.equal(where.fecha_vencimiento.gte.toISOString(), "2026-11-23T00:00:00.000Z");
        return [...balances].map(([id_lote, amount]) => ({
          id_lote,
          cantidad_disponible: amount.toFixed(3),
        }));
      },
      updateMany: async ({ where, data }) => {
        const required = data.cantidad_disponible.decrement;
        const available = balances.get(where.id_lote);
        if (available < required) return { count: 0 };
        balances.set(where.id_lote, available - required);
        return { count: 1 };
      },
    },
  };

  await consumeIngredientStock(transaction, [
    { id_ingrediente: 1, name: "Carne", quantityMilli: 2500 },
  ], new Date("2026-11-23T12:00:00.000Z"));

  assert.equal(balances.get(1), 0);
  assert.equal(balances.get(2), 0.5);
});

test("devuelve el detalle del ingrediente cuando el pedido queda sin stock", () => {
  let statusCode;
  let responseBody;
  errorHandler(
    new AppError(409, "Inventario insuficiente para Carne."),
    {},
    {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
      },
    },
    () => {},
  );

  assert.equal(statusCode, 409);
  assert.equal(responseBody.error, "Inventario insuficiente para Carne.");
});

test("rechaza el pedido si no hay suficiente inventario", async () => {
  const transaction = {
    loteIngrediente: {
      findMany: async () => [{ id_lote: 1, cantidad_disponible: "0.500" }],
      updateMany: async () => ({ count: 0 }),
    },
  };

  await assert.rejects(
    consumeIngredientStock(transaction, [
      { id_ingrediente: 1, name: "Carne", quantityMilli: 1000 },
    ]),
    { statusCode: 409, message: "Inventario insuficiente para Carne." },
  );
});