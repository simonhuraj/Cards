import { saveCardToDB } from "../db.js";
import { goToView } from "../router.js";
import { getState } from "../state.js";

const cropOverlayEl = document.getElementById("crop-overlay");
const cropImageEl = document.getElementById("crop-image");
const videoEl = document.getElementById("camera-stream");
const canvasEl = document.getElementById("photo-canvas");
const overlayEl = document.getElementById("photo-preview-overlay");
const previewImageEl = document.getElementById("photo-preview-image");
const nameInput = document.getElementById("card-name-input");

export function startCamera() {
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" } })
    .then((stream) => {
      const state = getState();
      state.cameraStream = stream;
      videoEl.srcObject = stream;
    })
    .catch((error) => {
      console.error(error);
      alert("Failed to start camera for photo");
    });
}

export function stopCamera() {
  const state = getState();
  if (!state.cameraStream) return;
  state.cameraStream.getTracks().forEach((track) => track.stop());
  state.cameraStream = null;
}

function resetPhotoState() {
  const state = getState();
  overlayEl.classList.add("hidden");
  cropOverlayEl.classList.add("hidden");
  if (state.cropper) {
    state.cropper.destroy();
    state.cropper = null;
  }
  state.currentScan = null;
  state.currentPhotoBase64 = null;
}

export function bindPhotoEvents(renderDashboard) {
  document.getElementById("btn-cancel-photo").addEventListener("click", () => {
    stopCamera();
    resetPhotoState();
    goToView("view-dashboard");
  });

  document.getElementById("btn-capture-photo").addEventListener("click", () => {
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
    const ctx = canvasEl.getContext("2d");
    ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);

    cropImageEl.src = canvasEl.toDataURL("image/jpeg", 1.0);
    cropOverlayEl.classList.remove("hidden");

    const state = getState();
    if (state.cropper) {
      state.cropper.destroy();
      state.cropper = null;
    }
    // Cropper is loaded from CDN in index.html
    state.cropper = new Cropper(cropImageEl, {
      viewMode: 1,
      initialAspectRatio: 1,
      aspectRatio: NaN,
    });
  });

  document.getElementById("btn-cancel-crop").addEventListener("click", () => {
    const state = getState();
    if (state.cropper) {
      state.cropper.destroy();
      state.cropper = null;
    }
    cropOverlayEl.classList.add("hidden");
  });

  document.getElementById("btn-confirm-crop").addEventListener("click", () => {
    const state = getState();
    if (!state.cropper) return;

    state.currentPhotoBase64 = state.cropper
      .getCroppedCanvas({
        maxWidth: 1024,
        maxHeight: 1024,
      })
      .toDataURL("image/jpeg", 0.8);

    state.cropper.destroy();
    state.cropper = null;
    cropOverlayEl.classList.add("hidden");

    previewImageEl.src = state.currentPhotoBase64;
    overlayEl.classList.remove("hidden");
    nameInput.value = "";
    nameInput.focus();
  });

  document.getElementById("btn-retake").addEventListener("click", () => {
    const state = getState();
    state.currentPhotoBase64 = null;
    overlayEl.classList.add("hidden");
  });

  document.getElementById("btn-save-card").addEventListener("click", async () => {
    const state = getState();
    const name = nameInput.value.trim();
    if (!name) {
      alert("Please enter a card name.");
      return;
    }

    const nextSortOrder =
      state.cards.length === 0 ? 0 : Math.max(...state.cards.map((card) => card.sortOrder)) + 1;

    const newCard = {
      id: Date.now().toString(),
      name,
      codeString: state.currentScan.text,
      format: state.currentScan.format,
      photoBlob: state.currentPhotoBase64,
      sortOrder: nextSortOrder,
    };

    await saveCardToDB(newCard);
    state.cards.push(newCard);

    stopCamera();
    resetPhotoState();
    renderDashboard();
    goToView("view-dashboard");
  });
}
