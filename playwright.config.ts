import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "tests/e2e",
  retries: 0,
  timeout: 30_000,
})
