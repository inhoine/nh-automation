describe("inbounds_WMS", () => {
  let maThamChieuIB_fallback;
  let trimmedMaDonHang_fallback;
  const DEFAULT_MA_THAM_CHIEU_IB = "NHIV26343253";
  const DEFAULT_TRIMMED_MA_DON_HANG = "NHIV26343253";

  // Cấu hình WMS (mình thêm vào để code không bị lỗi undefined biến config_wms)

  beforeEach(() => {
    loginWMS("thanh.nn@nandh.vn", "Nhl@123456", "FC HN");
    return cy.readFile("cypress/temp/inBound.json", { log: false }).then(
      (data) => {
        maThamChieuIB_fallback =
          data.maThamChieuInbound || DEFAULT_MA_THAM_CHIEU_IB;
        trimmedMaDonHang_fallback =
          data.trimmedMaDonHang || DEFAULT_TRIMMED_MA_DON_HANG;
        cy.log(`✅ Đã đọc file temp. Mã TC: ${maThamChieuIB_fallback}`);
      },
      (error) => {
        cy.log("⚠️ File temp không ổn định, dùng mặc định.");
        maThamChieuIB_fallback = DEFAULT_MA_THAM_CHIEU_IB;
        trimmedMaDonHang_fallback = DEFAULT_TRIMMED_MA_DON_HANG;
      }
    );
  });

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

  function layMaDonNhapHang() {
    if (maThamChieuIB_fallback === DEFAULT_MA_THAM_CHIEU_IB) {
      cy.log(`Dùng Mã Đơn Hàng mặc định: ${trimmedMaDonHang_fallback}`);
      // SỬA: Đọc file cũ trước khi ghi để không mất productsInbound
      return cy.readFile("cypress/temp/inBound.json").then((currentData) => {
        currentData.maThamChieuInbound = maThamChieuIB_fallback;
        currentData.trimmedMaDonHang = trimmedMaDonHang_fallback;

        // Trả về kết quả của cy.writeFile. Lệnh này tự động trả về Chainable.
        return cy
          .writeFile("cypress/temp/inBound.json", currentData)
          .then(() => {
            // Trả về giá trị đồng bộ TẠI ĐÂY (bên trong then cuối)
            return trimmedMaDonHang_fallback;
          });
      });
    }

    cy.visit("https://stg-wms.nandh.vn/shipment");
    return cy
      .contains("span", maThamChieuIB_fallback)
      .closest("tr")
      .find("a.link-secondary")
      .invoke("text")
      .then((maDonHangIB) => {
        const trimmedMaDonHang = maDonHangIB.trim();
        return cy
          .get(`a[href^="/shipment/"]`)
          .contains(trimmedMaDonHang)
          .click({ force: true })
          .then(() => {
            // SỬA: Đọc file cũ trước khi ghi
            return cy
              .readFile("cypress/temp/inBound.json")
              .then((currentData) => {
                currentData.trimmedMaDonHang = trimmedMaDonHang;
                // Trả về kết quả của cy.writeFile.
                return cy
                  .writeFile("cypress/temp/inBound.json", currentData)
                  .then(() => {
                    return trimmedMaDonHang; // Giá trị đồng bộ được trả về an toàn
                  });
              });
          });
      });
  }

  function scanQRInbound() {
    cy.readFile("cypress/temp/inBound.json").then(({ trimmedMaDonHang }) => {
      cy.log(`Scan QR với Mã Đơn: ${trimmedMaDonHang}`);
      cy.loginMobileAPI().then(() => {
        // Đảm bảo bạn có lệnh custom command này
        const mobileToken = Cypress.env("mobileToken");
        return cy.request({
          method: "PUT",
          url: `https://stg-wms.nandh.vn/v1/po/received-po-at-warehouse/${trimmedMaDonHang}/`,
          headers: {
            authorization: mobileToken,
            accept: "application/json",
            "content-type": "application/json",
          },
          body: {
            status_id: 101,
            shipment_images: [
              {
                image_urls:
                  "https://nhl.sgp1.cdn.digitaloceanspaces.com/ts/b4d1499e69ae4c08a5825353252735ef.jpg",
              },
            ],
            reason_for_refusal: "",
            delivery_drive_name: "Tran Van A",
            delivery_drive_phone: "0123456789",
            delivery_drive_license_number: "81C-71720",
          },
          failOnStatusCode: false,
        });
      });
    });
  }

  function kiemHangNhapKho(config_wms) {
    cy.readFile("cypress/temp/inBound.json").then(({ trimmedMaDonHang }) => {
      cy.log(`Kiểm Hàng cho Đơn: ${trimmedMaDonHang}`);
      cy.visit(`${config_wms.wmsUrl}/inspection`);
      cy.get('input[placeholder="Quét hoặc nhập mã bàn"]').type(
        "PACK02{enter}"
      );
      cy.wait(1000);
      cy.get('input[placeholder="Quét mã PO"]').type(
        `${trimmedMaDonHang}{enter}`
      );
      cy.wait(1000);
      cy.get('input[placeholder="Quét mã kiện"]').type(
        `${config_wms.maKien}{enter}`
      );

      // Định nghĩa hàm xử lý row BÊN TRONG kiemHangNhapKho để tiện gọi đệ quy
      // nhưng phải đảm bảo nằm ngoài scope của lệnh cy.get trước đó để tránh rối
      function xuLyRow(index = 0) {
        cy.readFile("cypress/temp/inBound.json").then((data) => {
          // SỬA: Lấy trực tiếp từ data đọc được
          const productsInbound = data.productsInbound;

          cy.get("table.table.table-nowrap.mb-0 tbody tr").then(($rows) => {
            if (index >= $rows.length) {
              cy.log("✅ Đã xử lý hết tất cả các dòng");
              cy.get("button.btn-success")
                .contains("Hoàn tất phiên kiểm")
                .click({ force: true });
              return;
            }

            const $row = $rows.eq(index);
            cy.wrap($row).within(() => {
              cy.get("td")
                .eq(0)
                .invoke("text")
                .then((poCode) => {
                  cy.log(`🔹 Đang xử lý dòng ${index + 1}: ${poCode.trim()}`);
                });
              cy.get("button.btn-soft-secondary.dropdown").click({
                force: true,
              });
            });

            cy.contains("button.dropdown-item", "Kiểm hàng").click({
              force: true,
            });

            cy.get("div.text-muted.d-flex span")
              .invoke("text")
              .then((text) => {
                const maBarcode = text.trim();
                cy.log("Mã barcode là: " + maBarcode);
                const productToFind = maBarcode.split("-")[0].trim();

                // SỬA: Tìm theo p.sku thay vì p.name
                const currentProduct = productsInbound.find(
                  (p) => p.sku === productToFind
                );

                if (currentProduct) {
                  cy.get('input[name="quantity_goods_normal"]')
                    .clear()
                    .type(currentProduct.qty.toString());
                  cy.log(
                    `✅ Tìm thấy SP: ${currentProduct.sku} - SL: ${currentProduct.qty}`
                  );
                } else {
                  cy.log(`⚠️ Không tìm thấy sản phẩm`);
                }

                cy.get('input[placeholder="Chọn mã barcode"]').type(maBarcode);
                cy.wait(1000);

                const goodsFields = [
                  {
                    selector: 'input[name="goods_d"]',
                    value: config_wms.length,
                  },
                  {
                    selector: 'input[name="goods_w"]',
                    value: config_wms.width,
                  },
                  {
                    selector: 'input[name="goods_h"]',
                    value: config_wms.height,
                  },
                  {
                    selector: 'input[name="goods_weight"]',
                    value: config_wms.weight,
                  },
                ];

                goodsFields.forEach(({ selector, value }) => {
                  cy.get("body").then(($body) => {
                    const $el = $body.find(selector);
                    if ($el.length > 0 && !$el.is(":disabled")) {
                      cy.get(selector).clear().type(value);
                    }
                  });
                });
                cy.wait(1000);

                // --- LOGIC SERIAL ---
                const serialButtonSelector =
                  'button[type="button"]:contains("Quét mã serial")';
                cy.get("body").then(($body) => {
                  if ($body.find(serialButtonSelector).length) {
                    cy.contains(serialButtonSelector, "Quét mã serial").click({
                      force: true,
                    });
                    const soLuongCanNhap = currentProduct
                      ? currentProduct.qty
                      : 1;
                    const timestamp = new Date().getTime();

                    for (let i = 1; i <= soLuongCanNhap; i++) {
                      const serialNumber = `${maBarcode}-${i}`;
                      cy.get('input[placeholder="Quét mã serial"]')
                        .type(`${serialNumber}{enter}`)
                        .wait(500);
                    }
                    cy.get("button.btn-success").contains("Xác nhận").click();
                    cy.wait(1000);
                  }
                });
                // --- END SERIAL ---

                cy.contains('button[type="button"]', "Kiểm hàng").click();

                // Xử lý nút Bỏ qua / Xác nhận popup
                cy.get("body").then(($body) => {
                  if (
                    $body.find('button.btn-light:contains("Bỏ qua")').length > 0
                  ) {
                    cy.contains("button.btn-light", "Bỏ qua").click();
                    cy.wait(1000);
                    if (
                      $body.find('button.btn-success:contains("Xác nhận")')
                        .length > 0
                    ) {
                      cy.contains("button.btn-success", "Xác nhận").click({
                        force: true,
                      });
                    }
                  }
                });

                cy.get('input[placeholder="Quét mã kiện"]')
                  .clear()
                  .type(`${config_wms.maKien}{enter}`);
                cy.wait(1000);

                // Đệ quy dòng tiếp theo
                xuLyRow(index + 1);
              });
          });
        });
      }

      // Gọi hàm bắt đầu xử lý
      xuLyRow(0);
    });
  }

  it("InboundWMS", () => {
    const config_wms = {
      wmsUrl: "https://stg-wms.nandh.vn",
      maKien: "PN00001",
      length: "10",
      width: "10",
      height: "10",
      weight: "10",
    };
    layMaDonNhapHang();
    scanQRInbound();
    kiemHangNhapKho(config_wms);
  });
});
