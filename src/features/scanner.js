import { goToView } from "../router.js";
import { getState } from "../state.js";

function mapFormat(decodedResult) {
  let formatStr = "CODE128";
  if (decodedResult.result && decodedResult.result.format) {
    const formatName = decodedResult.result.format.formatName;
    if (formatName && formatName.includes("QR")) formatStr = "QR_CODE";
    else if (formatName && formatName.includes("EAN_13")) formatStr = "EAN13";
    else if (formatName && formatName.includes("EAN_8")) formatStr = "EAN8";
    else if (formatName && formatName.includes("UPC_A")) formatStr = "UPC";
  }
  return formatStr;
}

export function startScanner(onSuccess) {
  const state = getState();
  if (state.scanner) return;

  // Html5Qrcode is loaded from CDN in index.html
  state.scanner = new Html5Qrcode("reader");
  const config = { fps: 10, qrbox: { width: 250, height: 100 } };

  setTimeout(() => {
    state.scanner
      .start(
        { facingMode: "environment" },
        config,
        (decodedText, decodedResult) => {
          state.currentScan = { text: decodedText, format: mapFormat(decodedResult) };
          stopScanner();
          onSuccess();
        },
        () => {}
      )
      .catch((error) => {
        console.error(error);
        alert("Camera access denied or unavailabe.");
      });
  }, 300);
}

export function stopScanner() {
  const state = getState();
  if (!state.scanner) return;
  state.scanner
    .stop()
    .then(() => {
      state.scanner.clear();
      state.scanner = null;
    })
    .catch(() => {});
}

export function bindScannerEvents() {
  document.getElementById("btn-cancel-scan").addEventListener("click", () => {
    stopScanner();
    goToView("view-dashboard");
  });
}
