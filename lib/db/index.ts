// lib/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres"; // or sqlite
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
