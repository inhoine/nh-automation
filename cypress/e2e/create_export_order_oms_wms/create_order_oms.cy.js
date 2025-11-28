describe("Create order on OMS", () => {
  before(() => {
    const filePath = "cypress/temp/maDonHang.json";
    cy.writeFile(filePath, { maDonHangOMS: [] });
  });
  beforeEach(() => {
    loginOMS("thanh.auto@nandh.vn", "Nhl@12345");
  });

  function loginOMS(email, password) {
    cy.visit("https://stg-oms.nandh.vn/login");
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();
    cy.wait(1000);
    cy.url().should("include", "/dashboard?");
  }

  function accessCreateOrderPage() {
    cy.visit("https://stg-oms.nandh.vn/create-order-b2c");
  }
  function selectCustomer() {
    cy.contains("Tạo đơn hàng bán lẻ").should("be.visible");
    cy.get("div.css-1jqq78o-placeholder")
      .contains("Chọn khách hàng")
      .click({ force: true });
    cy.get('[id^="react-select-"][id$="-option-0"]').click();
  }

  function selectStore() {
    cy.get("div.css-1jqq78o-placeholder")
      .contains("Chọn kênh bán hàng")
      .click({ force: true });
    cy.get('[id^="react-select-"][id$="-option-0"]').click();
  }

  function selectWarehouse(id_warehouse) {
    cy.get("div.css-x1kfuk-control")
      .contains("Chọn địa chỉ lấy hàng")
      .click({ force: true });
    cy.contains("p.fs-14.fw-medium.mb-0", id_warehouse).click();
    cy.log("Chọn địa chỉ lấy hàng thành công");
  }

  function selectSku(tenSanPham, qty, index = 0) {
    cy.get("div.css-hlgwow").contains("Chọn sản phẩm").click({ force: true });
    cy.get('[id^="react-select-"][id$="-listbox"]')
      .contains("div", tenSanPham)
      .click({ force: true });
    cy.log(`✅ Chọn sản phẩm ${tenSanPham} thành công`);
    cy.get('input[placeholder="Nhập số lượng"]')
      .eq(index)
      .clear({ force: true })
      .type(`${qty}`, { delay: 200 })
      .should("have.value", `${qty}`);
  }
  function selectMoreSku(products) {
    products.forEach((product, index) => {
      if (index > 0) {
        cy.contains("button", "Thêm sản phẩm").click({ force: true });
      }
      selectSku(product.sku, product.qty, index);
    });
  }
  function inputOrderID() {
    const ma = "OrderID-OMS" + Date.now();
    cy.get('input[placeholder="Nhập mã đơn hàng"]')
      .type(ma)
      .should("have.value", ma);
    return cy.wrap(ma);
  }

  function btnCreateOrder() {
    cy.get('button[type="button"]').contains("Tiếp theo").click();
    return cy.get('button[type="button"]').contains("Tạo đơn").click();
  }

  function optionCreateOrder() {
    cy.get("button.dropdown-item").contains("Tạo và xử lý đơn hàng").click();
    cy.wait(1000);
  }

  Cypress._.times(3, () => {
    it("Create order successfully", () => {
      let maDonHangOMS; // 1. Khai báo biến để lưu Mã Đơn Hàng

      // A. Chuẩn bị dữ liệu và lấy Mã Đơn Hàng
      accessCreateOrderPage();
      selectCustomer();
      selectStore();
      selectWarehouse("PK100270");

      const products = [
        { sku: "MHMSI", qty: 1 },
        { sku: "MHASUS", qty: 1 },
      ];
      selectMoreSku(products);

      // B. Lấy Mã Đơn Hàng từ inputOrderID() và lưu vào biến
      return (
        inputOrderID()
          .then((ma) => {
            maDonHangOMS = ma; // 2. Lưu Mã đơn hàng vào biến `maDonHangOMS`
          })

          // C. Thực hiện hành động click (không cần truyền giá trị ở đây)
          .then(() => {
            return btnCreateOrder();
          })

          // D. Chọn option (và đảm bảo nó là Chainable)
          .then(() => {
            return optionCreateOrder();
          })

          // E. Xử lý lưu file (sử dụng biến đã lưu ở bước B)
          .then(() => {
            const filePath = "cypress/temp/maDonHang.json";
            const maDonHangOMS_saved = maDonHangOMS;

            // Phải RETURN các lệnh Cypress trong chuỗi .then()
            return cy.task("readJsonIfExists", filePath).then((data) => {
              const prev = data?.maDonHangOMS || [];
              // Sử dụng biến `maDonHangOMS` đã được lưu
              const updated = [...prev, maDonHangOMS_saved];

              return cy.writeFile(filePath, {
                maDonHangOMS: updated,
              });
            });
          })
      );
    });
  });
});
