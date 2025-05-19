const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    // point at your running flask app
    baseUrl: "http://127.0.0.1:8000",
    // where your tests live
    specPattern: "cypress/integration/**/*.js",
  },
});
