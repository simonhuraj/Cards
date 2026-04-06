const state = {
  cards: [],
  currentScan: null,
  currentPhotoBase64: null,
  scanner: null,
  cameraStream: null,
  cropper: null,
  activeCardId: null,
};

export function getState() {
  return state;
}
