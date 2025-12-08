describe("Bàn giao đơn hàng", () => {
  beforeEach(() => {
    loginWMS("thanh.nn@nandh.vn", "Nhl@123456", "FC HN");
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

  it("Should successfully add MULTIPLE handover entries into ONE session", () => {
    cy.visit("https://stg-wms.nandh.vn/");

    cy.readFile("cypress/temp/maDonHangWMS.json").then((data) => {
      if (data.danhSach && data.danhSach.length > 0) {
        // Tách đơn hàng đầu tiên ra khỏi danh sách
        const firstMaWMS = data.danhSach[0].maWMS;
        const remainingMaWMS = data.danhSach.slice(1).map((item) => item.maWMS);

        cy.log(`Đơn hàng đầu tiên (Tạo lô): ${firstMaWMS}`);
        cy.log(`Số đơn hàng còn lại (Thêm vào lô): ${remainingMaWMS.length}`);

        cy.loginMobileAPI().then(() => {
          const mobileToken = Cypress.env("mobileToken");
          let currentHandoverCode = null;

          const headers = {
            Host: "stg-wms.nandh.vn",
            Accept: "Application/json",
            "Content-Type": "Application/json",
            Authorization: mobileToken,
            "accept-language": "vi",
            // ... các headers khác ...
          };

          // GIAI ĐOẠN 1: TẠO LÔ MỚI (CHỈ MỘT LẦN)
          cy.request({
            method: "POST",
            url: "https://stg-wms.nandh.vn/v1/handover/add?",
            headers: headers,
            body: {
              tracking_code: firstMaWMS,
              courier_code: "DFX",
              handover_code: null, // Tạo lô mới
            },
            failOnStatusCode: false,
          })
            .then((response) => {
              expect(response.status).to.eq(200);
              currentHandoverCode = response.body.data.handover_code;
              cy.log(`\n✅ Lô bàn giao ĐÃ TẠO: ${currentHandoverCode}`);

              // GIAI ĐOẠN 2: LẶP ĐỂ THÊM CÁC ĐƠN HÀNG CÒN LẠI VÀO LÔ ĐÃ TẠO
              return cy.wrap(remainingMaWMS).each((maWMS) => {
                cy.log(
                  `--- Đang thêm đơn: ${maWMS} vào lô ${currentHandoverCode} ---`
                );

                // Yêu cầu POST lặp lại, NHƯNG LUÔN TRUYỀN MÃ HANDOVER ĐÃ LẤY
                return cy
                  .request({
                    method: "POST",
                    url: "https://stg-wms.nandh.vn/v1/handover/add?",
                    headers: headers,
                    body: {
                      tracking_code: maWMS,
                      courier_code: "DFX",
                      handover_code: currentHandoverCode, // SỬ DỤNG LẠI MÃ ĐÃ CÓ
                    },
                    failOnStatusCode: false,
                  })
                  .then((response) => {
                    expect(response.status).to.eq(200);
                    // Không cần cập nhật handover_code nữa
                  });
              });
            })
            .then(() => {
              // GIAI ĐOẠN 3: XÁC NHẬN (APPROVED) CHỈ MỘT LẦN
              if (currentHandoverCode) {
                cy.log(
                  `\n*** Bắt đầu xác nhận (APPROVED) Handover Code: ${currentHandoverCode} ***`
                );

                // Thực hiện 2 yêu cầu PUT Approved (sử dụng currentHandoverCode)
                // ... [Code PUT Approved 1 và 2] ...

                // PUT 1: Xác nhận tài liệu
                return cy
                  .request({
                    method: "PUT",
                    url: `https://stg-wms.nandh.vn/v1/handover/approved/${currentHandoverCode}`,
                    headers: headers,
                    body: {
                      is_update_document: true,
                      list_document: [],
                    },
                  })
                  .then((response) => {
                    // PUT 2: Cập nhật thông tin tài xế/xe
                    return cy.request({
                      method: "PUT",
                      url: `https://stg-wms.nandh.vn/v1/handover/approved/${currentHandoverCode}`,
                      headers: headers,
                      body: {
                        is_update_drive: false,
                        delivery_drive_name: "Tài xế Test",
                        delivery_drive_phone: "5555",
                        delivery_drive_license_number: "hhhh",
                      },
                    });
                  })
                  .then((response) => {
                    expect(response.status).to.eq(200);
                    cy.log(
                      `PUT Approved thành công cho lô ${currentHandoverCode} ✅`
                    );
                  });
              }
            });
        });
      } else {
        cy.log("File JSON không chứa mã WMS nào để xử lý.");
      }
    });
  });
});
