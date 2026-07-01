const { defineConfig, devices } = require("@playwright/test");

const port = process.env.PLAYWRIGHT_PORT || "5174";
const baseURL = `http://127.0.0.1:${port}`;

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1`,
    url: `${baseURL}/`,
    reuseExistingServer: true,
    timeout: 10000
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: "tablet",
      use: {
        ...devices["iPad Mini"]
      }
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"]
      }
    }
  ]
});
