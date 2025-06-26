// This import must be first to load environment variables before anything else
// eslint-disable-next-line import/order
import './load-env'; // Import and execute directly, without assignment
import { seedTestData } from '../prisma/seed.test';
import { PrismaClient } from '@prisma/client';
import { buildDatabaseUrl } from '../src/config/profiles/db.config';
import { execSync } from 'child_process';

module.exports = async () => {
  const dbName = process.env.DB_NAME;
  const { host, port, username, password, url: baseUrl } = buildDatabaseUrl();
  process.env.DATABASE_URL = baseUrl;
  const adminDbUrl = `postgresql://${username}:${password}@${host}:${port}/postgres`;
  const adminPrisma = new PrismaClient({ datasources: { db: { url: adminDbUrl } } });

  try {
    const result = await adminPrisma.$queryRawUnsafe<any[]>(
      `SELECT 1
       FROM pg_database
       WHERE datname = $1`,
      dbName,
    );

    if (result && result.length > 0) {
      await adminPrisma.$executeRawUnsafe(`DROP DATABASE "${dbName}" WITH (FORCE);`);
      console.log(`Dropped test database "${dbName}"`);
    }

    await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${dbName}";`);
    console.log(`Created test database "${dbName}"`);
  } catch (error) {
    console.error('Error preparing test database:', error);
    process.exit(1);
  } finally {
    await adminPrisma.$disconnect();
  }

  // After creating the database, deploy the migrations
  try {
    console.log('Running prisma migrate deploy...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    await seedTestData();
  } catch (error) {
    console.error('Error deploying migrations:', error);
    process.exit(1);
  }
};
