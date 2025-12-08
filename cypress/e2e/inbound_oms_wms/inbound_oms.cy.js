describe("inbound_OMS", () => {
  function loginOMS(email, password) {
    cy.visit("https://stg-oms.nandh.vn/login");
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();
    cy.wait(1000);
  }

  function AccessCreateInboundPage() {
    cy.visit("https://stg-oms.nandh.vn/create-shipment-inbound");
  }

  function selectWarehouse(warehouse) {
    cy.get("div.css-1jqq78o-placeholder")
      .contains("Chọn địa chỉ lấy hàng")
      .click({ force: true });
    cy.get("#react-select-2-option-0")
      .contains(warehouse)
      .click({ force: true });
  }

  function selectSupplier(nameSupplier) {
    cy.get(".css-hlgwow").contains("Chọn nhà cung cấp").click({ force: true });

    // Find the dropdown menu that is visible and contains the text 'Bandai'
    cy.get('div[id$="-listbox"]')
      .should("be.visible")
      .within(() => {
        cy.contains(nameSupplier).click({ force: true });
      });
  }
  function nhapMaThamChieuInbound() {
    const ma = "MTC" + Date.now();
    cy.get('input[placeholder="Nhập mã tham chiếu"]')
      .type(ma)
      .should("have.value", ma);
    return cy.wrap(ma);
  }
  function selectItem(productsInbound) {
    cy.contains("Thêm sản phẩm").click({ force: true });
    productsInbound.forEach((product, index) => {
      if (index > 0) {
        cy.contains("Thêm sản phẩm mới").click({ force: true });
      }
      cy.get(".css-hlgwow").contains("Chọn sản phẩm").click({ force: true });
      cy.get('div[id^="react-select-"][id*="-option-"]')
        .contains(product.sku)
        .click({ force: true });
      cy.get(`input[name="listProduct.${index}.productQty"]`)
        .clear()
        .type(product.qty.toString())
        .should("have.value", product.qty.toString());
    });
    cy.get('button[type="button"]').contains("Xác nhận").click({ force: true });
  }
  function inputDemension(length, width, height) {
    cy.get('input[placeholder="Dài"]').type(length);
    cy.get('input[placeholder="Rộng"]').type(width);
    cy.get('input[placeholder="Cao"]').type(height);
  }

  function btnCreatePOInbound() {
    // Nhấp nút tạo mới
    cy.get('button[type="button"]').contains("Tạo mới").click({ force: true });
    // Tạp phiếu nhập()
    cy.get('button[type="button"]')
      .contains("Tạo và duyệt phiếu nhập")
      .click({ force: true });
  }
  it("TẠO PHIÊN NHẬP KHO", () => {
    loginOMS("thanh.auto@nandh.vn", "Nhl@12345");
    AccessCreateInboundPage();
    selectWarehouse("PK100270");
    selectSupplier("Supplier A");
    nhapMaThamChieuInbound().then((maThamChieuInbound) => {
      cy.log("Mã tham chiếu đã lưu", maThamChieuInbound);
      const productsInbound = [{ sku: "HOPKH", qty: 100 }];
      selectItem(productsInbound);
      inputDemension("10", "10", "10");
      btnCreatePOInbound();
      cy.writeFile("cypress/temp/inBound.json", {
        maThamChieuInbound,
        productsInbound,
      });
    });
  });
});
