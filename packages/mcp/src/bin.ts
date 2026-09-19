#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createTopoIRMcpServer } from "./index.js";

const handle = serveStdio(() => createTopoIRMcpServer(process.env["TOPOIR_ASSETS"] ? { assetDirectory: process.env["TOPOIR_ASSETS"] } : {}), {
  onerror: (error) => process.stderr.write(`topoir-mcp: ${error.message}\n`),
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void handle.close().finally(() => process.exit(0));
  });
}
