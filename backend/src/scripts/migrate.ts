import "dotenv/config";
import { db, closeDatabaseConnection } from "../config/db.js";
import { runMigrations } from "../services/migrationService.js";

const main = async (): Promise<void> => {
  try {
    await runMigrations(db);
  } finally {
    await closeDatabaseConnection();
  }
};

main().catch((error: unknown) => {
  console.error("Migration process failed.", error);
  process.exitCode = 1;
});
