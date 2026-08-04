// Single shared PrismaClient instance. Express reuses one client per process
// (creating a new PrismaClient per request would exhaust the connection pool);
// tests import this same module so they share the same client/connection as
// the app they're exercising via supertest.
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
