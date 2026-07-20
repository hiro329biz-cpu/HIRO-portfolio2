import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "test-results",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [["line"]],
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "desktop",
      use: {
        viewport: { width: 1440, height: 1000 }
      }
    },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true
      }
    }
  ],
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 10_000
  }
});
