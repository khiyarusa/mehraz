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
        notes: info.notes.slice()
      };
    },

    label: function (driver) {
      var d = driver || info.driver;
      if (d === 'indexeddb') return 'IndexedDB';
      if (d === 'localstorage') return 'localStorage';
      return 'حافظه موقت';
    },

    get: function () {
      if (info.driver === 'indexeddb' && db) {
        return idbOp('readonly', function (store) {
          return store.get(cfg.storageKey);
        }).catch(function (err) {
          M.diag.record('note', 'read failed: ' + err.message);
          return null;
        });
      }
      if (info.driver === 'localstorage') {
        try {
          var raw = window.localStorage.getItem(cfg.storageKey);
          if (!raw) return Promise.resolve(null);
          var parsed = M.util.safeParse(raw);
          return Promise.resolve(parsed.ok ? parsed.value : null);
        } catch (err) {
          M.diag.record('note', 'localStorage read failed: ' + err.message);
          return Promise.resolve(null);
        }
      }
      return Promise.resolve(mem[cfg.storageKey] || null);
    },

    set: function (value) {
      if (info.driver === 'indexeddb' && db) {
        return idbOp('readwrite', function (store) {
          return store.put(value, cfg.storageKey);
        }).then(function () {
          return true;
        }).catch(function (err) {
          M.diag.record('note', 'write failed: ' + err.message);
          return false;
        });
      }
      if (info.driver === 'localstorage') {
        try {
          window.localStorage.setItem(cfg.storageKey, JSON.stringify(value));
          return Promise.resolve(true);
        } catch (err) {
          info.error = err;
          M.diag.record('note', 'localStorage write failed: ' + err.message);
          return Promise.resolve(false);
        }
      }
      mem[cfg.storageKey] = value;
      return Promise.resolve(false);
    },

    remove: function () {
      if (info.driver === 'indexeddb' && db) {
        return idbOp('readwrite', function (store) {
          return store.delete(cfg.storageKey);
        }).then(function () {
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

    /* Re-runs the probe chain (used by Settings > storage diagnostics). */
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
