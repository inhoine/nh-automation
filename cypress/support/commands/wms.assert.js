export function assertPickup(pickup, options = {}) {
  if (options.toteRequired !== undefined) {
    expect(pickup.is_tote_required).to.eq(options.toteRequired);
  }

  if (options.type === "SSO") {
    expect(pickup.is_sso).to.be.true;
    expect(pickup.is_mso).to.be.false;
  }

  if (options.type === "MSO") {
    expect(pickup.is_mso).to.be.true;
    expect(pickup.is_sso).to.be.false;
  }
}

export function assertRequiredToteCount(pickup) {
  const toteCount = getRequiredToteCount(pickup);

  if (pickup.is_sso) {
    expect(toteCount, "SSO phải scan 1 rổ").to.eq(1);
  }

  if (pickup.is_mso) {
    expect(toteCount, "MSO phải scan số rổ = total_order").to.eq(
      pickup.total_order
    );
  }
}

export function assertAssignBasketSuccess(res, expectedToteCount) {
  expect(res.status).to.eq(200);
  expect(res.body.error).to.be.false;

  expect(res.body.data.totes.length, "Số rổ được assign").to.eq(
    expectedToteCount
  );
}
