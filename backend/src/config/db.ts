import { Pool } from "pg";

const databaseUrl =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/globetrotter";

export const db = new Pool({
  connectionString: databaseUrl,
  // Neon requires TLS connections. Local postgres does not.
  ssl: process.env.DATABASE_URL?.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
});

db.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error", error);
});

export const closeDatabaseConnection = async (): Promise<void> => {
  await db.end();
};
