import { createHash } from "node:crypto";
import path from "node:path";
import type { Pool, PoolClient } from "pg";
import { readSqlFile, readSqlFilesInOrder, type SqlFile } from "../utils/sqlFiles.js";

interface AppliedMigration {
  filename: string;
  checksum: string;
}

const migrationTableSql = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(255) PRIMARY KEY,
    checksum CHAR(64) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const checksumFor = (sql: string): string => createHash("sha256").update(sql).digest("hex");

const getAppliedMigrations = async (pool: Pool): Promise<Map<string, string>> => {
  const result = await pool.query<AppliedMigration>(
    "SELECT filename, checksum FROM schema_migrations ORDER BY filename",
  );

  return new Map(result.rows.map((migration) => [migration.filename, migration.checksum]));
};

const applyMigration = async (client: PoolClient, migration: SqlFile, checksum: string): Promise<void> => {
  await client.query("BEGIN");

  try {
    await client.query(migration.sql);
    await client.query(
      "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
      [migration.filename, checksum],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
};

export const runMigrations = async (
  pool: Pool,
  migrationsDirectory = path.resolve(process.cwd(), "migrations"),
): Promise<void> => {
  const lockClient = await pool.connect();
  await lockClient.query("SELECT pg_advisory_lock($1)", [8072026]);

  try {
    await lockClient.query(migrationTableSql);

    const [migrations, appliedMigrations] = await Promise.all([
      readSqlFilesInOrder(migrationsDirectory),
      getAppliedMigrations(pool),
    ]);

    for (const migration of migrations) {
      const checksum = checksumFor(migration.sql);
      const appliedChecksum = appliedMigrations.get(migration.filename);

      if (appliedChecksum) {
        if (appliedChecksum !== checksum) {
          throw new Error(
            `Migration ${migration.filename} has changed since it was applied. Create a new migration instead.`,
          );
        }

        console.log(`Skipping already applied migration: ${migration.filename}`);
        continue;
      }

      const client = await pool.connect();
      try {
        await applyMigration(client, migration, checksum);
        console.log(`Applied migration: ${migration.filename}`);
      } catch (error) {
        throw new Error(`Migration failed: ${migration.filename}`, { cause: error });
      } finally {
        client.release();
      }
    }
  } finally {
    await lockClient.query("SELECT pg_advisory_unlock($1)", [8072026]);
    lockClient.release();
  }
};

export const runSeed = async (pool: Pool, seedPath = path.resolve(process.cwd(), "seeds", "seed.sql")): Promise<void> => {
  const seedFile = await readSqlFile(seedPath);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(seedFile.sql);
    await client.query("COMMIT");
    console.log(`Applied seed: ${seedFile.filename}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw new Error(`Seed failed: ${seedFile.filename}`, { cause: error });
  } finally {
    client.release();
  }
};
