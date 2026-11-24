export function errorHandler(error, _request, response, _next) {
  const ormStatus = error.code === "P2002" || error.code === "P2003" ? 409
    : error.code === "P2000" || error.name === "PrismaClientValidationError" ? 400
      : null;
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : (ormStatus ?? 500);
  const message = statusCode === 500 ? "Ocurrió un error interno." : error.message;

  if (statusCode === 500) {
    console.error(error);
  }

  const detail = statusCode === 400
    ? error.message
    : statusCode === 409
      ? (Number.isInteger(error.statusCode)
        ? error.message
        : "El registro entra en conflicto con datos existentes o relaciones dependientes.")
      : null;
  response.status(statusCode).json({ error: detail || message });
}