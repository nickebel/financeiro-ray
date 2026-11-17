/* Ray · armazenamento local · IndexedDB · sem conta ou servidor remoto */
(() => {
  "use strict";

  const DB_NAME = "ray-personal-finance-v1";
  const DB_VERSION = 1;
  const STORE_NAME = "profiles";
  const APP_ID = "ray-personal-finance";
  const TABLES = ["transactions", "cards", "installments", "bills", "goals"];
  const locks = new Map();
  let dbPromise;

  const emptyRows = () => ({
    transactions: [],
    cards: [],
    installments: [],
    bills: [],
    goals: []
  });

  const now = () => new Date().toISOString();
  const makeId = () => globalThis.crypto?.randomUUID?.()
    || "local-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("Este navegador não oferece armazenamento local. Abra no Chrome, Edge ou Safari atualizado."));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "userId" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Não foi possível abrir o armazenamento deste aparelho."));
      request.onblocked = () => reject(new Error("Feche outras abas do Ray e tente novamente."));
    });
    return dbPromise;
  }

  async function readState(profileId) {
    if (!profileId) throw new Error("Não foi possível identificar o perfil local.");
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(profileId);
      request.onsuccess = () => {
        const value = request.result || null;
        const state = value || {
          userId: profileId,
          rows: emptyRows(),
          updatedAt: now()
        };
        state.rows = state.rows || emptyRows();
        for (const table of TABLES) {
          if (!Array.isArray(state.rows[table])) state.rows[table] = [];
        }
        resolve(state);
      };
      request.onerror = () => reject(request.error || new Error("Não foi possível ler os dados salvos."));
    });
  }

  async function writeState(state) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(state);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Não foi possível salvar neste aparelho."));
      tx.onabort = () => reject(tx.error || new Error("O salvamento local foi interrompido."));
    });
  }

  function serialize(profileId, task) {
    const previous = locks.get(profileId) || Promise.resolve();
    const next = previous.catch(() => {}).then(task);
    const tracked = next.finally(() => {
      if (locks.get(profileId) === tracked) locks.delete(profileId);
    });
    locks.set(profileId, tracked);
    return tracked;
  }

  async function getRows(profileId) {
    const state = await readState(profileId);
    return clone(state.rows);
  }

  async function getStatus() {
    return {
      online: navigator.onLine,
      pendingCount: 0,
      lastError: null,
      localOnly: true
    };
  }

  async function load(profileId) {
    const rows = await getRows(profileId);
    return { rows, pendingCount: 0, synced: 0, localOnly: true, error: null };
  }

  async function save(profileId, _client, table, row) {
    if (!TABLES.includes(table)) throw new Error("Tipo de registro não suportado.");
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("Confira os dados e tente salvar novamente.");
    }

    return serialize(profileId, async () => {
      const state = await readState(profileId);
      const index = state.rows[table].findIndex(item => item.id === row.id);
      const previous = index >= 0 ? state.rows[table][index] : null;

      if (table === "installments" && !state.rows.cards.some(card => card.id === row.card_id)) {
        throw new Error("Cadastre o cartão antes de adicionar uma compra parcelada.");
      }

      const stored = {
        ...(previous || {}),
        ...clone(row),
        id: row.id || makeId(),
        user_id: profileId,
        created_at: row.created_at || previous?.created_at || now(),
        updated_at: now()
      };

      if (index >= 0) state.rows[table][index] = stored;
      else state.rows[table].push(stored);

      state.updatedAt = now();
      await writeState(state);
      return { row: clone(stored), savedLocally: true };
    });
  }

  async function remove(profileId, _client, table, rowId) {
    if (!TABLES.includes(table)) throw new Error("Tipo de registro não suportado.");
    return serialize(profileId, async () => {
      const state = await readState(profileId);
      state.rows[table] = state.rows[table].filter(row => row.id !== rowId);

      if (table === "cards") {
        state.rows.installments = state.rows.installments.filter(row => row.card_id !== rowId);
      }

      state.updatedAt = now();
      await writeState(state);
      return { removed: true, savedLocally: true };
    });
  }

  async function update(profileId, client, table, rowId, patch) {
    const state = await readState(profileId);
    const current = (state.rows[table] || []).find(row => row.id === rowId);
    if (!current) throw new Error("Não encontrei esse registro salvo neste aparelho.");
    return save(profileId, client, table, { ...current, ...patch, id: rowId }, false);
  }

  function validateBackupRows(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("O arquivo não contém uma estrutura de backup válida.");
    }

    const result = emptyRows();
    for (const table of TABLES) {
      const source = value[table];
      if (!Array.isArray(source)) throw new Error("O backup está incompleto: falta a lista de " + table + ".");
      if (source.length > 10000) throw new Error("O backup contém registros demais para ser restaurado.");
      const ids = new Set();

      result[table] = source.map((row, index) => {
        if (!row || typeof row !== "object" || Array.isArray(row) || typeof row.id !== "string" || !row.id.trim()) {
          throw new Error("Há um registro inválido em " + table + " (item " + (index + 1) + ").");
        }
        if (ids.has(row.id)) throw new Error("Há identificadores repetidos em " + table + ".");
        ids.add(row.id);
        return { ...clone(row), user_id: "ray-personal-profile" };
      });
    }

    const cardIds = new Set(result.cards.map(card => card.id));
    if (result.installments.some(item => !cardIds.has(item.card_id))) {
      throw new Error("O backup contém uma compra parcelada sem o cartão correspondente.");
    }

    return result;
  }

  async function exportBackup(profileId) {
    const rows = await getRows(profileId);
    return JSON.stringify({
      app: APP_ID,
      version: 1,
      exportedAt: now(),
      rows
    }, null, 2);
  }

  async function restoreBackup(profileId, rawText) {
    if (typeof rawText !== "string" || rawText.length > 5 * 1024 * 1024) {
      throw new Error("O arquivo é maior que o limite de 5 MB.");
    }

    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch (_) {
      throw new Error("Este arquivo não é um JSON válido.");
    }

    if (payload?.app !== APP_ID || payload?.version !== 1) {
      throw new Error("Este backup não pertence a uma versão compatível do Ray.");
    }

    const rows = validateBackupRows(payload.rows);
    return serialize(profileId, async () => {
      const state = { userId: profileId, rows, updatedAt: now() };
      await writeState(state);
      return {
        restored: true,
        counts: Object.fromEntries(TABLES.map(table => [table, rows[table].length]))
      };
    });
  }

  window.FinanceOffline = Object.freeze({
    tables: TABLES,
    getRows,
    getStatus,
    load,
    save,
    remove,
    update,
    exportBackup,
    restoreBackup,
    online: () => navigator.onLine
  });
})();
