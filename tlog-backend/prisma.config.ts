import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import {buildDatabaseUrl} from "./src/config/profiles/db.config";

process.env.DATABASE_URL ??= buildDatabaseUrl().url;

export default defineConfig({ earlyAccess: true });
