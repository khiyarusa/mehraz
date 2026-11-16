/* ==========================================================================
   MEHRAZ — router
   Hash based, because file:// documents have no reliable history API origin.
   Each view registers itself; the router owns chrome updates and scroll.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var M = window.MEHRAZ;
  var util = M.util;

  var routes = [];
  var current = null;

  function splitPath(path) {
    return String(path || '')
      .replace(/^#/, '')
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(function (p) {
        return p.length > 0;
      });
  }

  function parseRaw(raw) {
    var query = {};
    var qIndex = raw.indexOf('?');
    if (qIndex !== -1) {
      raw.slice(qIndex + 1)
        .split('&')
        .forEach(function (pair) {
          if (!pair) return;
          var kv = pair.split('=');
          query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
        });
      raw = raw.slice(0, qIndex);
    }
    var segments = splitPath(raw).map(function (seg) {
      try {
        return decodeURIComponent(seg);
      } catch (err) {
        return seg;
      }
    });
    return { segments: segments, query: query };
  }

  function parseHash() {
    return parseRaw(window.location.hash || '');
  }

  function match(segments) {
    for (var i = 0; i < routes.length; i += 1) {
      var route = routes[i];
      var parts = route.segments;
      if (!route.exact && segments.length < parts.length) continue;
      if (parts.length !== segments.length) continue;
      var params = {};
      var ok = true;
      for (var j = 0; j < parts.length; j += 1) {
        if (parts[j].charAt(0) === ':') {
          params[parts[j].slice(1)] = segments[j];
        } else if (parts[j] !== segments[j]) {
          ok = false;
          break;
        }
      }
      if (ok) return { route: route, params: params };
    }
    return null;
  }

  function pathOf(segments) {
    return '#/' + segments.join('/');
  }

  var router = (M.router = {
    routes: routes,

    add: function (config) {
      config.segments = splitPath(config.path);
      routes.push(config);
      return config;
    },

    current: function () {
      return current;
    },

    path: function () {
      var parsed = parseHash();
      return pathOf(parsed.segments);
    },

    go: function (path, opts) {
      var target = String(path || '#/dashboard');
      if (opts && opts.replace && window.location.replace) {
        window.location.replace(target);
        return;
      }
      if (window.location.hash === target) {
        router.render();
        return;
      }
      window.location.hash = target;
    },

    refresh: function () {
      if (!current) return;
      router.render({ keepScroll: true });
    },

    start: function () {
      window.addEventListener('hashchange', function () {
        router.render();
      });
      if (!window.location.hash) {
        // First paint must not navigate: a fragment-only redirect is resolved
        // against the container URL inside srcdoc / sandboxed hosts. Rendering
        // the entry route directly keeps boot side-effect free.
        router.render({ path: M.store.hasProfile() ? '#/dashboard' : '#/welcome' });
        return;
      }
      router.render();
    },

    render: function (opts) {
      opts = opts || {};
      var parsed = opts.path ? parseRaw(opts.path) : parseHash();
      var found = match(parsed.segments);
      var viewEl = document.getElementById('view');
      if (!viewEl) return;

      if (!found) {
        current = { path: pathOf(parsed.segments), route: null, params: {} };
        document.body.classList.remove('is-bare');
        viewEl.innerHTML = '<div class="page">' + router.notFound() + '</div>';
        router.applyChrome({ title: 'صفحه یافت نشد', nav: '' });
        return;
      }

      var route = found.route;

      // ---- guards -------------------------------------------------------
      if (route.requiresProfile && !M.store.hasProfile()) {
        router.go('#/onboarding', { replace: true });
        return;
      }
      if (route.guestOnly && M.store.hasProfile()) {
        router.go('#/dashboard', { replace: true });
        return;
      }


      current = {
        path: pathOf(parsed.segments),
        route: route,
        params: found.params,
        query: parsed.query
      };

      var result;
      try {
        result = route.view(found.params, parsed.query) || {};
      } catch (err) {
        M.diag.record('error', err && err.message, { scope: 'view:' + route.path, stack: err && err.stack });
        result = {
          title: 'خطا',
          html:
            '<div class="page">' +
            M.ui.empty({
              icon: 'alert',
              title: 'این صفحه بارگذاری نشد',
              text: 'یک خطای داخلی رخ داد. می‌توانید به خانه بازگردید.',
              actions: '<a class="btn btn--primary" href="#/dashboard">بازگشت به خانه</a>'
            }) +
            '</div>'
        };
      }

      var html = result.html || '';
      if (current && typeof current.unmount === 'function') {
        try {
          current.unmount();
        } catch (err) {
          M.diag.record('error', err.message, { scope: 'unmount' });
        }
      }
      current.unmount = typeof result.onUnmount === 'function' ? result.onUnmount : null;
      viewEl.innerHTML = '<div class="page">' + html + '</div>';
      router.applyChrome({ title: result.title || route.title || 'مهراز', nav: route.nav });
      M.ui.animateProgress(viewEl);

      // Welcome and onboarding run without the app shell: nothing in the
      // navigation would work before a profile exists.
      document.body.classList.toggle('is-bare', result.bare === true);

      if (!opts.keepScroll) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }

      // Focus the main region for screen-reader context, without stealing scroll.
      try {
        viewEl.focus({ preventScroll: true });
      } catch (err) {
        viewEl.focus();
      }

      util.announce(result.title || route.title || '');

      if (typeof result.onMount === 'function') {
        result.onMount(viewEl, current);
      }
      M.bus.emit('route:rendered', current);
    },

    applyChrome: function (info) {
      var titleEl = document.getElementById('topbar-title');
      var subEl = document.getElementById('topbar-sub');
      if (titleEl) titleEl.textContent = info.title || 'مهراز';
      if (subEl) subEl.textContent = info.sub || M.content.trackLabel(M.store.profile() && M.store.profile().track) || '';
      document.title = 'مهراز | ' + (info.title || 'یادگیری');

      util.$$('[data-nav]').forEach(function (link) {
        var key = link.getAttribute('data-nav');
        var on = key === info.nav;
        link.classList.toggle('is-active', on);
        if (on) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });

      var due = M.store.dueReviewItems().length;
      util.$$('[data-review-badge]').forEach(function (badge) {
        if (due > 0) {
          badge.textContent = util.toFa(due);
          badge.hidden = false;
        } else {
          badge.textContent = '';
          badge.hidden = true;
        }
      });
    },

    notFound: function () {
      return M.ui.empty({
        icon: 'search',
        title: 'این نشانی وجود ندارد',
        text: 'ممکن است پیوند قدیمی باشد یا این بخش هنوز ساخته نشده است.',
        actions:
          '<a class="btn btn--primary" href="#/dashboard">بازگشت به خانه</a>' +
          '<a class="btn btn--ghost" href="#/library">کتابخانهٔ درسی</a>'
      });
    }
  });
})(window, document);
