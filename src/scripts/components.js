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

  ui.empty = function (opts) {
    var compact = opts.compact ? ' empty--compact' : '';
    return (
      '<div class="empty' +
      compact +
      '">' +
      '<span class="empty__art">' +
      M.icon(opts.icon || 'sparkles', opts.compact ? 22 : 26) +
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
    var size = opts.size || 92;
    var stroke = opts.stroke || 9;
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var v = util.clamp(value, 0, 100);
    var offset = c - (v / 100) * c;
    return (
      '<div class="donut" style="width:' +
      size +
      'px;height:' +
      size +
      'px" role="img" aria-label="' +
      esc(opts.aria || 'پیشرفت ' + util.fmtPct(v)) +
      '">' +
      '<svg width="' +
      size +
      '" height="' +
      size +
      '" viewBox="0 0 ' +
      size +
      ' ' +
      size +
      '">' +
      '<circle class="donut__track" cx="' +
      size / 2 +
      '" cy="' +
      size / 2 +
      '" r="' +
      r +
      '" fill="none" stroke-width="' +
      stroke +
      '"/>' +
      '<circle class="donut__value" cx="' +
      size / 2 +
      '" cy="' +
      size / 2 +
      '" r="' +
      r +
      '" fill="none" stroke-width="' +
      stroke +
      '" stroke-dasharray="' +
      c.toFixed(1) +
      '" stroke-dashoffset="' +
      c.toFixed(1) +
      '" data-donut-value="' +
      offset.toFixed(1) +
      '"/>' +
      '</svg>' +
      '<span class="donut__label">' +
      util.fmtPct(v) +
      (opts.caption ? '<small>' + esc(opts.caption) + '</small>' : '') +
      '</span>' +
      '</div>'
    );
  };

  ui.weekChart = function (days) {
    var max = Math.max.apply(
      null,
      days.map(function (d) {
        return d.count;
      })
    );
    var peak = Math.max(1, max);
    var w = 300;
    var h = 120;
    var gap = 10;
    var bw = (w - gap * (days.length - 1)) / days.length;
    var bars = days
      .map(function (d, i) {
        var ratio = d.count / peak;
        var bh = Math.max(3, ratio * (h - 26));
        var x = i * (bw + gap);
        var y = h - 18 - bh;
        var fill = d.isToday ? 'var(--brand)' : d.count ? 'var(--brand-soft-2)' : 'var(--surface-3)';
        return (
          '<rect x="' +
          x.toFixed(1) +
          '" y="' +
          y.toFixed(1) +
          '" width="' +
          bw.toFixed(1) +
          '" height="' +
          bh.toFixed(1) +
          '" rx="4" fill="' +
          fill +
          '" class="bar-anim" style="animation-delay:' +
          (i * 45) +
          'ms"/>' +
          '<text x="' +
          (x + bw / 2).toFixed(1) +
          '" y="' +
          (h - 2) +
          '" text-anchor="middle">' +
          util.toFa(d.day) +
          '</text>'
        );
      })
      .join('');
    var total = days.reduce(function (a, d) {
      return a + d.count;
    }, 0);
    return (
      '<figure style="margin:0">' +
      '<svg class="chart" viewBox="0 0 ' +
      w +
      ' ' +
      h +
      '" role="img" aria-label="فعالیت هفته: ' +
      util.toFa(total) +
      ' رویداد">' +
      '<line x1="0" y1="' +
      (h - 18) +
      '" x2="' +
      w +
      '" y2="' +
      (h - 18) +
      '" stroke="var(--border)" stroke-width="1"/>' +
      bars +
      '</svg>' +
      '<figcaption class="hint" style="margin-top:6px">' +
      (total
        ? 'در این هفته ' + util.toFa(total) + ' رویداد یادگیری ثبت شده است.'
        : 'در این هفته هنوز رویدادی ثبت نشده است.') +
      '</figcaption>' +
      '</figure>'
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
    var bars = util.$$('[data-progress]', root || document);
    var donuts = util.$$('[data-donut-value]', root || document);
    util.nextFrame(function () {
      bars.forEach(function (bar) {
        bar.style.width = util.clamp(Number(bar.getAttribute('data-progress')), 0, 100) + '%';
      });
      donuts.forEach(function (ring) {
        ring.style.strokeDashoffset = ring.getAttribute('data-donut-value');
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
