import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin') {
    throw new Error('Refusing admin provisioning without BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin');
  }

  const email = (process.env.ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
  const name = (process.env.BOOTSTRAP_ADMIN_NAME || 'Initial Administrator').trim();
  if (!email || !email.includes('@')) throw new Error('ADMIN_EMAIL must be a valid explicit address');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters');

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { password: passwordHash, name, role: UserRole.ADMIN, emailVerified: new Date() },
    create: { email, password: passwordHash, name, role: UserRole.ADMIN, emailVerified: new Date() },
  });
  console.log(`Provisioned administrator ${email}`);
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
