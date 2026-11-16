/* ==========================================================================
   MEHRAZ — settings and about
   Small, calm, and about the student's own things: profile, appearance,
   their backup file, and their data. Nothing about how the app is built.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var M = window.MEHRAZ;
  var util = M.util;
  var esc = util.esc;
  var views = (M.views = M.views || {});

  function profileCard() {
    var p = M.store.profile();
    return (
      '<div class="card card--pad">' +
      '<div class="row" style="gap:14px">' + M.ui.avatar(p.displayName, 'lg') +
      '<div style="min-width:0;flex:1 1 auto">' +
      '<div class="card__title truncate">' + esc(p.displayName) + '</div>' +
      '<div class="card__text">پایهٔ ' + esc(M.content.gradeLabel(p.grade)) +
      (p.track ? ' • ' + esc(M.content.trackLabel(p.track)) : '') + '</div></div>' +
      '<a class="btn btn--ghost btn--sm" href="#/profile/edit">' + M.icon('edit', 15) + 'ویرایش</a>' +
      '</div></div>'
    );
  }

  function segment(attr, value, current, label) {
    var active = current === value;
    return (
      '<button class="segmented__item' + (active ? ' is-active' : '') + '" type="button" ' +
      attr + '="' + value + '" role="tab" aria-selected="' + active + '">' + esc(label) + '</button>'
    );
  }

  views.settings = function () {
    var prefs = M.store.prefs();

    var appearance =
      '<section class="section">' + M.ui.sectionHead('ظاهر') +
      '<div class="card card--pad">' +
      M.ui.settingRow({
        title: 'پوسته',
        text: 'روشن برای روز، شبانه برای نور کم.',
        action:
          '<div class="segmented" role="tablist" aria-label="پوسته">' +
          segment('data-theme-set', 'light', prefs.theme, 'روشن') +
          segment('data-theme-set', 'night', prefs.theme, 'شبانه') +
          '</div>'
      }) +
      M.ui.settingRow({
        title: 'حرکت',
        text: 'اگر انیمیشن‌ها حواستان را پرت می‌کند، حالت کاهش‌یافته را انتخاب کنید.',
        action:
          '<div class="segmented" role="tablist" aria-label="حرکت">' +
          segment('data-motion-set', 'system', prefs.motion, 'کامل') +
          segment('data-motion-set', 'reduced', prefs.motion, 'کاهش‌یافته') +
          '</div>'
      }) +
      M.ui.settingRow({
        title: 'بازگشت به حالت پیش‌فرض',
        text: 'پوستهٔ روشن و حرکت کامل.',
        action: '<button class="btn btn--quiet btn--sm" type="button" data-reset-prefs>بازنشانی</button>'
      }) +
      '</div></section>';

    var dataSection =
      '<section class="section">' + M.ui.sectionHead('پشتیبان') +
      '<div class="card card--pad">' +
      M.ui.settingRow({
        title: 'گرفتن نسخهٔ پشتیبان',
        text: 'یک فایل که پروفایل، پیشرفت، آزمون‌ها و مرورها را نگه می‌دارد. آن را در جای امنی نگه دارید.',
        action: '<button class="btn btn--primary btn--sm" type="button" data-export>' + M.icon('download', 16) + 'دریافت فایل</button>'
      }) +
      M.ui.settingRow({
        title: 'بازگرداندن پشتیبان',
        text: 'پیش از هر تغییری، خلاصهٔ فایل نمایش داده می‌شود.',
        action: '<button class="btn btn--ghost btn--sm" type="button" data-import-open>' + M.icon('upload', 16) + 'انتخاب فایل</button>'
      }) +
      '</div></section>';

    var dangerSection =
      '<section class="section">' + M.ui.sectionHead('داده‌ها') +
      '<div class="card card--pad">' +
      M.ui.settingRow({
        title: 'پاک‌کردن داده‌های من',
        text: 'پروفایل، پیشرفت، آزمون‌ها و مرورها پاک می‌شوند. این کار برگشت‌پذیر نیست.',
        action: '<button class="btn btn--ghost btn--sm" type="button" data-clear style="color:var(--danger);border-color:var(--danger)">' + M.icon('trash', 15) + 'پاک‌کردن</button>'
      }) +
      '</div></section>';

    var html =
      M.ui.pageHead({ title: 'تنظیمات', sub: 'پروفایل، ظاهر و فایل پشتیبان؛ هرچه لازم دارید، در یک صفحه.' }) +
      '<div class="stack" style="gap:24px">' +
      '<section class="section">' + M.ui.sectionHead('پروفایل') + profileCard() + '</section>' +
      appearance + dataSection + dangerSection +
      '<p class="hint" style="text-align:center">مهراز، نسخهٔ ' + util.toFa(M.version) + '</p>' +
      '</div>';

    return {
      title: 'تنظیمات',
      nav: 'settings',
      html: html,
      onMount: function (root) {
        util.$$('[data-theme-set]', root).forEach(function (btn) {
          btn.addEventListener('click', function () {
            M.store.setPref('theme', btn.getAttribute('data-theme-set'));
            M.app.applyPrefs();
            M.router.refresh();
          });
        });

        util.$$('[data-motion-set]', root).forEach(function (btn) {
          btn.addEventListener('click', function () {
            M.store.setPref('motion', btn.getAttribute('data-motion-set'));
            M.app.applyPrefs();
            M.router.refresh();
          });
        });

        var resetBtn = util.$('[data-reset-prefs]', root);
        if (resetBtn) {
          resetBtn.addEventListener('click', function () {
            M.store.update(function (s) {
              s.prefs.theme = 'light';
              s.prefs.motion = 'system';
            }, 'prefs.reset');
            M.app.applyPrefs();
            M.router.refresh();
            M.ui.toast('ظاهر برنامه بازنشانی شد.', { type: 'ok' });
          });
        }

        var exportBtn = util.$('[data-export]', root);
        if (exportBtn) {
          exportBtn.addEventListener('click', function () {
            try {
              var info = M.backup.download();
              M.ui.toast('فایل پشتیبان ساخته شد: ' + info.name, { type: 'ok', ttl: 7000 });
            } catch (err) {
              M.diag.record('error', err.message, { scope: 'backup.export' });
              M.ui.toast('ساخت فایل پشتیبان ممکن نشد.', { type: 'danger', ttl: 7000 });
            }
          });
        }

        var importBtn = util.$('[data-import-open]', root);
        if (importBtn) {
          importBtn.addEventListener('click', function () {
            M.app.openImport();
          });
        }

        var clearBtn = util.$('[data-clear]', root);
        if (clearBtn) {
          clearBtn.addEventListener('click', function () {
            M.ui.confirm({
              title: 'همهٔ داده‌ها پاک شود؟',
              text: 'پروفایل، پیشرفت درس‌ها، نتیجهٔ آزمون‌ها و مرورها حذف می‌شوند. اگر پشتیبان نگرفته‌اید، اول یک نسخه بگیرید.',
              confirmLabel: 'پاک کن',
              cancelLabel: 'انصراف',
              danger: true
            }).then(function (ok) {
              if (!ok) return;
              clearBtn.disabled = true;
              M.store.clearUserData(false).then(function (saved) {
                if (!saved && M.storage.status().driver !== 'memory') {
                  clearBtn.disabled = false;
                  M.ui.toast('پاک‌کردن داده‌ها ذخیره نشد. دوباره تلاش کنید یا فایل پشتیبان بگیرید.', {
                    type: 'warn',
                    ttl: 9000
                  });
                  return;
                }
                M.ui.toast('داده‌ها پاک شد.', { type: 'ok' });
                M.router.go('#/welcome');
              });
            });
          });
        }
      }
    };
  };

  /* ---- about ------------------------------------------------------------- */
  views.about = function () {
    var html =
      M.ui.pageHead({ title: 'سازندهٔ مهراز' }) +
      '<section class="section">' +
      '<div class="creator-card">' +
      '<div class="creator__mark" aria-hidden="true">' + esc(M.ui.initials('امین')) + '</div>' +
      '<div class="creator__body">' +
      '<span class="creator__label">نام سازنده</span>' +
      '<div class="creator__name">امین</div>' +
      '<div class="creator__role">طراح و سازندهٔ مهراز</div>' +
      '</div>' +
      '<div class="creator-links">' +
      '<a class="linkbtn" href="https://t.me/Mozrd" target="_blank" rel="noopener noreferrer">' + M.icon('telegram', 18) +
      '<span>تلگرام <span dir="ltr" style="color:var(--txt-muted)">@Mozrd</span></span></a>' +
      '<a class="linkbtn" href="https://rubika.ir/angosht0" target="_blank" rel="noopener noreferrer">' + M.icon('rubika', 18) +
      '<span>روبیکا <span dir="ltr" style="color:var(--txt-muted)">@angosht0</span></span></a>' +
      '</div></div>' +
      '<p class="hint" style="margin-top:14px">برای گفتن نظر، پیشنهاد یا گزارش یک مشکل، از همین راه‌ها پیام بدهید.</p>' +
      '</section>';

    return { title: 'درباره', nav: 'about', html: html };
  };
})(window, document);
