import { initDB, loadCardsFromDB } from "./db.js";
import { goToView } from "./router.js";
import { getState } from "./state.js";
import { bindDashboardEvents, renderDashboard } from "./features/dashboard.js";
import { bindDetailsEvents } from "./features/details.js";
import { bindPhotoEvents, startCamera } from "./features/photo.js";
import { bindScannerEvents, startScanner } from "./features/scanner.js";
import { bindSettingsEvents } from "./features/settings.js";

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then((registration) => console.log("SW Registered", registration))
      .catch((error) => console.error("SW failed", error));
  });
}

function bindEvents() {
  bindDashboardEvents({
    onAddCard: () => {
      startScanner(() => {
        goToView("view-photo");
        startCamera();
      });
    },
  });

  bindScannerEvents();
  bindPhotoEvents(renderDashboard);
  bindDetailsEvents(renderDashboard);
  bindSettingsEvents(renderDashboard);
}

async function bootstrap() {
  registerServiceWorker();
  bindEvents();
  try {
    await initDB();
    const state = getState();
    state.cards = await loadCardsFromDB();
    renderDashboard();
  } catch (error) {
    console.error("DB init failed", error);
  }
}

bootstrap();
