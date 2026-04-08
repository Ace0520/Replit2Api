// ── Performance: global connection pool + DNS optimization ──────────────────
// Reuses TCP/TLS connections for ALL fetch() calls (friend proxies, OpenAI SDK,
// Anthropic SDK, etc.) — avoids repeated handshakes (~200-500ms each).
import { setDefaultResultOrder } from "node:dns";

setDefaultResultOrder("ipv4first"); // avoid dual-stack DNS delay

try {
  // undici is optional — if not installed, server still starts (just without connection pooling)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Agent, setGlobalDispatcher } = require("undici");
  setGlobalDispatcher(
    new Agent({
      keepAliveTimeout: 30_000,     // keep idle connections for 30s
      keepAliveMaxTimeout: 120_000, // hard cap at 2min
      connections: 64,              // connection pool size per origin
      pipelining: 1,                // safe default, no HTTP pipelining
    }),
  );
} catch {
  // undici not available — fetch() still works, just without persistent connection pooling
}
// ────────────────────────────────────────────────────────────────────────────

import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
