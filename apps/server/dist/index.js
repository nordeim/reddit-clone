import { buildApp } from "./app.js";
import { loadEnv } from "./config.js";
import { openDb } from "@embers/db";
/**
 * Server entrypoint — boots the Fastify app on the configured PORT/HOST.
 *
 * Boots only when run as a script (`tsx watch src/index.ts` in dev,
 * `node dist/index.js` in production). When imported (e.g. by tests
 * via buildApp directly), this file is a no-op.
 */
async function main() {
    const env = loadEnv();
    const { raw, db } = openDb({ path: env.DATABASE_URL });
    const app = await buildApp({ env: process.env, db, rawDb: raw });
    try {
        await app.listen({
            port: env.PORT,
            host: env.HOST,
        });
        app.log.info({ port: env.PORT, host: env.HOST, env: env.NODE_ENV }, "embers server listening");
    }
    catch (err) {
        app.log.error({ err }, "failed to start server");
        process.exit(1);
    }
    // Graceful shutdown — close the server on SIGINT/SIGTERM.
    const shutdown = async (signal) => {
        app.log.info({ signal }, "shutting down");
        await app.close();
        process.exit(0);
    };
    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
}
// Run only when executed directly, not when imported.
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
    void main();
}
