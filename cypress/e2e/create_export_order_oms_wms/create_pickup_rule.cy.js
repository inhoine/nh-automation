describe("template spec", () => {
  function loginWMS(email, password, fc) {
    cy.visit("https://stg-wms.nandh.vn/login");
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();
    cy.wait(1000);
    cy.get("span.text-muted.fs-10").contains(fc).click();
    cy.get('button[type="button"]').contains(fc).click();
    cy.wait(1000);
  }

  function getOrderIDWMS() {
    return cy.readFile("cypress/temp/maDonHang.json").then((data) => {
      const listOMS = data.maDonHangOMS; // mảng OMS
      const results = []; // nơi lưu kết quả

      cy.visit(`https://stg-wms.nandh.vn/order-list?`);

      return cy
        .wrap(listOMS)
        .each((maOMS) => {
          cy.log("Đang lấy mã OMS:", maOMS);

          return cy
            .contains("p", maOMS)
            .closest("tr")
            .then(($row) => {
              const maDonHangWMS = $row.find("a.link-secondary").text().trim();
              const loaiDon = $row
                .find('span[class*="badge-soft"]')
                .text()
                .trim();

              cy.log(`=> WMS: ${maDonHangWMS} - ${loaiDon}`);

              // push vào mảng kết quả
              results.push({
                maOMS,
                maWMS: maDonHangWMS,
                loaiDon,
              });
            });
        })
        .then(() => {
          // Lưu file cho use ở bước tiếp theo
          cy.writeFile("cypress/temp/maDonHangWMS.json", {
            danhSach: results,
          });

          cy.log("Đã lưu danh sách WMS:", JSON.stringify(results));
        });
    });
  }

  function selectPickupType(pickupType) {
    cy.visit(`https://stg-wms.nandh.vn/pickup-order`);

    cy.get("div.css-1jqq78o-placeholder")
      .contains("Chọn loại bảng kê")
      .click({ force: true });

    return cy.contains("div", pickupType).click({ force: true });
  }
  function selectPickupStrategy(pickupStrategy) {
    cy.get("div.css-1jqq78o-placeholder")
      .contains("Chọn loại chiến lược")
      .click({ force: true });
    return cy.contains("div", pickupStrategy).click({ force: true });
  }

  function selectTote(size) {
    cy.get("div.css-1jqq78o-placeholder")
      .contains("Chọn kích thước đơn hàng")
      .click();
    return cy.contains("div", size).click({ force: true });
  }

  function CreatePickupWithCondition(pickupType, pickupStrategy, toteSize) {
    selectPickupType(pickupType);

    const isSpecialType =
      pickupType.includes("Bảng kê đơn hàng B2C - SSO") ||
      pickupType.includes("Bảng kê đơn hàng B2C - MSO");

    if (isSpecialType) {
      cy.log(`⚠️ Đây là loại SSO/MSO, cần chọn Size Rổ và BỎ QUA Chiến lược.`);

      // --- LOGIC MỚI: CHỌN SIZE RỔ ---
      selectTote(toteSize);
      // --- BỎ QUA selectPickupStrategy ---
    } else {
      cy.log(`✅ Cần chọn Chiến lược và BỎ QUA Size Rổ.`);

      // --- LOGIC CHỌN CHIẾN LƯỢC ---
      selectPickupStrategy(pickupStrategy);
      // --- BỎ QUA selectTote ---
    }
  }

  function selectCustomer(customer) {
    cy.get("div.css-1jqq78o-placeholder").contains("Chọn khách hàng").click();
    return cy.contains("div", customer).click({ force: true });
  }

  function selectTimeCreateOrder(time) {
    cy.get("div.css-1jqq78o-placeholder")
      .contains("Chọn thời gian tạo")
      .click();
    return cy.contains("div", time).click({ force: true });
  }

  function customizePickUpCondition(optionPickup) {
    cy.get("button.btn-success").contains("Tuỳ chỉnh").click();
    cy.get(".ri-arrow-down-s-line").click({ force: true });
    cy.get(".input-group > .dropdown-menu > .dropdown-item")
      .contains(optionPickup)
      .click();
  }

  function createPickupType() {
    cy.readFile("cypress/temp/maDonHangWMS.json").then((data) => {
      cy.get("button[type='button']").contains("Nhập mã đơn").click();
      cy.wait(1000);

      const orderWMS = data.danhSach.map((item) => item.maWMS);
      const chuoiNhap = orderWMS.join(", ");

      cy.get(
        "textarea[placeholder='Nhập danh sách mã đơn hàng, ví dụ: NH1234567, ABC-01, ...']"
      )
        .clear()
        .type(chuoiNhap, { delay: 0 });

      cy.get("button[type='button']").contains("Xác nhận").click();
      cy.get("button.btn-success").contains("Xác nhận").click();

      cy.get("button.btn-success").contains("Tạo bảng kê").click();
      cy.wait(500);
    });
  }

  before(() => {
    cy.writeFile("cypress/temp/itemsList.json", []);
    loginWMS("thanh.nn@nandh.vn", "Nhl@123456", "FC HN");
  });

  it("Export order on WMS", () => {
    getOrderIDWMS();
    CreatePickupWithCondition(
      "Bảng kê đơn hàng B2C - MSO",
      "Lấy theo rổ",
      "Kích thước nhỏ"
    );
    selectCustomer("auto");
    // selectTimeCreateOrder("12");
    customizePickUpCondition("DS mã đơn hàng");
    createPickupType();
  });
});
