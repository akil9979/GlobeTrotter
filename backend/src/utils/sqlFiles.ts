import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export interface SqlFile {
  filename: string;
  path: string;
  sql: string;
}

export const readSqlFile = async (filePath: string): Promise<SqlFile> => ({
  filename: path.basename(filePath),
  path: filePath,
  sql: await readFile(filePath, "utf8"),
});

export const readSqlFilesInOrder = async (directory: string): Promise<SqlFile[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const sqlFileNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));

  return Promise.all(sqlFileNames.map((filename) => readSqlFile(path.join(directory, filename))));
};
