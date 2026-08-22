import dns from "dns";
import pg, { Pool } from "pg";

// Fall back to public DNS resolvers (8.8.8.8 / 1.1.1.1) if system/router DNS fails to resolve remote hosts (e.g. Neon)
const origLookup = dns.lookup;
(dns as any).lookup = (hostname: string, options: any, cb?: any) => {
  const callback = typeof options === "function" ? options : cb;
  const opts = typeof options === "object" && options !== null ? options : {};

  origLookup(hostname, opts, (err: any, address: any, family: any) => {
    if (err && (err.code === "ENOTFOUND" || err.code === "EAI_AGAIN")) {
      try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
      } catch {
        // Ignore setServers errors if restricted
      }
      dns.resolve4(hostname, (resErr, addrs) => {
        if (!resErr && addrs && addrs.length > 0) {
          if (opts.all) {
            return callback(null, addrs.map((a) => ({ address: a, family: 4 })));
          }
          return callback(null, addrs[0], 4);
        }
        return callback(err, address, family);
      });
    } else {
      return callback(err, address, family);
    }
  });
};

let databaseUrl =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/globetrotter";

if (databaseUrl.includes("sslmode=") && !databaseUrl.includes("uselibpqcompat=")) {
  databaseUrl += (databaseUrl.includes("?") ? "&" : "?") + "uselibpqcompat=true";
}

// Override pg type parsers so that DATE columns (OID 1082) are returned as
// plain "YYYY-MM-DD" strings rather than JavaScript Date objects.
// Without this, comparisons like activityDate < stop.arrivalDate break because
// "2026-08-22" < "2026-08-22T18:30:00.000Z" is false in PostgreSQL's TZ.
pg.types.setTypeParser(1082, (val: string) => val);            // DATE → "YYYY-MM-DD"
pg.types.setTypeParser(1114, (val: string) => val.split("T")[0] ?? val); // TIMESTAMP (no tz) → "YYYY-MM-DD"
pg.types.setTypeParser(1184, (val: string) => val.split("T")[0] ?? val); // TIMESTAMPTZ → "YYYY-MM-DD"

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
