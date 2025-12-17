import {
  findTrolleyByPickupCode,
  generateToteCodes,
} from "../../support/commands/wms.helper";

import { assertAssignBasketSuccess } from "../../support/commands/wms.assert";

describe("WMS – Assign tote for pickup", () => {
  before(() => {
    cy.loginWMS();
  });

  function assignTote() {
    const pickupCode = "246618";

    cy.getTrolleyList({
      status_id: 700,
      pickup_type: "mso",
    }).then((res) => {
      const trolley = findTrolleyByPickupCode(res.body.data, pickupCode);

      const pickup = trolley.pickup_id;
      const trolleyId = trolley.trolley_id;

      // 1️⃣ Sinh danh sách rổ theo nghiệp vụ
      const toteCodes = generateToteCodes(pickup);

      cy.log(`Assign rổ: ${toteCodes.join(", ")}`);

      // 2️⃣ Gọi API assign basket
      cy.assignBasket(trolleyId, toteCodes).then((res) => {
        const { success, message } = res.body;

        cy.log(`API success: ${success}`);
        cy.log(`Message: ${message}`);

        if (!success) {
          throw new Error(`❌ Assign basket failed: ${message}`);
        }
      });
    });
  }

  it("Assign đúng số rổ cho pickup SSO/MSO", () => {
    assignTote();
  });
});
