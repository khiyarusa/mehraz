/* ==========================================================================
   MEHRAZ — application assembly
   Boots storage, restores state, builds the chrome, registers routes and
   starts the router. This is the only entry point.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var M = window.MEHRAZ;
  var util = M.util;
  var esc = util.esc;

  var NAV = [
    { key: 'dashboard', label: 'داشبورد', icon: 'home', href: '#/dashboard' },
    { key: 'library', label: 'کتابخانه', icon: 'library', href: '#/library' },
    { key: 'exam', label: 'آزمون', icon: 'exam', href: '#/exam' },
    { key: 'review', label: 'مرور', icon: 'review', href: '#/review' },
    { key: 'progress', label: 'پیشرفت', icon: 'progress', href: '#/progress' },
    { key: 'settings', label: 'تنظیمات', icon: 'settings', href: '#/settings' }
  ];

  var BOTTOM = ['dashboard', 'library', 'exam', 'review', 'settings'];

  var app = (M.app = {});

  /* ---- preferences ------------------------------------------------------ */
  app.applyPrefs = function () {
    var prefs = M.store.prefs();
    var root = document.documentElement;

    root.setAttribute('data-theme', prefs.theme === 'night' ? 'night' : 'light');

    if (prefs.motion === 'reduced') root.setAttribute('data-motion', 'reduced');
    else root.removeAttribute('data-motion');

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', prefs.theme === 'night' ? '#0b1622' : '#ffffff');
  };

  /* ---- chrome ----------------------------------------------------------- */
  function navItem(item, compact) {
    return (
      '<a class="' +
      (compact ? 'bottomnav__item' : 'navitem') +
      '" href="' +
      item.href +
      '" data-nav="' +
      item.key +
      '">' +
      '<span class="' +
      (compact ? 'bottomnav__icon' : 'navitem__icon') +
      '">' +
      M.icon(item.icon, compact ? 21 : 19) +
      (compact ? '<span class="bottomnav__badge" data-review-badge hidden></span>' : '') +
      '</span>' +
      '<span>' +
      esc(item.label) +
      '</span>' +
      (compact ? '' : '<span class="navitem__badge" data-review-badge hidden></span>') +
      '</a>'
    );
  }

  app.buildChrome = function () {
    var brandHost = document.getElementById('sidebar-brand');
    if (brandHost) {
      brandHost.innerHTML = '<a href="#/dashboard" aria-label="مهراز — خانه">' + M.brand({ onDark: true }) + '</a>';
    }

    var mainNav = document.getElementById('nav-main');
    if (mainNav) {
      mainNav.innerHTML =
        '<span class="navgroup__label">مسیر یادگیری</span>' +
        NAV.slice(0, 5).map(function (i) {
          return navItem(i, false);
        }).join('');
    }

    var extraNav = document.getElementById('nav-extra');
    if (extraNav) {
      extraNav.innerHTML =
        '<span class="navgroup__label">بیشتر</span>' +
        NAV.slice(5).map(function (i) {
          return navItem(i, false);
        }).join('') +
        '<a class="sidebar__link" href="#/about">' + M.icon('user', 15) + 'دربارهٔ سازنده</a>';
    }

    var bottom = document.getElementById('bottomnav');
    if (bottom) {
      bottom.innerHTML = NAV.filter(function (i) {
        return BOTTOM.indexOf(i.key) !== -1;
      })
        .map(function (i) {
          return navItem(i, true);
        })
        .join('');
    }

    app.renderStorage();

    var mobileBrand = document.getElementById('topbar-brand');
    if (mobileBrand) {
      mobileBrand.innerHTML =
        '<a href="#/dashboard" aria-label="مهراز">' + M.brand({ onDark: false, small: true }) + '</a>';
    }
  };

  app.renderStorage = function () {
    var host = document.getElementById('storage-chip');
    if (!host) return;
    var st = M.storage.status();
    var ok = st.ok;
    host.innerHTML =
      '<span class="dot ' +
      (ok ? 'dot--ok' : 'dot--warn') +
      '"></span>' +
      '<span>' +
      (ok
        ? 'ذخیره‌سازی محلی: ' + esc(M.storage.label())
        : 'ذخیره‌سازی دائمی در دسترس نیست') +
      '</span>';
  };

  /* ---- global search ---------------------------------------------------- */
  function resultsHtml(query) {
    var rows = M.content.search(query);
    if (!query || !query.trim()) {
      return '<p class="hint" style="padding:10px 12px">نام درس، فصل یا کتاب را بنویسید.</p>';
    }
    if (!rows.length) {
      return (
        '<p class="hint" style="padding:10px 12px">نتیجه‌ای یافت نشد. ' +
        (M.content.hasAnyContent() ? '' : 'کتابخانه هنوز محتوای درسی ندارد.') +
        '</p>'
      );
    }
    return rows
      .map(function (r) {
        return (
          '<button class="searchresult" type="button" data-go="' +
          esc(r.route) +
          '"><span class="card__icon" style="width:28px;height:28px;border-radius:8px">' +
          M.icon(r.kind === 'lesson' ? 'book' : r.kind === 'chapter' ? 'layers' : 'library', 14) +
          '</span><span style="min-width:0"><span class="truncate" style="display:block">' +
          esc(r.title) +
          '</span><span class="searchresult__meta">' +
          esc(r.meta) +
          '</span></span></button>'
        );
      })
      .join('');
  }

  app.bindSearch = function () {
    var input = document.getElementById('global-search');
    var panel = document.getElementById('global-search-panel');
    var wrap = document.getElementById('global-search-wrap');

    function close() {
      if (panel) panel.hidden = true;
      if (input) input.setAttribute('aria-expanded', 'false');
    }

    function open() {
      if (!panel) return;
      panel.hidden = false;
      if (input) input.setAttribute('aria-expanded', 'true');
    }

    if (input && panel) {
      var run = util.debounce(function () {
        panel.innerHTML = resultsHtml(input.value);
      }, 140);

      input.addEventListener('focus', function () {
        panel.innerHTML = resultsHtml(input.value);
        open();
      });
      input.addEventListener('input', run);
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') {
          close();
          input.blur();
        }
        if (ev.key === 'Enter') {
          var first = util.$('[data-go]', panel);
          if (first) first.click();
        }
      });

      panel.addEventListener('click', function (ev) {
        var btn = ev.target.closest ? ev.target.closest('[data-go]') : null;
        if (!btn) return;
        close();
        input.value = '';
        M.router.go(btn.getAttribute('data-go'));
      });

      document.addEventListener('click', function (ev) {
        if (wrap && !wrap.contains(ev.target)) close();
      });
    }

    document.addEventListener('keydown', function (ev) {
      var tag = (ev.target && ev.target.tagName) || '';
      var typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (ev.target && ev.target.isContentEditable);
      if ((ev.key === '/' && !typing) || ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k')) {
        ev.preventDefault();
        if (input && input.offsetParent !== null) {
          input.focus();
          input.select();
        } else {
          openMobileSearch();
        }
      }
    });

    var mobileBtn = document.getElementById('mobile-search-btn');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', openMobileSearch);
    }

    function openMobileSearch() {
      M.ui.modal({
        title: 'جست‌وجو',
        subtitle: 'در کتاب‌ها، فصل‌ها و درس‌ها',
        body:
          '<div class="searchbox" style="height:44px">' +
          M.icon('search', 17) +
          '<input type="search" id="modal-search" placeholder="نام درس یا فصل" aria-label="جست‌وجو" autofocus>' +
          '</div><div data-modal-results style="margin-top:10px"></div>',
        onMount: function (box, handle) {
          var inputEl = util.$('#modal-search', box);
          var host = util.$('[data-modal-results]', box);
          host.innerHTML = resultsHtml('');
          var run = util.debounce(function () {
            host.innerHTML = resultsHtml(inputEl.value);
          }, 140);
          inputEl.addEventListener('input', run);
          host.addEventListener('click', function (ev) {
            var btn = ev.target.closest ? ev.target.closest('[data-go]') : null;
            if (!btn) return;
            handle.close();
            M.router.go(btn.getAttribute('data-go'));
          });
          window.setTimeout(function () {
            inputEl.focus();
          }, 60);
        }
      });
    }
  };

  /* ---- profile menu ----------------------------------------------------- */
  app.bindProfileMenu = function () {
    var chip = document.getElementById('profile-chip');
    var menu = document.getElementById('profile-menu');
    if (!chip || !menu) return;

    function closeMenu() {
      menu.hidden = true;
      chip.setAttribute('aria-expanded', 'false');
    }

    chip.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var open = menu.hidden;
      menu.hidden = !open;
      chip.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        var first = util.$('button, a', menu);
        if (first) first.focus();
      }
    });

    document.addEventListener('click', function (ev) {
      if (!menu.hidden && !menu.contains(ev.target) && !chip.contains(ev.target)) closeMenu();
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !menu.hidden) {
        closeMenu();
        chip.focus();
      }
    });

    menu.addEventListener('click', function (ev) {
      var item = ev.target.closest ? ev.target.closest('[data-menu-go]') : null;
      if (item) {
        closeMenu();
        M.router.go(item.getAttribute('data-menu-go'));
      }
    });
  };

  app.renderProfileChip = function () {
    var chip = document.getElementById('profile-chip');
    var p = M.store.profile();
    if (!chip || !p) return;
    chip.innerHTML =
      M.ui.avatar(p.displayName, 'sm') +
      '<span class="profile-chip__text"><span class="profile-chip__name">' +
      esc(p.displayName) +
      '</span><span class="profile-chip__meta">پایهٔ ' +
      esc(M.content.gradeLabel(p.grade)) +
      '</span></span>' +
      M.icon('chevronDown', 15);
  };

  /* ---- import flow (shared by settings and the welcome screen) ---------- */
  app.openImport = function (opts) {
    opts = opts || {};
    var handle = M.ui.modal({
      title: 'بازیابی از پشتیبان',
      subtitle: 'فایل JSON پشتیبان مهراز را انتخاب کنید. پیش از هر تغییری، محتوای آن نمایش داده می‌شود.',
      body:
        '<div data-import-body>' +
        '<div class="field">' +
        '<label class="label" for="import-file">فایل پشتیبان</label>' +
        '<input class="input" id="import-file" type="file" accept=".json,application/json" style="height:auto;padding:11px 12px">' +
        '<span class="hint">فایل‌های ساخته‌شده با همین برنامه (mehraz-backup-*.json) پذیرفته می‌شوند.</span>' +
        '</div>' +
        '<div class="banner banner--info" style="margin-top:14px">' +
        M.icon('lock', 16) +
        '<span>فایل فقط در همین دستگاه خوانده می‌شود و به هیچ جایی ارسال نمی‌شود.</span>' +
        '</div>' +
        '<div data-import-status></div>' +
        '</div>',
      footer: '<button class="btn btn--ghost" type="button" data-close="1">بستن</button>',
      onMount: function (box, modal) {
        var bodyHost = util.$('[data-import-body]', box);
        var input = util.$('#import-file', box);

        function reset() {
          bodyHost.innerHTML =
            '<div class="field">' +
            '<label class="label" for="import-file">فایل پشتیبان</label>' +
            '<input class="input" id="import-file" type="file" accept=".json,application/json" style="height:auto;padding:11px 12px">' +
            '<span class="hint">فایل‌های ساخته‌شده با همین برنامه (mehraz-backup-*.json) پذیرفته می‌شوند.</span>' +
            '</div>' +
            '<div class="banner banner--info" style="margin-top:14px">' +
            M.icon('lock', 16) +
            '<span>فایل فقط در همین دستگاه خوانده می‌شود و به هیچ جایی ارسال نمی‌شود.</span>' +
            '</div>' +
            '<div data-import-status></div>';
          bindInput();
        }

        function fail(messages) {
          bodyHost.innerHTML =
            '<div class="banner banner--danger">' +
            M.icon('alert', 16) +
            '<span>' +
            esc(messages[0]) +
            '</span></div>' +
            (messages.length > 1
              ? '<ul class="hint" style="margin-top:10px;padding-inline-start:18px;list-style:disc">' +
                messages
                  .slice(1)
                  .map(function (m) {
                    return '<li>' + esc(m) + '</li>';
                  })
                  .join('') +
                '</ul>'
              : '') +
            '<p class="hint" style="margin-top:12px">هیچ داده‌ای تغییر نکرد.</p>' +
            '<button class="btn btn--ghost btn--sm btn--block" type="button" data-retry style="margin-top:10px">انتخاب فایل دیگر</button>';
          util.$('[data-retry]', bodyHost).addEventListener('click', reset);
        }

        function bindInput() {
          input = util.$('#import-file', box);
          if (!input) return;
          input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            if (!file) return;
            M.backup
              .parseFile(file)
              .then(function (text) {
                var result = M.backup.parse(text);
                if (!result.ok) {
                  fail(result.errors);
                  return;
                }
                preview(result);
              })
              .catch(function (err) {
                fail([err.message || 'خواندن فایل ممکن نشد.']);
              });
          });
        }

        function preview(result) {
          var s = result.summary;
          var current = M.store.profile();
          var mismatch =
            current && s.displayName && current.displayName !== s.displayName
              ? '<div class="banner banner--warn" style="margin-top:12px">' +
                M.icon('alert', 16) +
                '<span>نام پشتیبان با پروفایل فعلی تفاوت دارد. با تأیید، اطلاعات فعلی جای‌گزین می‌شود.</span></div>'
              : '';
          bodyHost.innerHTML =
            '<div class="summary-list">' +
            '<div class="summary-row"><span class="summary-row__label">نام</span><span class="summary-row__value">' +
            esc(s.displayName || '—') +
            '</span></div>' +
            '<div class="summary-row"><span class="summary-row__label">پایه و رشته</span><span class="summary-row__value">' +
            esc(
              s.grade
                ? 'پایهٔ ' + M.content.gradeLabel(s.grade) + (s.track ? ' • ' + M.content.trackLabel(s.track) : '')
                : '—'
            ) +
            '</span></div>' +
            '<div class="summary-row"><span class="summary-row__label">تاریخ تولد</span><span class="summary-row__value">' +
            esc(s.birthDate) +
            '</span></div>' +
            '<div class="summary-row"><span class="summary-row__label">زمان ساخت پشتیبان</span><span class="summary-row__value">' +
            esc(s.exportedLabel) +
            '</span></div>' +
            '<div class="summary-row"><span class="summary-row__label">درس‌های کامل‌شده</span><span class="summary-row__value num">' +
            util.toFa(s.lessonsDone) +
            ' از ' +
            util.toFa(s.lessonsTracked) +
            '</span></div>' +
            '<div class="summary-row"><span class="summary-row__label">آزمون‌ها</span><span class="summary-row__value num">' +
            util.toFa(s.examAttempts) +
            '</span></div>' +
            '<div class="summary-row"><span class="summary-row__label">مرورها</span><span class="summary-row__value num">' +
            util.toFa(s.reviewItems) +
            '</span></div>' +
            '</div>' +
            mismatch +
            (result.warnings.length
              ? '<div class="banner banner--warn" style="margin-top:12px">' +
                M.icon('info', 16) +
                '<span>' +
                esc(result.warnings.join(' ')) +
                '</span></div>'
              : '') +
            '<div class="row row--wrap" style="margin-top:16px;gap:8px">' +
            '<button class="btn btn--ghost btn--sm" type="button" data-retry>انصراف</button>' +
            '<button class="btn btn--primary btn--sm push" type="button" data-apply>جای‌گزینی با این پشتیبان</button>' +
            '</div>';

          util.$('[data-retry]', bodyHost).addEventListener('click', reset);
          util.$('[data-apply]', bodyHost).addEventListener('click', function () {
            confirmStep(result);
          });
        }

        function confirmStep(result) {
          bodyHost.innerHTML =
            '<div class="banner banner--warn">' +
            M.icon('alert', 16) +
            '<span>اطلاعات فعلی این دستگاه با محتوای پشتیبان جای‌گزین می‌شود. این کار قابل بازگشت نیست.</span></div>' +
            '<p class="hint" style="margin-top:12px">آیا مطمئن هستید؟</p>' +
            '<div class="row row--wrap" style="margin-top:8px;gap:8px">' +
            '<button class="btn btn--ghost btn--sm" type="button" data-back>بازگشت</button>' +
            '<button class="btn btn--danger btn--sm push" type="button" data-final>تأیید نهایی و بازیابی</button>' +
            '</div>';
          util.$('[data-back]', bodyHost).addEventListener('click', function () {
            preview(result);
          });
          util.$('[data-final]', bodyHost).addEventListener('click', function () {
            M.backup.apply(result).then(function (saved) {
              modal.close();
              M.app.applyPrefs();
              if (!saved) {
                M.ui.toast('بازیابی انجام شد اما ذخیره‌سازی دائمی ممکن نشد. لطفاً پشتیبان بگیرید.', {
                  type: 'warn',
                  ttl: 7000
                });
              } else {
                M.ui.toast('پشتیبان با موفقیت بازیابی شد.', { type: 'ok', ttl: 6000 });
              }
              if (M.store.hasProfile()) M.router.go('#/dashboard');
              else M.router.render({ path: '#/welcome' });
            });
          });
        }

        bindInput();
      }
    });
    return handle;
  };

  /* ---- boot ------------------------------------------------------------- */
  app.boot = function () {
    var boot = document.getElementById('boot');

    M.storage
      .init()
      .catch(function (err) {
        M.diag.record('error', 'storage init failed: ' + err.message);
      })
      .then(function () {
        return M.store.init();
      })
      .catch(function (err) {
        M.diag.record('error', 'state init failed: ' + err.message);
        M.store.ready = true;
      })
      .then(function () {
        M.content.init();
        app.applyPrefs();
        app.buildChrome();
        app.renderProfileChip();
        app.bindSearch();
        app.bindProfileMenu();
        registerRoutes();

        M.router.start();

        if (boot) {
          boot.classList.add('is-hidden');
          window.setTimeout(function () {
            if (boot.parentNode) boot.parentNode.removeChild(boot);
          }, 420);
        }

        // post-boot notifications, only when they are actionable
        if (!M.storage.status().ok) {
          M.ui.toast('ذخیره‌سازی دائمی در این مرورگر در دسترس نیست. برای نگه‌داشتن اطلاعات، پشتیبان بگیرید.', {
            type: 'warn',
            ttl: 9000,
            actionLabel: 'پشتیبان',
            onAction: function () {
              M.router.go('#/settings');
            }
          });
        }
        if (M.store.futureData) {
          M.ui.toast('داده‌های ذخیره‌شده از این نسخه جدیدتر است؛ ذخیره‌سازی خودکار خاموش شد.', {
            type: 'danger',
            ttl: 0
          });
        }

        M.bus.on('route:rendered', function () {
          app.renderProfileChip();
          var chip = document.getElementById('profile-chip');
          if (chip) chip.hidden = !M.store.hasProfile();
        });
      });
  };

  /* ---- routes ----------------------------------------------------------- */
  function guardless(view) {
    return function (params, query) {
      return view(params, query);
    };
  }

  function registerRoutes() {
    var add = M.router.add;

    add({ path: '#/welcome', title: 'خوش آمدید', nav: '', guestOnly: true, view: guardless(M.views.welcome) });
    add({
      path: '#/onboarding',
      title: 'ثبت‌نام',
      nav: '',
      guestOnly: true,
      view: guardless(M.views.onboarding)
    });
    add({
      path: '#/profile/edit',
      title: 'ویرایش پروفایل',
      nav: 'settings',
      requiresProfile: true,
      view: guardless(M.views.profileEdit)
    });
    add({
      path: '#/dashboard',
      title: 'داشبورد',
      nav: 'dashboard',
      requiresProfile: true,
      view: guardless(M.views.dashboard)
    });
    add({
      path: '#/library',
      title: 'کتابخانه',
      nav: 'library',
      requiresProfile: true,
      view: guardless(M.views.library)
    });
    add({
      path: '#/library/:grade',
      title: 'پایه',
      nav: 'library',
      requiresProfile: true,
      view: guardless(M.views.grade)
    });
    add({
      path: '#/library/:grade/:track',
      title: 'پایه',
      nav: 'library',
      requiresProfile: true,
      view: guardless(M.views.grade)
    });
    add({
      path: '#/subject/:subjectId',
      title: 'درس',
      nav: 'library',
      requiresProfile: true,
      view: guardless(M.views.subject)
    });
    add({
      path: '#/book/:bookId',
      title: 'کتاب',
      nav: 'library',
      requiresProfile: true,
      view: guardless(M.views.book)
    });
    add({
      path: '#/book/:bookId/:chapterId',
      title: 'فصل',
      nav: 'library',
      requiresProfile: true,
      view: guardless(M.views.chapter)
    });
    add({
      path: '#/lesson/:bookId/:chapterId/:lessonId',
      title: 'درس',
      nav: 'library',
      requiresProfile: true,
      view: guardless(M.views.lesson)
    });
    add({
      path: '#/exam',
      title: 'آزمون',
      nav: 'exam',
      requiresProfile: true,
      view: guardless(M.views.examList)
    });
    add({
      path: '#/exam/:examId',
      title: 'آزمون',
      nav: 'exam',
      requiresProfile: true,
      view: guardless(M.views.examRun)
    });
    add({
      path: '#/exam/:examId/result/:attemptId',
      title: 'نتیجهٔ آزمون',
      nav: 'exam',
      requiresProfile: true,
      view: guardless(M.views.examResult)
    });
    add({
      path: '#/review',
      title: 'مرور',
      nav: 'review',
      requiresProfile: true,
      view: guardless(M.views.review)
    });
    add({
      path: '#/progress',
      title: 'پیشرفت',
      nav: 'progress',
      requiresProfile: true,
      view: guardless(M.views.progress)
    });
    add({
      path: '#/settings',
      title: 'تنظیمات',
      nav: 'settings',
      requiresProfile: true,
      view: guardless(M.views.settings)
    });
    add({ path: '#/about', title: 'درباره', nav: '', view: guardless(M.views.about) });
  }

  /* ---- go --------------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', app.boot);
  } else {
    app.boot();
  }
})(window, document);
