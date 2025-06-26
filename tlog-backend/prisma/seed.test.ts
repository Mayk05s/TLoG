import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedTestData() {
  // Clean existing data
  await prisma.tapEvent.deleteMany();
  await prisma.playerRoundStats.deleteMany();
  await prisma.round.deleteMany();
  await prisma.user.deleteMany();

  // Create test users with proper roles
  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.user.createMany({
    data: [
      {
        username: 'admin',
        password: passwordHash,
        role: 'admin',
      },
      {
        username: 'testuser',
        password: passwordHash,
        role: 'survivor',
      },
      {
        username: 'nikita',
        password: passwordHash,
        role: 'nikita',
      },
    ],
  });
}
