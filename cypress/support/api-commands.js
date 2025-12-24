// --- LOGIN MOBILE ---
Cypress.Commands.add("loginMobileAPI", () => {
  return cy
    .request({
      method: "POST",
      url: "https://stg-wms.nandh.vn/v1/users/staff-login",
      headers: {
        accept: "Application/json",
        "content-type": "Application/json",
        "accept-language": "vi",
        "user-agent": "NHWMS/6 CFNetwork/3826.500.131 Darwin/24.5.0",
      },
      body: {
        email: "thanh.nn@nandh.vn",
        password: "Nhl@123456",
        warehouse_id: 3,
      },
    })
    .then((response) => {
      expect(response.status).to.eq(200);

      const mobileToken = response.body.data.token;
      Cypress.env("mobileToken", mobileToken);
      cy.log("Mobile Token: " + mobileToken);

      return cy.wrap(mobileToken);
    });
});

Cypress.Commands.add("loginWMSAPI", () => {
  return cy
    .request("POST", "https://stg-wms.nandh.vn/v1/users/staff-login", {
      email: "thu.nguyenthingoc@nandhlogistics.vn",
      password: "Admin123!@#",
      warehouse_id: 1,
    })
    .then((resp) => {
      const token = resp.body.data.token;
      Cypress.env("token", token);

      cy.log("Website Token: " + token);
      const staffInfo = resp.body.data.staff_info;

      // Set localStorage
      window.localStorage.setItem("token", token);
      window.localStorage.setItem("authUser", JSON.stringify(staffInfo));
      window.localStorage.setItem("i18nextLng", "vi");

      // ✅ Cách 1: Bọc return bằng cy.wrap()
      return cy.wrap(token);

      // hoặc Cách 2: bỏ return luôn, nếu không cần giá trị trả về
    });
});

// --- TÌM PICKUP CODE ---
Cypress.Commands.add("findPickupCodeByWMS", (maWMSList) => {
  cy.log("📦 Đang tìm pickupCode theo mã WMS...");
  cy.intercept("GET", "**/v1/pickup/list*status_id=600*").as(
    "getPickupList600"
  );
  cy.visit(`https://stg-wms.nandh.vn/pickup-list`);

  return cy.wait("@getPickupList600").then(({ response }) => {
    const list = response.body.data || [];
    const found = list.find((x) =>
      x.picking_strategy?.list_tracking_code?.some((code) =>
        maWMSList.includes(code)
      )
    );

    expect(found, "Tìm thấy đơn hàng theo WMS").to.not.be.undefined;
    const pickupCode = found.pickup_code;

    // ⚠️ LỖI CŨ: cy.log xong return pickupCode
    cy.log(`✅ Found pickupCode: ${pickupCode}`);

    // ✅ SỬA: Dùng cy.wrap để giữ chain
    return cy.wrap(pickupCode);
  });
});

// --- MAP TROLLEY ---
Cypress.Commands.add(
  "tryMapTrolley",
  (pickupCode, trolleyCode, mobileToken) => {
    function tryMapTrolley(retries = 36) {
      if (retries <= 0)
        throw new Error("❌ Map trolley không thành công sau 3 phút");

      cy.log(`🔄 Đang map trolley (còn ${retries} lần thử)...`);
      return cy
        .request({
          method: "PUT",
          url: `https://stg-wms.nandh.vn/v1/trolley/trolley-map-picking/${pickupCode}`,
          headers: {
            Authorization: mobileToken,
            "Content-Type": "application/json",
          },
          body: { trolley_code: trolleyCode, skip_trolley_code: false },
          failOnStatusCode: false,
        })
        .then((resp) => {
          if (resp.status === 200) {
            // ⚠️ LỖI CŨ: cy.log xong return true
            cy.log("✅ Map trolley thành công");

            // ✅ SỬA: Dùng cy.wrap
            return cy.wrap(true);
          } else {
            cy.wait(10000);
            return tryMapTrolley(retries - 1);
          }
        });
    }
    return tryMapTrolley();
  }
);

// --- LẤY BIN CODE ---
Cypress.Commands.add("getBinCodesForPicking", (pickupCode, mobileToken) => {
  cy.log("🗂️ Lấy danh sách bin...");
  return cy
    .request({
      method: "GET",
      url: `https://stg-wms.nandh.vn/v1/trolley/binset/${pickupCode}?is_issue=-1`,
      headers: { Authorization: `Bearer ${mobileToken}` },
    })
    .then((response) => {
      const binCodes = response.body.data.map((i) => i.bin_code);

      // ⚠️ LỖI CŨ: cy.log xong return array
      cy.log(`📦 Có ${binCodes.length} bin cần xử lý`);

      // ✅ SỬA: Dùng cy.wrap
      return cy.wrap(binCodes);
    });
});

// --- PICK ITEMS ---
Cypress.Commands.add("pickItemsInBin", (pickupCode, binCode, mobileToken) => {
  cy.log(`🧩 Bin: ${binCode}`);
  return cy
    .request({
      method: "GET",
      url: `https://stg-wms.nandh.vn/v1/trolley/picking/${pickupCode}?bin_code=${binCode}`,
      headers: { Authorization: `Bearer ${mobileToken}` },
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
        cy.writeFile("cypress/temp/itemsList.json", [...existing, ...items]);
      });

      return cy.wrap(items).each(({ barcode, qty }) => {
        cy.log(`📦 Pick ${barcode} (${qty})`);
        return cy
          .request({
            method: "PUT",
            url: `https://stg-wms.nandh.vn/v1/trolley/detail/${pickupCode}`,
            headers: { Authorization: `Bearer ${mobileToken}` },
            body: { bin_code: binCode, goods_code: barcode, quantity: qty },
          })
          .then((resp) => {
            expect(resp.status).to.eq(200);
          });
      });
    });
});

// --- COMMIT TROLLEY ---
Cypress.Commands.add(
  "commitTrolleyStatus",
  (pickupCode, trolleyCode, mobileToken) => {
    cy.log("🚀 Commit trolley status...");
    return cy
      .request({
        method: "PUT",
        url: `https://stg-wms.nandh.vn/v1/trolley/commit-status/${pickupCode}`,
        // ⚠️ LƯU Ý: Tôi đã thêm 'Bearer ' vào đây cho đồng bộ với các API khác
        headers: { Authorization: `Bearer ${mobileToken}` },
        body: { trolley_code: trolleyCode },
      })
      .then((resp) => {
        expect(resp.status).to.eq(200);

        // ⚠️ LỖI CŨ: cy.log xong return pickupCode
        cy.log("✅ Commit thành công");

        // ✅ SỬA: Dùng cy.wrap
        return cy.wrap(pickupCode);
      });
  }
);

Cypress.Commands.add("getAvailableTotes", (count) => {
  return cy
    .request({
      method: "GET",
      url: "https://stg-wms.nandh.vn/v1/equipment/list?page_size=100",
      headers: {
        Authorization: `Bearer ${Cypress.env("wmsToken")}`,
      },
    })
    .then((res) => {
      const toteCodes = res.body.data
        .filter((i) => i.status === "available")
        .slice(0, count)
        .map((i) => i.code);

      expect(toteCodes.length).to.eq(count);

      // ✅ wrap để Cypress hiểu đây là async value
      return cy.wrap(toteCodes, { log: false });
    });
});
