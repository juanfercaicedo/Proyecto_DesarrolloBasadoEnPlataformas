import bcrypt from "bcryptjs";
import { prisma } from "../database/prisma.js";
import { createAdminSession } from "../services/adminSessionService.js";

export const adminSessionController = {
  create: async (request, response, next) => {
    try {
      const email = typeof request.body?.email === "string"
        ? request.body.email.trim().toLowerCase()
        : "";
      const password = typeof request.body?.password === "string"
        ? request.body.password
        : "";
      if (!email || !password || password.length > 256) {
        return response.status(401).json({ error: "Correo o contraseña no válidos." });
      }

      const user = await prisma.usuario.findUnique({
        where: { correo: email },
        include: { rol: true },
      });
      if (
        !user ||
        user.rol.nombre_rol !== "Administrador" ||
        !(await bcrypt.compare(password, user.contrasena_hash))
      ) {
        return response.status(401).json({ error: "Correo o contraseña no válidos." });
      }

      const session = createAdminSession(user);
      response.json({
        ...session,
        user: {
          id_usuario: user.id_usuario,
          nombres: user.nombres,
          apellidos: user.apellidos,
          correo: user.correo,
        },
      });
    } catch (error) {
      next(error);
    }
  },
  current: (request, response) => {
    response.json({ user: request.adminUser ?? null });
  },
};
