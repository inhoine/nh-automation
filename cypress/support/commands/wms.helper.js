export function findTrolleyByPickupCode(data, pickupCode) {
  const trolley = data.find(
    (item) => item.pickup_id.pickup_code === pickupCode
  );

  if (!trolley) {
    throw new Error(`Không tìm thấy pickup_code ${pickupCode}`);
  }

  return trolley;
}

export function getRequiredToteCount(pickup) {
  if (!pickup.is_tote_required) {
    return 0;
  }

  if (pickup.is_sso) {
    return 1;
  }

  if (pickup.is_mso) {
    return pickup.total_order;
  }

  throw new Error("Pickup không phải SSO hoặc MSO");
}

export function generateToteCodes(pickup, startIndex = 10) {
  if (!pickup.is_tote_required) return [];

  if (pickup.is_sso) {
    return [`TOTE-L-${startIndex}`];
  }

  if (pickup.is_mso) {
    return Array.from(
      { length: pickup.total_order },
      (_, idx) => `TOTE-L-${startIndex + idx}`
    );
  }

  throw new Error("Pickup không phải SSO hoặc MSO");
}

export function openCustomerTable() {
  const openCustomerTable = () => {
    cy.get("span.text-warning.fw-medium.h6.mb-0")
      .should("be.visible")
      .click({ force: true });

    cy.get("#customerTable").should("be.visible");
  };
}
