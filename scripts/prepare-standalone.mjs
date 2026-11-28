import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const standaloneDirectory = resolve(".next/standalone");
const serverPath = resolve(standaloneDirectory, "server.js");
const staticDirectory = resolve(".next/static");

if (!existsSync(serverPath) || !existsSync(staticDirectory)) {
  throw new Error("Production output is missing. Run `pnpm build` first.");
}

const standaloneStaticDirectory = resolve(standaloneDirectory, ".next/static");
mkdirSync(standaloneStaticDirectory, { recursive: true });
cpSync(staticDirectory, standaloneStaticDirectory, { recursive: true });

const publicDirectory = resolve("public");
if (existsSync(publicDirectory)) {
  const standalonePublicDirectory = resolve(standaloneDirectory, "public");
  mkdirSync(standalonePublicDirectory, { recursive: true });
  cpSync(publicDirectory, standalonePublicDirectory, { recursive: true });
}
