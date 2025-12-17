Cypress.Commands.add("getTrolleyList", (params) => {
  return cy.request({
    method: "GET",
    url: `${Cypress.env("baseUrlWMS")}/v1/trolley/list`,
    headers: {
      authorization: `Bearer ${Cypress.env("wmsToken")}`,
    },
    qs: params,
  });
});

Cypress.Commands.add("assignBasket", (trolleyId, toteCodes) => {
  return cy.request({
    method: "POST",
    url: `${Cypress.env(
      "baseUrlWMS"
    )}/v2/pick-order/${trolleyId}/assign-basket`,
    headers: {
      authorization: `Bearer ${Cypress.env("wmsToken")}`,
      "content-type": "application/json",
    },
    body: {
      tote_codes: toteCodes,
    },
    failOnStatusCode: false,
  });
});
