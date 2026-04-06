import { clearDB, saveCardToDB } from "../db.js";
import { goToView } from "../router.js";
import { getState } from "../state.js";

export function bindSettingsEvents(renderDashboard) {
  document.getElementById("btn-back-settings").addEventListener("click", () => {
    goToView("view-dashboard");
  });

  document.getElementById("btn-export").addEventListener("click", () => {
    const state = getState();
    const dataStr = JSON.stringify(state.cards, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `MimikCards_Backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  });

  document.getElementById("btn-import-trigger").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });

  document.getElementById("import-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      try {
        const importedCards = JSON.parse(loadEvent.target.result);
        if (!Array.isArray(importedCards)) {
          throw new Error("Invalid format");
        }

        await clearDB();
        for (const card of importedCards) {
          await saveCardToDB(card);
        }

        const state = getState();
        state.cards = importedCards;
        renderDashboard();
        alert("Cards imported successfully!");
        goToView("view-dashboard");
      } catch (error) {
        alert("Failed to parse backup file.");
        console.error(error);
      }
      document.getElementById("import-file").value = "";
    };
    reader.readAsText(file);
  });
}
