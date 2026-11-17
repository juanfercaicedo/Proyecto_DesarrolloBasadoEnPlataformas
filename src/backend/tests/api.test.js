import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, test } from "node:test";

const [{ createApp }, { models, prisma, Prisma }] = await Promise.all([
  import("../app.js"),
  import("../models/index.js"),
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

test("registra las 16 entidades y las relaciones Prisma del pedido", () => {
  assert.equal(Object.keys(models).length, 16);
  const pedido = Prisma.dmmf.datamodel.models.find((model) => model.name === "Pedido");
  const relations = pedido.fields.filter((field) => field.kind === "object").map((field) => field.name);
  assert.deepEqual(relations, ["cliente", "tipo", "estado", "detalles", "pago", "factura", "ordenSalida"]);
  assert.equal(models.Usuario.fields.includes("contrasena_hash"), true);
});

test("protege recursos administrativos si falta la clave", async () => {
  delete process.env.ADMIN_API_KEY;
  const response = await fetch(`${baseUrl}/api/ingredients`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.match(body.error, /ADMIN_API_KEY/);
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

test("exige dirección para delivery antes de conectar a MySQL", async () => {
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