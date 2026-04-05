const DB_NAME = "entertainment_tracker_db";
const DB_VERSION = 1;

const DEFAULT_CATEGORIES = ["Movies", "Anime", "Series"];

let dbPromise;

function openDatabase() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("categories")) {
        const categoriesStore = db.createObjectStore("categories", { keyPath: "id", autoIncrement: true });
        categoriesStore.createIndex("name", "name", { unique: true });
      }

      if (!db.objectStoreNames.contains("items")) {
        const itemsStore = db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
        itemsStore.createIndex("categoryId", "categoryId", { unique: false });
        itemsStore.createIndex("status", "status", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function txComplete(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function initDatabase() {
  const db = await openDatabase();
  const categories = await getCategories();

  if (categories.length > 0) {
    return db;
  }

  const tx = db.transaction("categories", "readwrite");
  const store = tx.objectStore("categories");

  DEFAULT_CATEGORIES.forEach((name) => {
    store.add({ name, createdAt: Date.now() });
  });

  await txComplete(tx);
  return db;
}

export async function getCategories() {
  const db = await openDatabase();
  const tx = db.transaction("categories", "readonly");
  const store = tx.objectStore("categories");
  const records = await requestToPromise(store.getAll());
  return records.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addCategory(name) {
  const db = await openDatabase();
  const cleanedName = name.trim();

  if (!cleanedName) {
    throw new Error("Category name is required.");
  }

  const categories = await getCategories();
  const duplicate = categories.some((category) => category.name.toLowerCase() === cleanedName.toLowerCase());

  if (duplicate) {
    throw new Error("That category already exists.");
  }

  const tx = db.transaction("categories", "readwrite");
  const store = tx.objectStore("categories");
  const id = await requestToPromise(store.add({ name: cleanedName, createdAt: Date.now() }));
  await txComplete(tx);

  return { id, name: cleanedName };
}

export async function deleteCategory(categoryId) {
  const db = await openDatabase();
  const tx = db.transaction(["categories", "items"], "readwrite");
  const categoriesStore = tx.objectStore("categories");
  const itemsStore = tx.objectStore("items");
  const itemIndex = itemsStore.index("categoryId");

  const relatedItems = await requestToPromise(itemIndex.getAll(categoryId));

  for (const item of relatedItems) {
    await requestToPromise(itemsStore.delete(item.id));
  }

  await requestToPromise(categoriesStore.delete(categoryId));
  await txComplete(tx);
}

export async function getItemsByCategory(categoryId) {
  const db = await openDatabase();
  const tx = db.transaction("items", "readonly");
  const store = tx.objectStore("items");
  const index = store.index("categoryId");
  const items = await requestToPromise(index.getAll(categoryId));

  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addItem(item) {
  const db = await openDatabase();
  const cleanedTitle = item.title.trim();

  if (!cleanedTitle) {
    throw new Error("Title is required.");
  }

  const payload = {
    categoryId: item.categoryId,
    title: cleanedTitle,
    image: item.image?.trim() || "",
    status: item.status || "to-watch",
    createdAt: Date.now()
  };

  const tx = db.transaction("items", "readwrite");
  const store = tx.objectStore("items");
  const id = await requestToPromise(store.add(payload));
  await txComplete(tx);

  return { ...payload, id };
}

export async function updateItemStatus(itemId, status) {
  const db = await openDatabase();
  const tx = db.transaction("items", "readwrite");
  const store = tx.objectStore("items");
  const item = await requestToPromise(store.get(itemId));

  if (!item) {
    throw new Error("Item not found.");
  }

  item.status = status;
  await requestToPromise(store.put(item));
  await txComplete(tx);
  return item;
}

export async function updateItemDetails(itemId, updates) {
  const db = await openDatabase();
  const tx = db.transaction("items", "readwrite");
  const store = tx.objectStore("items");
  const item = await requestToPromise(store.get(itemId));

  if (!item) {
    throw new Error("Item not found.");
  }

  const nextTitle = (updates.title ?? item.title).trim();
  const nextImage = (updates.image ?? item.image ?? "").trim();

  if (!nextTitle) {
    throw new Error("Title is required.");
  }

  item.title = nextTitle;
  item.image = nextImage;

  await requestToPromise(store.put(item));
  await txComplete(tx);
  return item;
}

export async function deleteItem(itemId) {
  const db = await openDatabase();
  const tx = db.transaction("items", "readwrite");
  const store = tx.objectStore("items");
  await requestToPromise(store.delete(itemId));
  await txComplete(tx);
}
