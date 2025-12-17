const { defineConfig } = require("cypress");
const fs = require("fs");

module.exports = defineConfig({
  e2e: {
    watchForFileChanges: false,
    setupNodeEvents(on, config) {
      on("task", {
        readJsonIfExists(filePath) {
          if (fs.existsSync(filePath)) {
            // Trả về nội dung JSON nếu file tồn tại
            return JSON.parse(fs.readFileSync(filePath, "utf8"));
          }
          // Trả về null nếu file không tồn tại (để tránh lỗi)
          return null;
        },
      });

      return config;
      // implement node event listeners here
    },

    // Tăng thời gian chờ (Timeout) mặc định cho các lệnh Cypress (cy.get, cy.click,...)
    // Mặc định là 4000ms (4 giây). Ví dụ tăng lên 10 giây.
    defaultCommandTimeout: 20000,

    // Tăng thời gian chờ (Timeout) mặc định cho cy.visit, cy.wait, và cy.request
    // Mặc định là 30000ms (30 giây). Ví dụ tăng lên 60 giây.
    pageLoadTimeout: 20000,
  },
});
