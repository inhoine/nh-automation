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

  if (pickup.is_mso) {
    return pickup.total_order;
  }

  if (pickup.is_sso) {
    return 1;
  }

  // fallback: không phải SSO/MSO nhưng vẫn cần tote
  return pickup.total_order || 1;
}

// export function generateToteCodes(pickup, startIndex = 244) {
//   const count = getRequiredToteCount(pickup);

//   if (count === 0) return [];

//   return Array.from(
//     { length: count },
//     (_, idx) => `TOTE-M-${startIndex + idx}`
//   );
// }

export function generateToteCodes(pickup, startIndex = 303) {
  const count = getRequiredToteCount(pickup);

  if (count === 0) return [];

  return Array.from(
    { length: count },
    (_, idx) => `TOTE-M-${startIndex + idx}`
  );
}

export function getToteSizeByPickup(pickup) {
  if (pickup.tote_size) return pickup.tote_size;

  // default nghiệp vụ
  return "M";
}

export function openCustomerTable() {
  const openCustomerTable = () => {
    cy.get("span.text-warning.fw-medium.h6.mb-0")
      .should("be.visible")
      .click({ force: true });

    cy.get("#customerTable").should("be.visible");
  };
}
