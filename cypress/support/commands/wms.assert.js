export function assertPickup(pickup, options = {}) {
  if (options.toteRequired !== undefined) {
    expect(pickup.is_tote_required).to.eq(options.toteRequired);
  }

  if (options.type === "SSO") {
    expect(pickup.is_sso, "Pickup phải là SSO").to.be.true;
  }

  if (options.type === "MSO") {
    expect(pickup.is_mso, "Pickup phải là MSO").to.be.true;
  }
}

export function assertRequiredToteCount(pickup) {
  const toteCount = getRequiredToteCount(pickup);

  if (!pickup.is_tote_required) {
    expect(toteCount, "Không cần tote").to.eq(0);
    return;
  }

  if (pickup.is_sso) {
    expect(toteCount, "SSO phải scan 1 rổ").to.eq(1);
    return;
  }

  // MSO hoặc case đặc biệt
  expect(toteCount, "Pickup cần số rổ = total_order").to.eq(
    pickup.total_order || 1
  );
}

export function assertAssignBasketSuccess(res, expectedToteCount) {
  expect(res.status).to.eq(200);
  expect(res.body.error).to.be.false;

  expect(res.body.data).to.have.property("totes");
  expect(res.body.data.totes).to.be.an("array");

  expect(res.body.data.totes.length, "Số rổ được assign").to.eq(
    expectedToteCount
  );
}
