import { deleteCardFromDB, saveCardsToDB } from "../db.js";
import { goToView } from "../router.js";
import { getState } from "../state.js";

export function showCardDetails(card) {
  const state = getState();
  state.activeCardId = card.id;

  document.getElementById("detail-card-image").src = card.photoBlob;
  document.getElementById("detail-card-name").textContent = card.name;
  document.getElementById("detail-code-string").textContent = card.codeString;

  const barcodeSvg = document.getElementById("detail-barcode");
  const qrcodeDiv = document.getElementById("detail-qrcode");

  barcodeSvg.style.display = "none";
  qrcodeDiv.style.display = "none";
  qrcodeDiv.innerHTML = "";

  if (card.format === "QR_CODE") {
    qrcodeDiv.style.display = "block";
    // QRCode is loaded from CDN in index.html
    new QRCode(qrcodeDiv, {
      text: card.codeString,
      width: 200,
      height: 200,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });
  } else {
    barcodeSvg.style.display = "block";
    try {
      // JsBarcode is loaded from CDN in index.html
      JsBarcode("#detail-barcode", card.codeString, {
        format:
          card.format === "EAN13" || card.format === "UPC" || card.format === "EAN8"
            ? card.format
            : "CODE128",
        width: 2,
        height: 100,
        displayValue: false,
      });
    } catch (error) {
      JsBarcode("#detail-barcode", card.codeString, {
        format: "CODE128",
        displayValue: false,
      });
    }
  }

  goToView("view-details");
}

export function bindDetailsEvents(renderDashboard) {
  document.getElementById("btn-back-details").addEventListener("click", () => {
    goToView("view-dashboard");
  });

  document.getElementById("btn-delete-card").addEventListener("click", async () => {
    const state = getState();
    if (confirm("Delete this card?")) {
      await deleteCardFromDB(state.activeCardId);
      state.cards = state.cards.filter((card) => card.id !== state.activeCardId);
      state.cards
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .forEach((card, index) => {
          card.sortOrder = index;
        });
      await saveCardsToDB(state.cards);
      renderDashboard();
      goToView("view-dashboard");
    }
  });
}
