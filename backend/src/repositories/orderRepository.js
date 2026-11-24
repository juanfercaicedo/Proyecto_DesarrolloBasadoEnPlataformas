import { prisma } from "../database/prisma.js";

export function createOrderTransaction(operation) {
  return prisma.$transaction(operation);
}