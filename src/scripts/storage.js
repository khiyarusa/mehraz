/* ==========================================================================
   MEHRAZ — storage adapter
   Capability-detected persistence: IndexedDB -> localStorage -> memory.
   A driver is only trusted after a real write / read-back probe.
   Nothing here ever touches the network.
   ========================================================================== */
(function (window) {
  'use strict';

  var M = window.MEHRAZ;
  var cfg = M.config;

  var mem = Object.create(null);
  var db = null;
  var info = {
    driver: 'memory',
    ok: false,
    probed: false,
    testedAt: null,
    error: null,
    notes: []
  };

  function note(text) {
    info.notes.push(text);
  }

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is not exposed by this browser context'));
        return;
      }
      var req;
      try {
        req = window.indexedDB.open(cfg.dbName, cfg.dbVersion);
      } catch (err) {
        reject(err);
        return;
      }
      var settled = false;
      var timer = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error('IndexedDB open timed out'));
      }, 3000);

      req.onupgradeneeded = function () {
        try {
          var d = req.result;
          if (!d.objectStoreNames.contains(cfg.dbStore)) d.createObjectStore(cfg.dbStore);
        } catch (err) {
          note('upgrade failed: ' + err.message);
        }
      };
      req.onsuccess = function () {
        window.clearTimeout(timer);
        if (settled) return;
        settled = true;
        resolve(req.result);
      };
      req.onerror = function () {
        window.clearTimeout(timer);
        if (settled) return;
        settled = true;
        reject(req.error || new Error('IndexedDB open failed'));
      };
      req.onblocked = function () {
        note('IndexedDB blocked by another tab of this app');
      };
    });
  }

  function idbOp(mode, fn) {
    return new Promise(function (resolve, reject) {
      var tx;
      try {
        tx = db.transaction(cfg.dbStore, mode);
      } catch (err) {
        reject(err);
        return;
      }
      var store;
      var request;
      try {
        store = tx.objectStore(cfg.dbStore);
        request = fn(store);
      } catch (err) {
        reject(err);
        return;
      }
      tx.oncomplete = function () {
        resolve(request ? request.result : undefined);
      };
      tx.onerror = function () {
        reject(tx.error || new Error('IndexedDB transaction failed'));
      };
      tx.onabort = function () {
        reject(tx.error || new Error('IndexedDB transaction aborted'));
      };
    });
  }

  function lsAvailable() {
    try {
      var k = '__mehraz_ls_probe__';
      window.localStorage.setItem(k, '1');
      var v = window.localStorage.getItem(k);
      window.localStorage.removeItem(k);
      return v === '1';
    } catch (err) {
      info.error = err;
      return false;
    }
  }

  function readLocal() {
    try {
      var raw = window.localStorage.getItem(cfg.storageKey);
      if (!raw) return null;
      var parsed = M.util.safeParse(raw);
      return parsed.ok ? parsed.value : null;
    } catch (err) {
      M.diag.record('note', 'localStorage read failed: ' + err.message);
      return null;
    }
  }

  function stampOf(value) {
    var t = value && value.meta && value.meta.updatedAt ? Date.parse(value.meta.updatedAt) : 0;
    return isNaN(t) ? 0 : t;
  }

  /* Both stores can hold a copy (IndexedDB normally, localStorage after a
     fallback). The newer stamp wins, so a session that had to fall back is
     never overwritten by the older IndexedDB record. */
  function newest(a, b) {
    if (!a) return b;
    if (!b) return a;
    return stampOf(b) > stampOf(a) ? b : a;
  }

  function mirror(value) {
    try {
      window.localStorage.setItem(cfg.storageKey, JSON.stringify(value));
    } catch (err) {
      /* the mirror is best effort; IndexedDB remains the source of truth */
    }
  }

  /* A failed IndexedDB write is repaired on the spot: the same payload is
     written to localStorage and the adapter switches over for the rest of the
     session. Returning false here would tell the student their work was lost
     while a perfectly good store was available. */
  function writeLocal(value) {
    try {
      window.localStorage.setItem(cfg.storageKey, JSON.stringify(value));
      if (info.driver !== 'localstorage') {
        note('switched to localStorage after a failed IndexedDB write');
        info.driver = 'localstorage';
        info.fallbackFrom = 'indexeddb';
      }
      info.ok = true;
      return true;
    } catch (err) {
      info.error = err;
      M.diag.record('note', 'localStorage write failed: ' + err.message);
      return false;
    }
  }

  var api = {
    init: function () {
      info.testedAt = M.util.nowISO();
      return openDB()
        .then(function (handle) {
          db = handle;
          return idbOp('readwrite', function (store) {
            return store.put({ probe: 'idx', at: Date.now() }, '__probe__');
          }).then(function () {
            return idbOp('readonly', function (store) {
              return store.get('__probe__');
            });
          });
        })
        .then(function (value) {
          if (!value || value.probe !== 'idx') throw new Error('IndexedDB read-back mismatch');
          return idbOp('readwrite', function (store) {
            return store.delete('__probe__');
          }).then(function () {
            info.driver = 'indexeddb';
            info.ok = true;
            note('IndexedDB write / read-back probe passed');
          });
        })
        .catch(function (err) {
          info.error = err;
          note('IndexedDB unavailable: ' + (err && err.message));
          if (lsAvailable()) {
            info.driver = 'localstorage';
            info.ok = true;
            note('localStorage write / read probe passed');
          } else {
            info.driver = 'memory';
            info.ok = false;
            note('No persistent storage available; running in memory only');
          }
        })
        .then(function () {
          info.probed = true;
          M.diag.record('note', 'storage driver: ' + info.driver, info.notes.slice());
          return api.status();
        });
    },

    status: function () {
      return {
        driver: info.driver,
        ok: info.driver !== 'memory',
        probed: info.probed,
        testedAt: info.testedAt,
        error: info.error ? String(info.error.message || info.error) : null,
        notes: info.notes.slice(),
        fallbackFrom: info.fallbackFrom || null
      };
    },

    get: function () {
      if (info.driver === 'indexeddb' && db) {
        return idbOp('readonly', function (store) {
          return store.get(cfg.storageKey);
        }).then(function (value) {
          return newest(value, readLocal());
        }).catch(function (err) {
          M.diag.record('note', 'read failed: ' + err.message);
          return readLocal();
        });
      }
      if (info.driver === 'localstorage') {
        return Promise.resolve(readLocal());
      }
      return Promise.resolve(mem[cfg.storageKey] || null);
    },

    set: function (value) {
      if (info.driver === 'indexeddb' && db) {
        return idbOp('readwrite', function (store) {
          return store.put(value, cfg.storageKey);
        }).then(function () {
          mirror(value);
          return true;
        }).catch(function (err) {
          M.diag.record('note', 'write failed: ' + err.message);
          return writeLocal(value);
        });
      }
      if (info.driver === 'localstorage') {
        return Promise.resolve(writeLocal(value));
      }
      mem[cfg.storageKey] = value;
      return Promise.resolve(false);
    },

    remove: function () {
      if (info.driver === 'indexeddb' && db) {
        return idbOp('readwrite', function (store) {
          return store.delete(cfg.storageKey);
        }).then(function () {
          try { window.localStorage.removeItem(cfg.storageKey); } catch (err) { /* ignore */ }
          return true;
        }).catch(function () {
          return false;
        });
      }
      if (info.driver === 'localstorage') {
        try {
          window.localStorage.removeItem(cfg.storageKey);
          return Promise.resolve(true);
        } catch (err) {
          return Promise.resolve(false);
        }
      }
      delete mem[cfg.storageKey];
      return Promise.resolve(true);
    },

    /* Re-runs the probe chain. Developer console only; there is no UI entry. */
    recheck: function () {
      db = null;
      info.driver = 'memory';
      info.ok = false;
      info.notes = [];
      return api.init();
    }
  };

  M.storage = api;
})(window);
