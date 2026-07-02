/* eslint-disable @typescript-eslint/no-require-imports, no-restricted-properties */
require("dotenv/config");
const { Client } = require("pg");

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  await c.connect();
  const r = await c.query("SELECT 1 AS ok");
  console.log("OK:", JSON.stringify(r.rows));
  await c.end();
})().catch(e => { console.error("ERR:", e.code, e.message.split("\n")[0]); process.exit(1); });
