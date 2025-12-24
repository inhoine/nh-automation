Cypress.Commands.add("getTrolleyList", (params) => {
  return cy.request({
    method: "GET",
    url: `${Cypress.env("urlWMS")}/v1/trolley/list`,
    headers: {
      authorization: `Bearer ${Cypress.env("wmsToken")}`,
    },
    qs: params,
  });
});

Cypress.Commands.add("assignBasket", (pickupId, toteCodes) => {
  return cy.request({
    method: "POST",
    url: `${Cypress.env("urlWMS")}/v2/pick-order/${pickupId}/assign-basket`,
    headers: {
      authorization: `Bearer ${Cypress.env("wmsToken")}`,
      "content-type": "application/json",
    },
    body: {
      tote_codes: toteCodes,
    },
  });
});

Cypress.Commands.add("pickAllBinsByPickup", (pickupCode) => {
  return cy
    .request({
      method: "GET",
      url: `https://stg-wms.nandh.vn/v1/trolley/binset/${pickupCode}?is_issue=-1`,
      headers: {
        Authorization: `Bearer ${Cypress.env("wmsToken")}`,
      },
    })
    .then((response) => {
      const binCodes = response.body.data.map((i) => i.bin_code);
      cy.log(`📦 Có ${binCodes.length} bin cần xử lý`);

      return cy.wrap(binCodes).each((bin) => {
        cy.log(`🧩 Bin: ${bin}`);
        return cy
          .request({
            method: "GET",
            url: `https://stg-wms.nandh.vn/v1/trolley/picking/${pickupCode}?bin_code=${bin}`,
            headers: {
              Authorization: `Bearer ${Cypress.env("wmsToken")}`,
            },
          })
          .then((res) => {
            const items = res.body.data.flatMap((item) =>
              item.barcodes.map((barcode) => ({
                barcode,
                qty: item.quantity_sold,
              }))
            );

            cy.readFile("cypress/temp/itemsList.json", {
              log: false,
              failOnNonExist: false,
            }).then((existing = []) => {
              cy.writeFile("cypress/temp/itemsList.json", [
                ...existing,
                ...items,
              ]);
            });

            return cy.wrap(items).each(({ barcode, qty }) => {
              cy.log(`📦 Pick ${barcode} (${qty} lần)`);

              // Tạo mảng [0,1,2,...qty-1] để loop
              return cy.wrap([...Array(qty)]).each((_, index) => {
                cy.log(`👉 Pick ${barcode} - lần ${index + 1}`);

                return cy
                  .request({
                    method: "PUT",
                    url: `https://stg-wms.nandh.vn/v1/trolley/detail/${pickupCode}`,
                    headers: {
                      Authorization: `Bearer ${Cypress.env("wmsToken")}`,
                    },
                    body: {
                      bin_code: bin,
                      goods_code: barcode,
                      quantity: 1,
                    },
                  })
                  .then((resp) => {
                    expect(resp.status).to.eq(200);
                  });
              });
            });
          });
      });
    });
});

Cypress.Commands.add("commitPickup", (pickupCode) => {
  return cy
    .request({
      method: "PUT",
      url: `https://stg-wms.nandh.vn/v1/trolley/commit-status/${pickupCode}`,
      headers: { Authorization: `Bearer ${Cypress.env("wmsToken")}` },
      body: { trolley_code: "" },
    })
    .then((resp) => {
      expect(resp.status).to.eq(200);
      cy.log("✅ Commit thành công");
      return cy.wrap(pickupCode);
    });
});
