import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');
  const adminPassword = 'Admin123!';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: adminPasswordHash,
      role: Role.admin,
    },
    create: {
      username: 'admin',
      password: adminPasswordHash,
      role: Role.admin,
    },
  });
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
