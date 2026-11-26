import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const e2eStoreFile = path.join(os.tmpdir(), "hoho-xo-playwright-store.json");
if (fs.existsSync(e2eStoreFile)) {
  fs.rmSync(e2eStoreFile, { force: true });
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      "node scripts/prepare-standalone.mjs && node .next/standalone/server.js",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NODE_ENV: "production",
      PORT: "3000",
      HOSTNAME: "localhost",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      HOHO_IP_SALT: "e2e-test-salt",
      HOHO_STORE_FILE: e2eStoreFile,
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      KV_REST_API_URL: "",
      KV_REST_API_TOKEN: "",
    },
  },
});
