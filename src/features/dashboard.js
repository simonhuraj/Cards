import { goToView } from "../router.js";
import { getState } from "../state.js";
import { saveCardsToDB } from "../db.js";
import { showCardDetails } from "./details.js";

const cardList = document.getElementById("card-list");
const emptyState = document.getElementById("empty-state");
let draggedCardId = null;
let suppressNextClick = false;
let touchDropTargetId = null;
let autoScrollVelocity = 0;
let autoScrollFrameId = null;

function startAutoScroll() {
  if (autoScrollFrameId !== null) return;
  const tick = () => {
    if (autoScrollVelocity !== 0) {
      cardList.scrollTop += autoScrollVelocity;
      autoScrollFrameId = requestAnimationFrame(tick);
      return;
    }
    autoScrollFrameId = null;
  };
  autoScrollFrameId = requestAnimationFrame(tick);
}

function stopAutoScroll() {
  autoScrollVelocity = 0;
  if (autoScrollFrameId !== null) {
    cancelAnimationFrame(autoScrollFrameId);
    autoScrollFrameId = null;
  }
}

function updateAutoScrollFromClientY(clientY) {
  const rect = cardList.getBoundingClientRect();
  const edgeZonePx = 90;
  const maxSpeedPxPerFrame = 14;

  const distanceToTop = clientY - rect.top;
  const distanceToBottom = rect.bottom - clientY;
  let nextVelocity = 0;

  if (distanceToTop >= 0 && distanceToTop < edgeZonePx) {
    const ratio = (edgeZonePx - distanceToTop) / edgeZonePx;
    nextVelocity = -Math.max(1, Math.round(ratio * maxSpeedPxPerFrame));
  } else if (distanceToBottom >= 0 && distanceToBottom < edgeZonePx) {
    const ratio = (edgeZonePx - distanceToBottom) / edgeZonePx;
    nextVelocity = Math.max(1, Math.round(ratio * maxSpeedPxPerFrame));
  }

  autoScrollVelocity = nextVelocity;
  if (nextVelocity === 0) {
    stopAutoScroll();
  } else {
    startAutoScroll();
  }
}

function getSortedCards(cards) {
  return cards.slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

async function reorderCards(sourceCardId, targetCardId) {
  if (!sourceCardId || !targetCardId || sourceCardId === targetCardId) {
    return;
  }
  const state = getState();
  const orderedCards = getSortedCards(state.cards);
  const sourceIndex = orderedCards.findIndex((card) => card.id === sourceCardId);
  const targetIndex = orderedCards.findIndex((card) => card.id === targetCardId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return;
  }

  const [movedCard] = orderedCards.splice(sourceIndex, 1);
  orderedCards.splice(targetIndex, 0, movedCard);
  orderedCards.forEach((card, index) => {
    card.sortOrder = index;
  });

  await saveCardsToDB(orderedCards);
  state.cards = orderedCards;
  renderDashboard();
}

function clearTouchDropTargetClass() {
  cardList.querySelectorAll(".card-item.drop-target").forEach((element) => {
    element.classList.remove("drop-target");
  });
}

export function renderDashboard() {
  const state = getState();
  cardList.innerHTML = "";

  if (state.cards.length === 0) {
    cardList.appendChild(emptyState);
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";
  getSortedCards(state.cards).forEach((card) => {
    const el = document.createElement("div");
    el.className = "card-item";
    el.draggable = true;
    el.dataset.cardId = card.id;
    el.innerHTML = `
      <img src="${card.photoBlob}" alt="${card.name}">
      <div class="card-item-overlay">
        <h3>${card.name}</h3>
      </div>
    `;
    el.addEventListener("click", () => {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      showCardDetails(card);
    });
    el.addEventListener("dragstart", (event) => {
      draggedCardId = card.id;
      el.classList.add("dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
    });
    el.addEventListener("dragend", () => {
      el.classList.remove("dragging");
      draggedCardId = null;
      stopAutoScroll();
    });
    el.addEventListener("dragover", (event) => {
      event.preventDefault();
      updateAutoScrollFromClientY(event.clientY);
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    });
    el.addEventListener("drop", async (event) => {
      event.preventDefault();
      stopAutoScroll();
      suppressNextClick = true;
      await reorderCards(draggedCardId, card.id);
    });
    // Mobile browsers do not support HTML5 drag/drop well, so add touch-based reordering.
    el.addEventListener("touchstart", () => {
      draggedCardId = card.id;
      touchDropTargetId = null;
      clearTouchDropTargetClass();
      el.classList.add("dragging");
    });
    el.addEventListener(
      "touchmove",
      (event) => {
        if (!draggedCardId) return;
        event.preventDefault();
        const touch = event.touches[0];
        updateAutoScrollFromClientY(touch.clientY);
        const targetElement = document
          .elementFromPoint(touch.clientX, touch.clientY)
          ?.closest(".card-item");
        clearTouchDropTargetClass();
        if (!targetElement || !targetElement.dataset.cardId) {
          touchDropTargetId = null;
          return;
        }
        if (targetElement.dataset.cardId === draggedCardId) {
          touchDropTargetId = null;
          return;
        }
        touchDropTargetId = targetElement.dataset.cardId;
        targetElement.classList.add("drop-target");
      },
      { passive: false }
    );
    el.addEventListener("touchend", async () => {
      el.classList.remove("dragging");
      stopAutoScroll();
      clearTouchDropTargetClass();
      if (draggedCardId && touchDropTargetId && draggedCardId !== touchDropTargetId) {
        suppressNextClick = true;
        const sourceId = draggedCardId;
        const targetId = touchDropTargetId;
        draggedCardId = null;
        touchDropTargetId = null;
        await reorderCards(sourceId, targetId);
        return;
      }
      draggedCardId = null;
      touchDropTargetId = null;
    });
    el.addEventListener("touchcancel", () => {
      el.classList.remove("dragging");
      stopAutoScroll();
      clearTouchDropTargetClass();
      draggedCardId = null;
      touchDropTargetId = null;
    });
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
