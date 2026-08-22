import "dotenv/config";
import { db, closeDatabaseConnection } from "../config/db.js";
import { runSeed } from "../services/migrationService.js";

const main = async (): Promise<void> => {
  try {
    await runSeed(db);
  } finally {
    await closeDatabaseConnection();
  }
};

main().catch((error: unknown) => {
  console.error("Seed process failed.", error);
  process.exitCode = 1;
});
