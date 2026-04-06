import { goToView } from "../router.js";
import { getState } from "../state.js";
import { showCardDetails } from "./details.js";

const cardList = document.getElementById("card-list");
const emptyState = document.getElementById("empty-state");

export function renderDashboard() {
  const state = getState();
  cardList.innerHTML = "";

  if (state.cards.length === 0) {
    cardList.appendChild(emptyState);
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";
  state.cards.forEach((card) => {
    const el = document.createElement("div");
    el.className = "card-item";
    el.innerHTML = `
      <img src="${card.photoBlob}" alt="${card.name}">
      <div class="card-item-overlay">
        <h3>${card.name}</h3>
      </div>
    `;
    el.addEventListener("click", () => showCardDetails(card));
    cardList.appendChild(el);
  });

  // Keep original bottom spacing behavior.
  cardList.appendChild(emptyState);
}

export function bindDashboardEvents({ onAddCard }) {
  document.getElementById("btn-add-card").addEventListener("click", () => {
    goToView("view-scanner");
    onAddCard();
  });

  document.getElementById("btn-open-settings").addEventListener("click", () => {
    goToView("view-settings");
  });
}
