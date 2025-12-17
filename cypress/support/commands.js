// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

import "cypress-file-upload";
import "./commands/wms.api";

Cypress.Commands.add("loginOMS", () => {
  cy.session("oms_session", () => {
    cy.visit("https://stg-oms.nandh.vn" + "/login");
    cy.get('input[name="email"]').type("thanh.auto@nandh.vn");
    cy.get('input[name="password"]').type("Nhl@12345");
    cy.get('button[type="submit"]').click();
    cy.wait(1000);
  });
});

Cypress.Commands.add("loginWMS", () => {
  cy.visit("https://stg-wms.nandh.vn/login");

  cy.get('input[name="email"]').type(Cypress.env("wmsUser"));
  cy.get('input[name="password"]').type(Cypress.env("wmsPassword"));
  cy.get('button[type="submit"]').click();

  cy.get("span.text-muted.fs-10").contains(Cypress.env("fcHN")).click();
  cy.get('button[type="button"]').contains(Cypress.env("fcHN")).click();

  // ✅ CHỜ TOKEN
  cy.window()
    .its("localStorage.token")
    .should("be.a", "string")
    .then((token) => {
      Cypress.env("wmsToken", token);
    });
});
Cypress.Commands.add("addStorageWMS", () => {
  cy.visit(`https://stg-wms.nandh.vn/equipments?page=1&page_size=50`);

  cy.get("button.add-btn")
    .contains("Thêm thiết bị chứa hàng")
    .click({ force: true });

  // Random number
  const randomNumber = Date.now(); // 0 -> 999
  const trolleyCode = `NNT${randomNumber}`;

  cy.get('input[name="code"]').type(trolleyCode);

  cy.get("div.css-1jqq78o-placeholder")
    .contains("Chọn nhóm thiết bị")
    .click({ force: true });
  cy.get('div[id^="react-select-"][id*="-option-"]')
    .contains("Xe chứa")
    .click();

  cy.get("div.css-1jqq78o-placeholder")
    .contains("Chọn loại thiết bị")
    .click({ force: true });
  cy.get('div[id^="react-select-"][id*="-option-"]')
    .contains("Không ưu tiên")
    .click({ force: true });

  cy.get('button[type="submit"]')
    .contains("Thêm thiết bị chứa hàng")
    .click({ force: true });

  // ✅ Ghi trolleyCode vào file JSON
  cy.readFile("cypress/temp/maDonHangWMS.json").then((data = {}) => {
    cy.writeFile("cypress/temp/maDonHangWMS.json", {
      ...data,
      trolleyCode,
    });
  });
});
