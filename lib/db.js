// lib/db.js
import { openDB } from 'idb';

export async function initDB() {
  return openDB('pos-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('salesQueue')) {
        db.createObjectStore('salesQueue', { keyPath: 'id', autoIncrement: true });
      }
    }
  });
}

export async function addSaleOffline(sale) {
  const db = await initDB();
  await db.add('salesQueue', { ...sale, createdAt: Date.now() });
}

export async function getAllOfflineSales() {
  const db = await initDB();
  return db.getAll('salesQueue');
}

export async function removeOfflineSale(id) {
  const db = await initDB();
  await db.delete('salesQueue', id);
}
