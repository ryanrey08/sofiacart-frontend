import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test("built public routes render the landing, login, registration, and admin login pages", { timeout: 30_000 }, async () => {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    stdio: "ignore",
  });

  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null) break;
      try {
        const response = await fetch(baseUrl);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        await delay(100);
      }
    }
    assert.ok(ready, "production server did not start; run npm run build first");

    for (const [path, expected] of [
      ["/", "Register Merchant"],
      ["/login", "Welcome back"],
      ["/register/merchant", "Merchant registration"],
      ["/admin/login", "Admin sign in"],
    ]) {
      const response = await fetch(`${baseUrl}${path}`);
      assert.equal(response.status, 200, `${path} should render`);
      assert.match(await response.text(), new RegExp(expected));
    }
  } finally {
    server.kill();
  }
});
