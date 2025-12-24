import {
  findTrolleyByPickupCode,
  getRequiredToteCount,
} from "../../support/commands/wms.helper";

describe("WMS – Assign tote for pickup", () => {
  before(() => {
    cy.loginWMS();
  });

  function assignTote() {
    const pickupCode = "270911";

    cy.getTrolleyList({
      status_id: 700,
      pickup_type: "my_pick",
    })
      .then((res) => {
        const trolley = findTrolleyByPickupCode(res.body.data, pickupCode);
        const pickup = trolley.pickup_id;
        const trolleyId = trolley.trolley_id;

        const requiredCount = getRequiredToteCount(pickup);

        if (requiredCount === 0) {
          cy.log("Pickup không cần tote");
          return { trolleyId, pickupCode };
        }

        return cy
          .getAvailableTotes(requiredCount, {
            warehouseId: pickup.warehouse_id,
            toteSize: pickup.tote_size || "M",
          })
          .then((toteCodes) => {
            cy.log(`Assign rổ: ${toteCodes.join(", ")}`);

            return cy.assignBasket(trolleyId, toteCodes).then((res) => {
              if (!res.body.success) {
                throw new Error(`❌ Assign basket failed`);
              }
              return { trolleyId, pickupCode };
            });
          });
      })
      .then(() => {
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
      })
      .then(() => {
        cy.log("🚀 Commit trolley status...");
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
  }

  it("Assign đúng số rổ cho pickup SSO/MSO", () => {
    assignTote();
  });
});
