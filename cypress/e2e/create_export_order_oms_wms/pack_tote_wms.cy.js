describe("template spec", () => {
  const locator = {
    tableInputField: "input[placeholder='Quét hoặc nhập mã bàn']",
    toteInputField: "input[placeholder='Quét mã Xe/ Bảng kê/ Rổ']",
    barcodeInputField: "input[placeholder='Quét mã Sản phẩm/ Barcode/ Serial']",
    materialsInputField:
      "input[placeholder='Quét hoặc nhập mã vật liệu đóng gói']",
  };
  before(() => {
    cy.loginWMS();
    cy.intercept(
      "PUT",
      `${Cypress.env("urlWMS")}/v1/pickup/commit-item-sold/${Cypress.env(
        "toteCode"
      )}`
    ).as("commitItemSold");
  });

  function scanTable() {
    cy.get(locator.tableInputField)
      .type(Cypress.env("tableCode"))
      .type("{enter}");
  }

  function scanTote() {
    cy.get(locator.toteInputField)
      .type(Cypress.env("toteCode"))
      .type("{enter}");
  }

  function handlePacking() {
    // 1️⃣ Chờ pickup detail
    cy.wait("@commitItemSold").then(({ response }) => {
      const items = response.body.data.list_items;
      items.forEach((item) => {
        const barcode = item.goods_id.barcodes[0];
        const scanQty = item.quantity_sold - item.quantity_pick;
        if (scanQty <= 0) return;

        Cypress._.times(scanQty, () => {
          cy.get(locator.barcodeInputField)
            .should("be.visible")
            .clear()
            .type(`${barcode}{enter}`);
          cy.wait("@commitItemSold");
        });
      });
    });

    // 2️⃣ Scan vật liệu
    cy.get(locator.materialsInputField).clear().type("40x20x20{enter}");

    // 3️⃣ Kiểm tra UI để quyết định dừng hay tiếp tục
    cy.wait(10000); // Đợi UI render sau khi scan NVL

    // Trả về một "tín hiệu" thông qua alias hoặc check trực tiếp trong lúc đệ quy
    return cy.get("body").then(($body) => {
      const selector = "span[data-cy='detail-list-order']";
      const $el = $body.find(selector);

      if ($el.length === 0) {
        cy.log("✅ Đã hết đơn hàng hoặc Element biến mất - DỪNG LẠI");
        // Tạo một alias để đánh dấu trạng thái kết thúc
        cy.wrap(true).as("isFinished");
      } else {
        cy.wrap(false).as("isFinished");
      }
    });
  }

  function openCustomerTable() {
    cy.get("span[data-cy='detail-list-order']")
      .should("be.visible")
      .click({ force: true });

    cy.get("#customerTable").should("be.visible");
  }

  function packingAllOrders() {
    function packNext() {
      openCustomerTable();

      cy.get("#customerTable button")
        .contains("Đóng gói")
        .filter(":not(:disabled)")
        .then(($btns) => {
          if ($btns.length === 0) {
            cy.log("✅ Không còn nút Đóng gói nào.");
            return;
          }

          cy.wrap($btns.first()).click({ force: true });

          // Chạy handlePacking
          handlePacking();

          // Sau khi handlePacking xong, kiểm tra xem có chạy tiếp không
          cy.get("@isFinished").then((isFinished) => {
            if (isFinished) {
              cy.log("🛑 Hoàn tất đóng gói.");
            } else {
              cy.log("🔄 Tiếp tục đơn kế tiếp...");
              packNext();
            }
          });
        });
    }

    packNext();
  }

  it("Pack with tote", () => {
    cy.visit(`${Cypress.env("urlWMS")}/packing`);
    scanTable();
    scanTote();
    // packingOrder();
    packingAllOrders();
  });
});
