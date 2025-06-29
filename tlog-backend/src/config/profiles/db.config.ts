import { registerAs } from '@nestjs/config';

export function buildDatabaseUrl() {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const name = process.env.DB_NAME || 'tlog_db';
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const logLevel = process.env.DATABASE_LOG_LEVEL;

  // Construct the DATABASE_URL from individual components
  const url = `postgres://${user}:${password}@${host}:${port}/${name}`;

  return {
    url,
    host,
    port: parseInt(port, 10),
    database: name,
    username: user,
    password,
    logLevel,
  };
}

export default registerAs('database', () => {
  return buildDatabaseUrl();
});
