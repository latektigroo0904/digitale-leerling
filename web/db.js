(() => {
  const DB_NAME = "digitale-leerling";
  const DB_VERSION = 1;
  const WORDS = "words";
  const META = "meta";

  let dbPromise;

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function transactionDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("IndexedDB-transactie afgebroken"));
    });
  }

  function openDb() {
    if (!("indexedDB" in window)) {
      return Promise.reject(new Error("IndexedDB wordt niet ondersteund"));
    }

    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;

          if (!db.objectStoreNames.contains(WORDS)) {
            const words = db.createObjectStore(WORDS, { keyPath: "word" });
            words.createIndex("updatedAt", "updatedAt");
          }

          if (!db.objectStoreNames.contains(META)) {
            db.createObjectStore(META, { keyPath: "key" });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("IndexedDB-upgrade is geblokkeerd"));
      });
    }

    return dbPromise;
  }

  async function getMeta(key) {
    const db = await openDb();
    const tx = db.transaction(META, "readonly");
    const row = await requestToPromise(tx.objectStore(META).get(key));
    await transactionDone(tx);
    return row ? row.value : undefined;
  }

  async function setMeta(key, value) {
    const db = await openDb();
    const tx = db.transaction(META, "readwrite");
    tx.objectStore(META).put({ key, value });
    await transactionDone(tx);
  }

  async function getWord(word) {
    const db = await openDb();
    const tx = db.transaction(WORDS, "readonly");
    const row = await requestToPromise(tx.objectStore(WORDS).get(word));
    await transactionDone(tx);
    return row || null;
  }

  async function putWord(word, definition, source = "user") {
    const normalizedWord = String(word).trim().toLowerCase();
    const cleanDefinition = String(definition).trim();
    if (!normalizedWord || !cleanDefinition) throw new Error("Woord en betekenis zijn verplicht");

    const db = await openDb();
    const tx = db.transaction(WORDS, "readwrite");
    const store = tx.objectStore(WORDS);
    const existing = await requestToPromise(store.get(normalizedWord));
    const now = new Date().toISOString();

    store.put({
      word: normalizedWord,
      definition: cleanDefinition,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      source: existing?.source || source
    });

    await transactionDone(tx);
  }

  async function getAllWords() {
    const db = await openDb();
    const tx = db.transaction(WORDS, "readonly");
    const rows = await requestToPromise(tx.objectStore(WORDS).getAll());
    await transactionDone(tx);
    return rows || [];
  }

  async function getWordsMap() {
    const rows = await getAllWords();
    return Object.fromEntries(rows.map(row => [row.word, row.definition]));
  }

  async function getConversationState() {
    return {
      pendingWord: (await getMeta("pendingWord")) || null,
      awaitingDefinition: (await getMeta("awaitingDefinition")) === true
    };
  }

  async function setConversationState({ pendingWord = null, awaitingDefinition = false }) {
    const db = await openDb();
    const tx = db.transaction(META, "readwrite");
    const store = tx.objectStore(META);
    store.put({ key: "pendingWord", value: pendingWord });
    store.put({ key: "awaitingDefinition", value: Boolean(awaitingDefinition) });
    await transactionDone(tx);
  }

  async function clearLearnedMemory() {
    const db = await openDb();
    const tx = db.transaction([WORDS, META], "readwrite");
    tx.objectStore(WORDS).clear();
    const meta = tx.objectStore(META);
    meta.put({ key: "pendingWord", value: null });
    meta.put({ key: "awaitingDefinition", value: false });
    meta.put({ key: "localStorageMigrated", value: true });
    await transactionDone(tx);
  }

  async function migrateLocalStorage() {
    if (await getMeta("localStorageMigrated")) return;

    let oldMemory = {};
    try {
      oldMemory = JSON.parse(localStorage.getItem("dl.memory") || "{}") || {};
    } catch {
      oldMemory = {};
    }

    for (const [word, definition] of Object.entries(oldMemory)) {
      if (typeof definition === "string" && definition.trim()) {
        await putWord(word, definition, "localStorage-migration");
      }
    }

    const pendingWord = localStorage.getItem("dl.pendingWord") || null;
    const awaitingDefinition = localStorage.getItem("dl.awaitingDefinition") === "1";
    await setConversationState({ pendingWord, awaitingDefinition });
    await setMeta("localStorageMigrated", true);

    localStorage.removeItem("dl.memory");
    localStorage.removeItem("dl.pendingWord");
    localStorage.removeItem("dl.awaitingDefinition");
  }

  async function init() {
    await openDb();
    await migrateLocalStorage();
    return true;
  }

  window.DLDB = {
    init,
    getWord,
    putWord,
    getAllWords,
    getWordsMap,
    getConversationState,
    setConversationState,
    clearLearnedMemory
  };
})();
