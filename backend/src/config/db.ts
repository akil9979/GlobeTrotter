import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before the server starts.");
}

export const db = new Pool({
  connectionString: databaseUrl,
  // Neon requires TLS connections. Credentials remain solely in DATABASE_URL.
  ssl: { rejectUnauthorized: false },
});

db.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error", error);
});

export const closeDatabaseConnection = async (): Promise<void> => {
  await db.end();
};
