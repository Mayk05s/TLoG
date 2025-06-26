import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { TEST_USERS } from '../test/test-users';

const prisma = new PrismaClient();

export async function seedTestData(client = prisma) {
  // Clean existing data
  await client.tapEvent.deleteMany();
  await client.playerRoundStats.deleteMany();
  await client.round.deleteMany();
  await client.user.deleteMany();

  // Create test users with proper roles using centralized credentials
  const { admin, regularUser, nikita } = TEST_USERS;

  // Hash passwords for the users
  const adminPasswordHash = await bcrypt.hash(admin.password, 10);
  const userPasswordHash = await bcrypt.hash(regularUser.password, 10);
  const nikitaPasswordHash = await bcrypt.hash(nikita.password, 10);

  await client.user.createMany({
    data: [
      {
        username: admin.username,
        password: adminPasswordHash,
        role: admin.role,
      },
      {
        username: regularUser.username,
        password: userPasswordHash,
        role: regularUser.role,
      },
      {
        username: nikita.username,
        password: nikitaPasswordHash,
        role: nikita.role,
      },
    ],
  });
}
