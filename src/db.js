const DB_NAME = "MimikCardsDB";
const STORE_NAME = "CardStore";

let db;

export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const nextDb = event.target.result;
      if (!nextDb.objectStoreNames.contains(STORE_NAME)) {
        nextDb.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
    request.onerror = (event) => reject(event.target.error);
  });
}

function getStore(mode) {
  const transaction = db.transaction(STORE_NAME, mode);
  return { transaction, store: transaction.objectStore(STORE_NAME) };
}

export function loadCardsFromDB() {
  const { store } = getStore("readonly");
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export function saveCardToDB(card) {
  const { transaction, store } = getStore("readwrite");
  store.put(card);
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event.target.error);
  });
}

export async function saveCardsToDB(cards) {
  for (const card of cards) {
    await saveCardToDB(card);
  }
}

export function deleteCardFromDB(id) {
  const { transaction, store } = getStore("readwrite");
  store.delete(id);
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event.target.error);
  });
}

export function clearDB() {
  const { transaction, store } = getStore("readwrite");
  store.clear();
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event.target.error);
  });
}
