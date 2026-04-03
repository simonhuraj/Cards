// MimikCards App Logic
const DB_NAME = 'MimikCardsDB';
const STORE_NAME = 'CardStore';
let db;

// State
let cards = [];
let currentScan = null;
let currentPhotoBase64 = null;
let scanner = null;
let cameraStream = null;
let cropper = null;

const cropOverlayEl = document.getElementById('crop-overlay');
const cropImageEl = document.getElementById('crop-image');


// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW Registered', reg))
      .catch(err => console.error('SW failed', err));
  });
}

// ----------------- DB Logic -----------------
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    request.onerror = (e) => reject(e.target.error);
  });
}

function loadCards() {
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();
  request.onsuccess = () => {
    cards = request.result;
    renderDashboard();
  };
}

function saveCardToDB(card) {
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.put(card);
  return new Promise(resolve => transaction.oncomplete = resolve);
}

function deleteCardFromDB(id) {
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.delete(id);
  return new Promise(resolve => transaction.oncomplete = resolve);
}

function clearDB() {
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.clear();
  return new Promise(resolve => transaction.oncomplete = resolve);
}

// ----------------- UI Routing -----------------
const views = document.querySelectorAll('.view');
function goToView(viewId) {
  views.forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
}

// ----------------- Dashboard -----------------
const cardList = document.getElementById('card-list');
const emptyState = document.getElementById('empty-state');

function renderDashboard() {
  // clear nodes
  cardList.innerHTML = '';
  if (cards.length === 0) {
    cardList.appendChild(emptyState);
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = 'card-item';
      el.innerHTML = `
        <img src="${card.photoBlob}" alt="${card.name}">
        <div class="card-item-overlay">
          <h3>${card.name}</h3>
        </div>
      `;
      el.addEventListener('click', () => showCardDetails(card));
      cardList.appendChild(el);
    });
    // Add empty element for padding
    cardList.appendChild(emptyState);
  }
}

document.getElementById('btn-add-card').addEventListener('click', () => {
  goToView('view-scanner');
  startScanner();
});

document.getElementById('btn-open-settings').addEventListener('click', () => {
  goToView('view-settings');
});

// ----------------- Scanner -----------------
document.getElementById('btn-cancel-scan').addEventListener('click', () => {
  stopScanner();
  goToView('view-dashboard');
});

function startScanner() {
  if (scanner) return;
  scanner = new Html5Qrcode("reader");
  const config = { fps: 10, qrbox: { width: 250, height: 100 } };
  
  // Need to delay starting for UI render
  setTimeout(() => {
    scanner.start(
      { facingMode: "environment" },
      config,
      (decodedText, decodedResult) => {
        // Success
        console.log("Scanned:", decodedText, decodedResult);
        let formatStr = "CODE128"; // default fallback
        if (decodedResult.result && decodedResult.result.format) {
            // Mapping Html5Qrcode formats to JsBarcode formats or QR
            const fName = decodedResult.result.format.formatName;
            if (fName && fName.includes('QR')) formatStr = 'QR_CODE';
            else if (fName && fName.includes('EAN_13')) formatStr = 'EAN13';
            else if (fName && fName.includes('EAN_8')) formatStr = 'EAN8';
            else if (fName && fName.includes('UPC_A')) formatStr = 'UPC';
        }
        currentScan = { text: decodedText, format: formatStr };
        stopScanner();
        goToView('view-photo');
        startCamera();
      },
      (error) => { /* ignore frame errors */ }
    ).catch(err => {
      console.error(err);
      alert("Camera access denied or unavailabe.");
    });
  }, 300);
}

function stopScanner() {
  if (scanner) {
    scanner.stop().then(() => { scanner.clear(); scanner = null; }).catch(()=>{});
  }
}

// ----------------- Photo Capture -----------------
const videoEl = document.getElementById('camera-stream');
const canvasEl = document.getElementById('photo-canvas');
const overlayEl = document.getElementById('photo-preview-overlay');
const previewImageEl = document.getElementById('photo-preview-image');
const nameInput = document.getElementById('card-name-input');

document.getElementById('btn-cancel-photo').addEventListener('click', () => {
  stopCamera();
  resetPhotoState();
  goToView('view-dashboard');
});

function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      cameraStream = stream;
      videoEl.srcObject = stream;
    })
    .catch(err => {
      console.error(err);
      alert("Failed to start camera for photo");
    });
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
}

document.getElementById('btn-capture-photo').addEventListener('click', () => {
  canvasEl.width = videoEl.videoWidth;
  canvasEl.height = videoEl.videoHeight;
  const ctx = canvasEl.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
  
  // Show crop overlay
  cropImageEl.src = canvasEl.toDataURL('image/jpeg', 1.0);
  cropOverlayEl.classList.remove('hidden');
  
  if (cropper) { cropper.destroy(); cropper = null; }
  cropper = new Cropper(cropImageEl, {
    viewMode: 1,
    initialAspectRatio: 1,
    aspectRatio: NaN,
  });
});

document.getElementById('btn-cancel-crop').addEventListener('click', () => {
  if (cropper) { cropper.destroy(); cropper = null; }
  cropOverlayEl.classList.add('hidden');
});

document.getElementById('btn-confirm-crop').addEventListener('click', () => {
  if (!cropper) return;
  
  currentPhotoBase64 = cropper.getCroppedCanvas({
    maxWidth: 1024,
    maxHeight: 1024
  }).toDataURL('image/jpeg', 0.8);
  
  cropper.destroy(); cropper = null;
  cropOverlayEl.classList.add('hidden');
  
  // Show form
  previewImageEl.src = currentPhotoBase64;
  overlayEl.classList.remove('hidden');
  nameInput.value = '';
  nameInput.focus();
});

document.getElementById('btn-retake').addEventListener('click', () => {
  currentPhotoBase64 = null;
  overlayEl.classList.add('hidden');
});

document.getElementById('btn-save-card').addEventListener('click', async () => {
  const name = nameInput.value.trim();
  if (!name) return alert("Please enter a card name.");
  
  const newCard = {
    id: Date.now().toString(),
    name: name,
    codeString: currentScan.text,
    format: currentScan.format,
    photoBlob: currentPhotoBase64
  };
  
  await saveCardToDB(newCard);
  cards.push(newCard);
  
  stopCamera();
  resetPhotoState();
  renderDashboard();
  goToView('view-dashboard');
});

function resetPhotoState() {
  overlayEl.classList.add('hidden');
  cropOverlayEl.classList.add('hidden');
  if (cropper) { cropper.destroy(); cropper = null; }
  currentScan = null;
  currentPhotoBase64 = null;
}

// ----------------- Detail View -----------------
let activeCardId = null;

document.getElementById('btn-back-details').addEventListener('click', () => {

  goToView('view-dashboard');
});

document.getElementById('btn-delete-card').addEventListener('click', async () => {
  if (confirm("Delete this card?")) {
    await deleteCardFromDB(activeCardId);
    cards = cards.filter(c => c.id !== activeCardId);

    renderDashboard();
    goToView('view-dashboard');
  }
});

function showCardDetails(card) {
  activeCardId = card.id;
  document.getElementById('detail-card-image').src = card.photoBlob;
  document.getElementById('detail-card-name').textContent = card.name;
  document.getElementById('detail-code-string').textContent = card.codeString;
  
  const barcodeSvg = document.getElementById('detail-barcode');
  const qrcodeDiv = document.getElementById('detail-qrcode');
  
  barcodeSvg.style.display = 'none';
  qrcodeDiv.style.display = 'none';
  qrcodeDiv.innerHTML = '';
  
  if (card.format === 'QR_CODE') {
    qrcodeDiv.style.display = 'block';
    new QRCode(qrcodeDiv, {
      text: card.codeString,
      width: 200,
      height: 200,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    });
  } else {
    barcodeSvg.style.display = 'block';
    try {
      JsBarcode("#detail-barcode", card.codeString, {
        format: card.format === 'EAN13' || card.format === 'UPC' || card.format === 'EAN8' ? card.format : "CODE128",
        width: 2,
        height: 100,
        displayValue: false
      });
    } catch(e) {
      // Fallback
      JsBarcode("#detail-barcode", card.codeString, { format: "CODE128", displayValue: false });
    }
  }
  
  goToView('view-details');
}


// ----------------- Settings (Export/Import) -----------------
document.getElementById('btn-back-settings').addEventListener('click', () => {
  goToView('view-dashboard');
});

document.getElementById('btn-export').addEventListener('click', () => {
  const dataStr = JSON.stringify(cards, null, 2);
  const blob = new Blob([dataStr], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MimikCards_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

document.getElementById('btn-import-trigger').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const importedCards = JSON.parse(event.target.result);
      if (!Array.isArray(importedCards)) throw new Error("Invalid format");
      
      await clearDB();
      for(const c of importedCards) {
        await saveCardToDB(c);
      }
      
      cards = importedCards;
      renderDashboard();
      alert("Cards imported successfully!");
      goToView('view-dashboard');
    } catch (err) {
      alert("Failed to parse backup file.");
      console.error(err);
    }
    document.getElementById('import-file').value = '';
  };
  reader.readAsText(file);
});

// Boot
initDB().then(() => {
  loadCards();
}).catch(e => console.error("DB init failed", e));
