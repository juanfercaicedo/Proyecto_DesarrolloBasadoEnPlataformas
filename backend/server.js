import "dotenv/config";
import { createApp } from "./src/app.js";
import { prisma } from "./src/database/prisma.js";

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

try {
  await prisma.$connect();
  app.listen(port, () => {
    console.log(`Brasa Viva disponible en http://localhost:${port}`);
  });
} catch (error) {
  console.error("No fue posible iniciar la conexión con PostgreSQL.", error.message);
  process.exitCode = 1;
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}