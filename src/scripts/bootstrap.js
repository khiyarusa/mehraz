/* ==========================================================================
   MEHRAZ — bootstrap
   Global namespace, primitives and utility layer.
   Classic script only: no modules, no imports, no network.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var M = (window.MEHRAZ = window.MEHRAZ || {});

  M.version = '1.0.0';
  M.schemaVersion = 1;
  M.build = {
    id: 'prompt-01',
    stamp: '2026-11-15',
    channel: 'standalone'
  };
  M.config = {
    storageKey: 'mehraz:state',
    dbName: 'mehraz',
    dbVersion: 1,
    dbStore: 'kv',
    persistDelay: 140,
    toastTTL: 4200
  };

  /* ---- diagnostics ------------------------------------------------------ */
  M.diag = {
    errors: [],
    notes: [],
    bootAt: Date.now(),
    record: function (kind, message, extra) {
      var entry = {
        kind: kind,
        message: String(message || ''),
        extra: extra === undefined ? null : extra,
        at: new Date().toISOString()
      };
      if (kind === 'error') {
        M.diag.errors.push(entry);
        if (window.console && console.error) console.error('[MEHRAZ]', message, extra || '');
      } else {
        M.diag.notes.push(entry);
      }
      return entry;
    }
  };

  window.addEventListener('error', function (ev) {
    M.diag.record('error', ev.message || 'script error', {
      source: ev.filename || null,
      line: ev.lineno || null,
      column: ev.colno || null
    });
  });

  window.addEventListener('unhandledrejection', function (ev) {
    M.diag.record('error', (ev.reason && ev.reason.message) || 'unhandled rejection');
  });

  /* ---- tiny DOM helpers ------------------------------------------------- */
  var util = (M.util = {});

  util.$ = function (sel, root) {
    return (root || document).querySelector(sel);
  };

  util.$$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  util.id = function (el) {
    return typeof el === 'string' ? document.getElementById(el) : el;
  };

  util.on = function (root, type, selector, handler, opts) {
    if (!root) return noop;
    if (typeof selector === 'function') {
      root.addEventListener(type, selector, handler || false);
      return function () {
        root.removeEventListener(type, selector, handler || false);
      };
    }
    function delegate(ev) {
      var target = ev.target;
      var match = target && target.closest ? target.closest(selector) : null;
      if (match && root.contains(match)) handler.call(match, ev, match);
    }
    root.addEventListener(type, delegate, opts || false);
    return function () {
      root.removeEventListener(type, delegate, opts || false);
    };
  };

  util.esc = function (value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  util.clamp = function (n, min, max) {
    n = Number(n);
    if (!isFinite(n)) n = min;
    return Math.min(max, Math.max(min, n));
  };

  util.uid = function (prefix) {
    var rnd = Math.random().toString(36).slice(2, 8);
    return (prefix || 'id') + '_' + Date.now().toString(36) + rnd;
  };

  util.nowISO = function () {
    return new Date().toISOString();
  };

  util.debounce = function (fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var self = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(self, args);
      }, wait);
    };
  };

  util.raf = function (fn) {
    return window.requestAnimationFrame ? window.requestAnimationFrame(fn) : setTimeout(fn, 16);
  };

  util.nextFrame = function (fn) {
    util.raf(function () {
      util.raf(fn);
    });
  };

  util.safeParse = function (text) {
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch (err) {
      return { ok: false, error: err };
    }
  };

  util.clone = function (obj) {
    if (window.structuredClone) {
      try {
        return window.structuredClone(obj);
      } catch (err) {
        /* fall through */
      }
    }
    return JSON.parse(JSON.stringify(obj));
  };

  util.isPlainObject = function (v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  };

  util.isFileProtocol = function () {
    return window.location.protocol === 'file:';
  };

  util.escapePattern = function (str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  /* ---- numeric + date formatting --------------------------------------- */
  var FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  util.toFa = function (value) {
    return String(value).replace(/[0-9]/g, function (d) {
      return FA_DIGITS[Number(d)];
    });
  };

  util.toEn = function (value) {
    return String(value)
      .replace(/[۰-۹]/g, function (d) {
        return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
      })
      .replace(/[٠-٩]/g, function (d) {
        return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d));
      });
  };

  util.fmtInt = function (n) {
    var num = Number(n);
    if (!isFinite(num)) return util.toFa('0');
    var sign = num < 0 ? '−' : '';
    num = Math.abs(num);
    var out = '';
    var str = String(num);
    for (var i = 0; i < str.length; i += 1) {
      var fromEnd = str.length - i;
      out += str.charAt(i);
      if (fromEnd > 1 && (fromEnd - 1) % 3 === 0) out += '٬';
    }
    return util.toFa(sign + out);
  };

  util.fmtPct = function (value) {
    var n = util.clamp(value, 0, 100);
    var rounded = Math.round(n * 10) / 10;
    return util.toFa(rounded % 1 === 0 ? String(rounded) : String(rounded).replace('.', '٫')) + '٪';
  };

  var MONTHS_SHORT = ['فر', 'ار', 'خر', 'تیر', 'مرد', 'شهر', 'مهر', 'آبا', 'آذر', 'دی', 'بهم', 'اسف'];
  util.monthShort = function (m) {
    return MONTHS_SHORT[m - 1] || '';
  };

  util.relTime = function (iso) {
    if (!iso) return '';
    var then = new Date(iso).getTime();
    if (isNaN(then)) return '';
    var diff = Date.now() - then;
    var min = Math.floor(diff / 60000);
    if (min < 1) return 'همین حالا';
    if (min < 60) return util.toFa(min) + ' دقیقه پیش';
    var hours = Math.floor(min / 60);
    if (hours < 24) return util.toFa(hours) + ' ساعت پیش';
    var days = Math.floor(hours / 24);
    if (days === 1) return 'دیروز';
    if (days < 30) return util.toFa(days) + ' روز پیش';
    return M.jalali ? M.jalali.formatISO(then) : '';
  };

  util.todayKey = function () {
    var d = new Date();
    return (
      d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    );
  };

  util.dayKey = function (iso) {
    var d = new Date(iso);
    return (
      d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    );
  };

  util.startOfWeek = function () {
    // Saturday is the first day of the week in the Persian calendar.
    var now = new Date();
    var day = now.getDay(); // 0 = Sunday ... 6 = Saturday
    var back = (day + 1) % 7;
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - back);
    return d;
  };

  /* ---- misc ------------------------------------------------------------- */
  util.prefersReducedMotion = function () {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  util.fileSize = function (bytes) {
    if (bytes < 1024) return util.toFa(bytes) + ' بایت';
    if (bytes < 1024 * 1024) return util.toFa((bytes / 1024).toFixed(1).replace('.', '٫')) + ' کیلوبایت';
    return util.toFa((bytes / 1024 / 1024).toFixed(2).replace('.', '٫')) + ' مگابایت';
  };

  function noop() {}

  /* ---- event bus -------------------------------------------------------- */
  M.bus = (function () {
    var map = {};
    return {
      on: function (name, fn) {
        (map[name] = map[name] || []).push(fn);
        return function () {
          M.bus.off(name, fn);
        };
      },
      off: function (name, fn) {
        map[name] = (map[name] || []).filter(function (f) {
          return f !== fn;
        });
      },
      emit: function (name, payload) {
        (map[name] || []).forEach(function (fn) {
          try {
            fn(payload);
          } catch (err) {
            M.diag.record('error', err && err.message, { scope: 'bus:' + name });
          }
        });
      }
    };
  })();

  /* ---- accessible live region ------------------------------------------ */
  util.announce = function (message) {
    var region = document.getElementById('a11y-live');
    if (!region) return;
    region.textContent = '';
    window.setTimeout(function () {
      region.textContent = message;
    }, 40);
  };

  /* ---- focus trap ------------------------------------------------------- */
  var FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  util.trapFocus = function (container) {
    function onKey(ev) {
      if (ev.key !== 'Tab') return;
      var items = util.$$(FOCUSABLE, container).filter(function (el) {
        return el.offsetParent !== null || el === document.activeElement;
      });
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
    }
    container.addEventListener('keydown', onKey);
    return function () {
      container.removeEventListener('keydown', onKey);
    };
  };

  /* ---- icons ------------------------------------------------------------ */
  var PATHS = {
    home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
    library:
      '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M11 4h4.5A1.5 1.5 0 0 1 17 5.5v13a1.5 1.5 0 0 1-1.5 1.5H11z"/><path d="m19 5 1.6 12.2"/>',
    exam: '<path d="M8 4h8v3H8z"/><path d="M8 5.5H6.5A1.5 1.5 0 0 0 5 7v12a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V7a1.5 1.5 0 0 0-1.5-1.5H16"/><path d="m9 13 2 2 4-4"/>',
    review: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4h-4"/>',
    progress: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 19v-6"/><path d="M13 19V9"/><path d="M18 19v-9"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronStart: '<path d="m9 6 6 6-6 6"/>',
    chevronEnd: '<path d="m15 6-6 6 6 6"/>',
    arrowStart: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
    arrowEnd: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    close: '<path d="m6 6 12 12"/><path d="m18 6-12 12"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    download: '<path d="M12 4v11"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M4.5 20h15"/>',
    upload: '<path d="M12 20V9"/><path d="m7.5 13 4.5-4.5 4.5 4.5"/><path d="M4.5 4h15"/>',
    trash: '<path d="M4.5 7h15"/><path d="M9 7V5h6v2"/><path d="M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    alert: '<path d="M12 4.5 20.5 19h-17z"/><path d="M12 10v4"/><path d="M12 16.8h.01"/>',
    shield: '<path d="M12 3.5 19 6v6c0 4.2-2.9 7.4-7 8.5-4.1-1.1-7-4.3-7-8.5V6z"/><path d="m9 12 2 2 4-4"/>',
    database:
      '<ellipse cx="12" cy="6.5" rx="7.5" ry="3"/><path d="M4.5 6.5v11c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-11"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2"/><path d="M12 19v2"/><path d="M3 12h2"/><path d="M19 12h2"/><path d="m5.6 5.6 1.4 1.4"/><path d="m17 17 1.4 1.4"/><path d="m18.4 5.6-1.4 1.4"/><path d="m7 17-1.4 1.4"/>',
    motion:
      '<path d="M4 12h4l3-6 3 12 3-6h3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    calendar:
      '<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M4 10h16"/><path d="M8.5 3.5v4"/><path d="M15.5 3.5v4"/>',
    book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 16.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
    layers:
      '<path d="m12 4 8 4.5-8 4.5-8-4.5z"/><path d="m4 12.5 8 4.5 8-4.5"/><path d="m4 16.5 8 4.5 8-4.5"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none"/>',
    edit: '<path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5z"/><path d="m13.5 7 3.5 3.5"/>',
    play: '<path d="M8 5.5v13l10-6.5z"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    sparkles:
      '<path d="M12 4v3"/><path d="M12 17v3"/><path d="M4 12h3"/><path d="M17 12h3"/><path d="m7 7 2 2"/><path d="m15 15 2 2"/><path d="m17 7-2 2"/><path d="m9 15-2 2"/>',
    menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>',
    external: '<path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    filter: '<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 6.3"/><path d="M20 5v6h-6"/>',
    flag: '<path d="M6 21V4"/><path d="M6 4h9l-1.5 4L15 12H6"/>',
    connect: '<path d="M9 15l6-6"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="6.5" r="2.5"/>',
    telegram:
      '<path d="M21 4.5 3.4 11.2c-.6.2-.6 1 0 1.2l4.3 1.4 1.6 4.7c.2.5.8.6 1.2.2l2.3-2.2 4 2.8c.5.3 1.2.1 1.3-.5L21 5.4c.1-.6-.5-1.1-1-.9z" fill="currentColor" stroke="none"/><path d="m7.7 13.8 8.9-5.6-6.9 6.6" stroke="#fff" stroke-width="1.1" opacity=".55" fill="none"/>',
    rubika:
      '<path d="M12 3.6c3.2 0 5 1 6.1 2.2 1.2 1.3 1.6 3 1.6 5.2 0 2.5-.8 4.5-2.2 5.9-1.3 1.3-3.2 2-5.5 2-2.4 0-4.3-.7-5.6-2C5.1 15.6 4.3 13.6 4.3 11c0-2.2.5-3.9 1.6-5.2C7 4.6 8.8 3.6 12 3.6z"/><path d="M9 9.2h4.2L9 14.8h6.2"/>',
    home2: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>'
  };

  M.icon = function (name, size, extraClass) {
    var body = PATHS[name];
    if (!body) body = PATHS.info;
    var s = size || 20;
    return (
      '<svg class="ic ' +
      (extraClass || '') +
      '" width="' +
      s +
      '" height="' +
      s +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      body +
      '</svg>'
    );
  };

  M.icons = PATHS;

  M.brandMark = function (size) {
    var s = size || 24;
    return (
      '<svg width="' +
      s +
      '" height="' +
      s +
      '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M3.6 20.4V9.9L12 5.2l8.4 4.7v10.5" fill="none" stroke="rgba(255,255,255,.42)" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M7.7 20.4v-7.2L12 10.7l4.3 2.5v7.2" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/>' +
      '<path d="M12 3.4v3.2" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>' +
      '<rect x="10.5" y="2" width="3" height="1.5" rx=".5" fill="#fff"/>' +
      '</svg>'
    );
  };

  /* ---- brand block ------------------------------------------------------ */
  M.brand = function (opts) {
    opts = opts || {};
    var cls = 'brand' + (opts.onDark ? ' brand--onDark' : '') + (opts.small ? ' brand--sm' : '');
    return (
      '<span class="' +
      cls +
      '">' +
      '<span class="brand__mark">' +
      M.brandMark(opts.small ? 19 : 24) +
      '</span>' +
      '<span class="brand__text"><span class="brand__word">مهراز</span><span class="brand__latin">MEHRAZ</span></span>' +
      '</span>'
    );
  };
})(window, document);
