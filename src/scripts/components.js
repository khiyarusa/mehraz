/* ==========================================================================
   MEHRAZ — UI primitives
   Cards, empty states, modals, toasts, charts. Markup is produced as escaped
   strings so that no user-supplied text is ever injected as HTML.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var M = window.MEHRAZ;
  var util = M.util;
  var esc = util.esc;

  var ui = (M.ui = {});
  var overlayEl = null;
  var activeModal = null;
  var lastFocus = null;

  /* ---- text helpers ----------------------------------------------------- */
  ui.initials = function (name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'م';
    if (parts.length === 1) return parts[0].charAt(0);
    return parts[0].charAt(0) + parts[1].charAt(0);
  };

  ui.avatar = function (name, size) {
    var cls = 'avatar' + (size === 'lg' ? ' avatar--lg' : size === 'sm' ? ' avatar--sm' : '');
    return '<span class="' + cls + '" aria-hidden="true">' + esc(ui.initials(name)) + '</span>';
  };

  ui.gradeLabel = function (grade) {
    return M.content.gradeLabel(grade);
  };

  /* ---- structure -------------------------------------------------------- */
  ui.pageHead = function (opts) {
    return (
      '<div class="page-head">' +
      '<div class="page-head__text">' +
      (opts.eyebrow ? '<span class="eyebrow">' + esc(opts.eyebrow) + '</span>' : '') +
      '<h1>' +
      esc(opts.title) +
      '</h1>' +
      (opts.sub ? '<p>' + esc(opts.sub) + '</p>' : '') +
      '</div>' +
      (opts.actions ? '<div class="page-head__actions row row--wrap">' + opts.actions + '</div>' : '') +
      '</div>'
    );
  };

  ui.sectionHead = function (title, link) {
    return (
      '<div class="section__head"><h2 class="section__title">' +
      esc(title) +
      '</h2>' +
      (link
        ? '<a class="section__link" href="' + link.href + '">' + esc(link.label) + M.icon('chevronEnd', 14) + '</a>'
        : '') +
      '</div>'
    );
  };

  var EMPTY_ART = {
    book: 'lesson', library: 'library', exam: 'exam', review: 'review',
    progress: 'progress', search: 'search', sparkles: 'progress', alert: 'search'
  };

  ui.empty = function (opts) {
    var compact = opts.compact ? ' empty--compact' : '';
    var kind = EMPTY_ART[opts.icon] || 'progress';
    return (
      '<div class="empty' +
      compact +
      '">' +
      '<span class="empty__art">' +
      M.art.empty(kind, opts.compact ? 64 : 88) +
      '</span>' +
      '<p class="empty__title">' +
      esc(opts.title) +
      '</p>' +
      (opts.text ? '<p class="empty__text">' + esc(opts.text) + '</p>' : '') +
      (opts.actions ? '<div class="empty__actions">' + opts.actions + '</div>' : '') +
      '</div>'
    );
  };

  ui.banner = function (opts) {
    var kind = opts.type ? ' banner--' + opts.type : '';
    return (
      '<div class="banner' +
      kind +
      '"' +
      (opts.role ? ' role="' + opts.role + '"' : '') +
      '>' +
      '<span class="banner__icon">' +
      M.icon(opts.icon || 'info', 18) +
      '</span>' +
      '<span>' +
      (opts.html || esc(opts.text || '')) +
      '</span>' +
      '</div>'
    );
  };

  ui.settingRow = function (opts) {
    return (
      '<div class="settingrow">' +
      '<div class="settingrow__body">' +
      '<div class="settingrow__title">' +
      esc(opts.title) +
      '</div>' +
      (opts.text ? '<div class="settingrow__text">' + esc(opts.text) + '</div>' : '') +
      '</div>' +
      '<div class="settingrow__action">' +
      (opts.action || '') +
      '</div>' +
      '</div>'
    );
  };

  /* ---- progress --------------------------------------------------------- */
  ui.progress = function (value, opts) {
    opts = opts || {};
    var v = util.clamp(value, 0, 100);
    var cls = 'progress' + (opts.size ? ' progress--' + opts.size : '') + (opts.onDark ? ' progress--onDark' : '');
    var label = opts.label
      ? '<div class="progress__label"><span>' +
        esc(opts.label) +
        '</span><b>' +
        util.fmtPct(v) +
        '</b></div>'
      : '';
    // Decorative bars live inside links/cards that already describe the value,
    // so they must not contribute to the accessible name.
    if (opts.decorative) {
      return (
        label +
        '<div class="' +
        cls +
        '" aria-hidden="true"><div class="progress__bar" data-progress="' +
        v.toFixed(1) +
        '"></div></div>'
      );
    }
    return (
      label +
      '<div class="' +
      cls +
      '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      Math.round(v) +
      '" aria-label="' +
      esc(opts.aria || opts.label || 'پیشرفت') +
      '">' +
      '<div class="progress__bar" data-progress="' +
      v.toFixed(1) +
      '"></div>' +
      '</div>'
    );
  };

  ui.donut = function (value, opts) {
    opts = opts || {};
    return M.art.ring(util.clamp(value, 0, 100), opts);
  };

  ui.ring = function (value, opts) {
    return M.art.ring(util.clamp(value, 0, 100), opts || {});
  };
  ui.weekChart = function (days) {
    var values = days.map(function (d) { return d.count; });
    var total = values.reduce(function (a, b) { return a + b; }, 0);
    var labels = days.map(function (d) { return util.toFa(d.day); });
    return (
      '<figure style="margin:0">' +
      M.art.areaChart(values, { labels: labels, height: 120 }) +
      '<figcaption class="hint" style="margin-top:8px">' +
      (total
        ? 'در این هفته ' + util.toFa(total) + ' رویداد یادگیری ثبت شده است.'
        : 'هنوز فعالیتی برای این هفته ثبت نشده است.') +
      '</figcaption></figure>'
    );
  };

  ui.statBand = function (items) {
    return (
      '<div class="statband">' +
      items.map(function (it) {
        return (
          '<div class="statband__cell">' +
          '<div class="statband__label">' + M.icon(it.icon || 'progress', 14) + '<span>' + esc(it.label) + '</span></div>' +
          '<div class="statband__value">' + (it.raw ? it.value : esc(it.value)) +
          (it.unit ? '<small>' + esc(it.unit) + '</small>' : '') + '</div>' +
          (it.foot ? '<div class="statband__foot">' + esc(it.foot) + '</div>' : '') +
          '</div>'
        );
      }).join('') +
      '</div>'
    );
  };
  ui.stat = function (opts) {
    return (
      '<div class="stat">' +
      '<div class="stat__top">' +
      M.icon(opts.icon || 'progress', 15) +
      '<span>' +
      esc(opts.label) +
      '</span>' +
      '</div>' +
      '<div class="stat__value">' +
      (opts.raw ? opts.value : esc(opts.value)) +
      (opts.unit ? '<span class="unit">' + esc(opts.unit) + '</span>' : '') +
      '</div>' +
      (opts.foot ? '<div class="stat__foot">' + esc(opts.foot) + '</div>' : '') +
      '</div>'
    );
  };

  ui.skeletonBlock = function (lines) {
    var out = '';
    for (var i = 0; i < (lines || 3); i += 1) {
      out +=
        '<div class="skeleton skeleton__line" style="width:' + (90 - i * 12) + '%"></div>';
    }
    return out;
  };

  /* ---- modal ------------------------------------------------------------ */
  ui.closeModal = function () {
    if (!activeModal) return;
    var closing = activeModal;
    activeModal = null;
    closing.overlay.classList.add('is-closing');
    if (closing.disposeTrap) closing.disposeTrap();
    if (closing.escListener) document.removeEventListener('keydown', closing.escListener, true);
    document.body.classList.remove('is-locked');
    var finish = function () {
      if (closing.overlay.parentNode) closing.overlay.parentNode.removeChild(closing.overlay);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      if (closing.resolve) closing.resolve(closing.result);
    };
    if (M.store.prefs().motion === 'reduced' || util.prefersReducedMotion()) {
      finish();
    } else {
      window.setTimeout(finish, 150);
    }
  };

  ui.modal = function (opts) {
    opts = opts || {};
    ui.closeModal();

    lastFocus = document.activeElement;

    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'modal-title');

    var isSheet = !!opts.sheet;
    overlay.innerHTML =
      '<div class="modal' +
      (opts.wide ? ' modal--wide' : '') +
      (isSheet ? ' bottomsheet' : '') +
      '">' +
      '<div class="modal__head">' +
      '<div><div class="modal__title" id="modal-title">' +
      esc(opts.title || '') +
      '</div>' +
      (opts.subtitle ? '<div class="modal__sub">' + esc(opts.subtitle) + '</div>' : '') +
      '</div>' +
      '<button class="iconbtn modal__close" type="button" data-close="1" aria-label="بستن">' +
      M.icon('close', 20) +
      '</button>' +
      '</div>' +
      '<div class="modal__body" data-modal-body>' +
      (opts.body || '') +
      '</div>' +
      (opts.footer ? '<div class="modal__foot">' + opts.footer + '</div>' : '') +
      '</div>';

    document.body.appendChild(overlay);
    document.body.classList.add('is-locked');

    var box = util.$('.modal', overlay);
    var disposeTrap = util.trapFocus(overlay);

    var handle = {
      overlay: overlay,
      box: box,
      disposeTrap: disposeTrap,
      resolve: opts.onResolve || null,
      result: undefined,
      close: function (result) {
        handle.result = result;
        ui.closeModal();
      },
      setBody: function (html) {
        util.$('[data-modal-body]', overlay).innerHTML = html;
      }
    };

    activeModal = handle;

    // Escape is handled at document level so the dialog still closes when
    // focus has moved outside the panel (e.g. after a programmatic focus).
    var escListener = function (ev) {
      if (ev.key !== 'Escape' || opts.dismissible === false) return;
      if (activeModal !== handle) return;
      ev.preventDefault();
      handle.close(undefined);
    };
    handle.escListener = escListener;
    document.addEventListener('keydown', escListener, true);

    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay && opts.dismissible !== false) handle.close(undefined);
      var closer = ev.target.closest ? ev.target.closest('[data-close]') : null;
      if (closer && overlay.contains(closer)) handle.close(undefined);
    });

    if (opts.onMount) opts.onMount(box, handle);

    window.setTimeout(function () {
      var focusTarget =
        util.$('[autofocus]', box) ||
        util.$('.modal__body input, .modal__body select, .modal__body textarea', box) ||
        util.$('.modal__foot .btn--primary', box) ||
        util.$('.modal__close', box);
      if (focusTarget) focusTarget.focus();
    }, 30);

    return handle;
  };

  ui.confirm = function (opts) {
    return new Promise(function (resolve) {
      var settled = false;
      var handle = ui.modal({
        title: opts.title,
        subtitle: opts.subtitle || '',
        body: opts.body || '<p>' + esc(opts.text || '') + '</p>',
        dismissible: true,
        onResolve: function (value) {
          if (settled) return;
          settled = true;
          resolve(value === true);
        },
        footer:
          '<button class="btn btn--ghost" type="button" data-cancel="1">' +
          esc(opts.cancelLabel || 'انصراف') +
          '</button>' +
          '<button class="btn ' +
          (opts.danger ? 'btn--danger' : 'btn--primary') +
          '" type="button" data-confirm="1">' +
          esc(opts.confirmLabel || 'تأیید') +
          '</button>',
        onMount: function (box, modalHandle) {
          util.$('[data-cancel]', box).addEventListener('click', function () {
            modalHandle.close(false);
          });
          util.$('[data-confirm]', box).addEventListener('click', function () {
            modalHandle.close(true);
          });
        }
      });
      handle.overlay.addEventListener('click', function (ev) {
        if (ev.target === handle.overlay && !settled) {
          settled = true;
          resolve(false);
        }
      });
      handle.overlay.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && !settled) {
          settled = true;
          resolve(false);
        }
      });
    });
  };

  /* ---- toast ------------------------------------------------------------ */
  ui.toast = function (message, opts) {
    opts = opts || {};
    var host = document.getElementById('toast-host');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast' + (opts.type ? ' toast--' + opts.type : '');
    el.setAttribute('role', opts.type === 'danger' ? 'alert' : 'status');
    el.innerHTML =
      '<span class="toast__icon">' +
      M.icon(opts.icon || (opts.type === 'danger' ? 'alert' : opts.type === 'warn' ? 'alert' : 'check'), 17) +
      '</span>' +
      '<span class="toast__text">' +
      esc(message) +
      '</span>' +
      (opts.actionLabel
        ? '<button class="toast__action" type="button">' + esc(opts.actionLabel) + '</button>'
        : '');
    host.appendChild(el);

    var ttl = opts.ttl === 0 ? 0 : opts.ttl || M.config.toastTTL;
    var timer = null;

    function dismiss() {
      if (timer) window.clearTimeout(timer);
      el.classList.add('is-leaving');
      window.setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 220);
    }

    if (opts.actionLabel && typeof opts.onAction === 'function') {
      util.$('.toast__action', el).addEventListener('click', function () {
        opts.onAction();
        dismiss();
      });
    }
    if (ttl) timer = window.setTimeout(dismiss, ttl);
    return { close: dismiss, el: el };
  };

  /* ---- transitions ------------------------------------------------------ */
  ui.animateProgress = function (root) {
    var host = root || document;
    var bars = util.$$('[data-progress]', host);
    var rings = util.$$('[data-ring-value]', host);
    var donuts = util.$$('[data-donut-value]', host);
    var orbits = util.$$('[data-orbit-pct]', host);

    util.nextFrame(function () {
      bars.forEach(function (bar) {
        bar.style.width = util.clamp(Number(bar.getAttribute('data-progress')), 0, 100) + '%';
      });
      rings.concat(donuts).forEach(function (ring) {
        var v = ring.getAttribute('data-ring-value') || ring.getAttribute('data-donut-value');
        ring.style.strokeDashoffset = v;
      });
      orbits.forEach(function (arc) {
        var len = Math.round(2 * Math.PI * 86);
        var pct = util.clamp(Number(arc.getAttribute('data-orbit-pct')), 0, 100);
        arc.style.strokeDashoffset = String(len - (pct / 100) * len);
      });
    });
  };

  ui.debounceInput = function (input, handler, wait) {
    var fn = util.debounce(handler, wait || 180);
    input.addEventListener('input', function () {
      fn(input.value);
    });
  };
})(window, document);
