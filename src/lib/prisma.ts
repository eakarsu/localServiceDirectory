import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function positiveDuration(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    transactionOptions: {
      maxWait: positiveDuration(process.env.DB_TRANSACTION_MAX_WAIT_MS, 15_000),
      timeout: positiveDuration(process.env.DB_TRANSACTION_TIMEOUT_MS, 30_000),
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
