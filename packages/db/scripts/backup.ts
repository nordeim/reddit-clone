import { backupDb } from "../src/client.js";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";

/**
 * Back up the configured SQLite database to a timestamped file.
 *
 * Usage:
 *   npm run backup --workspace @embers/db
 *   DATABASE_URL=/path/to/db.sqlite npm run backup --workspace @embers/db
 *   BACKUP_DIR=/custom/backups npm run backup --workspace @embers/db
 *
 * The backup is written to `BACKUP_DIR/dev-YYYYMMDD-HHmmss.db`
 * (default: `./backups/`). The directory is created if it doesn't exist.
 *
 * This uses SQLite's online backup API — safe to run while the server
 * is writing to the source DB.
 *
 * For automated scheduling, add to cron:
 *   0 2 * * * cd /app && npm run db:backup >> /var/log/embers-backup.log 2>&1
 */
async function main(): Promise<void> {
  const source = process.env.DATABASE_URL ?? "./dev.db";
  const backupDir = process.env.BACKUP_DIR ?? "./backups";

  // Create the backup directory if it doesn't exist.
  const resolvedDir = resolve(backupDir);
  mkdirSync(resolvedDir, { recursive: true });

  // Timestamped filename: dev-20260813-024500.db
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, "").slice(0, 15);
  const dest = resolve(resolvedDir, `dev-${ts}.db`);

  console.log(`Backing up ${source} → ${dest}`);
  const result = await backupDb(source, dest);
  console.log(
    `Backup complete: ${result.totalPages} pages, 0 remaining → ${result.destination}`,
  );
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
