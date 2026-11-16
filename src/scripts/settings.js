/* ==========================================================================
   MEHRAZ — settings and about
   Profile, appearance, data ownership (export / import / erase), storage
   diagnostics, application information and the creator section.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var M = window.MEHRAZ;
  var util = M.util;
  var esc = util.esc;
  var views = (M.views = M.views || {});

  function storageCard() {
    var st = M.storage.status();
    var label = M.storage.label();
    return (
      '<div class="card card--pad">' +
      '<div class="row" style="gap:8px">' +
      '<span class="dot ' +
      (st.ok ? 'dot--ok' : 'dot--warn') +
      '"></span>' +
      '<div class="card__title">وضعیت ذخیره‌سازی</div>' +
      '<span class="chip chip--outline push">' +
      esc(label) +
      '</span>' +
      '</div>' +
      '<p class="card__text" style="margin-top:8px">' +
      (st.ok
        ? 'داده‌ها روی همین دستگاه ذخیره می‌شوند. با بستن مرورگر از بین نمی‌روند، اما پاک‌کردن داده‌های مرورگر آن‌ها را حذف می‌کند.'
        : 'این مرورگر اجازهٔ ذخیره‌سازی دائمی نمی‌دهد. تغییرات فقط تا زمانی که این صفحه باز است باقی می‌ماند؛ لطفاً از پشتیبان استفاده کنید.') +
      '</p>' +
      '<div class="summary-list" style="margin-top:12px">' +
      '<div class="summary-row"><span class="summary-row__label">آزمون نوشتن و خواندن</span><span class="summary-row__value">' +
      (st.probed ? (st.ok ? 'موفق' : 'ناموفق') : 'انجام نشده') +
      '</span></div>' +
      '<div class="summary-row"><span class="summary-row__label">زمان بررسی</span><span class="summary-row__value num">' +
      esc(st.testedAt ? M.jalali.formatISO(new Date(st.testedAt).getTime()) : '—') +
      '</span></div>' +
      '</div>' +
      (st.notes && st.notes.length
        ? '<details style="margin-top:10px"><summary class="hint" style="cursor:pointer">جزئیات فنی</summary><ul class="hint" style="margin-top:8px;padding-inline-start:18px;list-style:disc">' +
          st.notes
            .map(function (n) {
              return '<li>' + esc(n) + '</li>';
            })
            .join('') +
          '</ul></details>'
        : '') +
      '<button class="btn btn--ghost btn--sm" type="button" data-recheck style="margin-top:12px">' +
      M.icon('refresh', 15) +
      'بررسی مجدد ذخیره‌سازی</button>' +
      '</div>'
    );
  }

  function profileCard() {
    var p = M.store.profile();
    return (
      '<div class="card card--pad">' +
      '<div class="row" style="gap:12px">' +
      M.ui.avatar(p.displayName, 'lg') +
      '<div style="min-width:0;flex:1 1 auto">' +
      '<div class="card__title truncate">' +
      esc(p.displayName) +
      '</div>' +
      '<div class="card__text">پایهٔ ' +
      esc(M.content.gradeLabel(p.grade)) +
      (p.track ? ' • ' + esc(M.content.trackLabel(p.track)) : '') +
      (p.birthDate ? ' • ' + esc(M.jalali.format(p.birthDate.jy, p.birthDate.jm, p.birthDate.jd)) : '') +
      '</div>' +
      '</div>' +
      '<a class="btn btn--ghost btn--sm" href="#/profile/edit">' +
      M.icon('edit', 15) +
      'ویرایش</a>' +
      '</div>' +
      '</div>'
    );
  }

  views.settings = function () {
    var prefs = M.store.prefs();

    var appearance =
      '<section class="section">' +
      M.ui.sectionHead('ظاهر') +
      '<div class="card card--pad">' +
      M.ui.settingRow({
        title: 'پوسته',
        text: 'پوستهٔ روشن برای مطالعهٔ روزانه و پوستهٔ شبانه برای نور کم.',
        action:
          '<div class="segmented" role="tablist" aria-label="پوسته">' +
          '<button class="segmented__item' +
          (prefs.theme === 'light' ? ' is-active' : '') +
          '" type="button" data-theme-set="light" role="tab" aria-selected="' +
          (prefs.theme === 'light') +
          '">روشن</button>' +
          '<button class="segmented__item' +
          (prefs.theme === 'night' ? ' is-active' : '') +
          '" type="button" data-theme-set="night" role="tab" aria-selected="' +
          (prefs.theme === 'night') +
          '">شبانه</button>' +
          '</div>'
      }) +
      M.ui.settingRow({
        title: 'حرکت و انیمیشن',
        text: 'در حالت کاهش‌یافته، انیمیشن‌ها بسیار کوتاه می‌شوند. اگر دستگاه شما تنظیم کاهش حرکت داشته باشد نیز همین‌طور رفتار می‌شود.',
        action:
          '<div class="segmented" role="tablist" aria-label="حرکت">' +
          '<button class="segmented__item' +
          (prefs.motion === 'system' ? ' is-active' : '') +
          '" type="button" data-motion-set="system" role="tab" aria-selected="' +
          (prefs.motion === 'system') +
          '">کامل</button>' +
          '<button class="segmented__item' +
          (prefs.motion === 'reduced' ? ' is-active' : '') +
          '" type="button" data-motion-set="reduced" role="tab" aria-selected="' +
          (prefs.motion === 'reduced') +
          '">کاهش‌یافته</button>' +
          '</div>'
      }) +
      M.ui.settingRow({
        title: 'بازگرداندن ظاهر پیش‌فرض',
        text: 'پوستهٔ روشن و حرکت کامل؛ اطلاعات درسی دست‌نخورده می‌ماند.',
        action: '<button class="btn btn--ghost btn--sm" type="button" data-reset-prefs>بازنشانی</button>'
      }) +
      '</div></section>';

    var dataSection =
      '<section class="section">' +
      M.ui.sectionHead('داده‌های من') +
      '<div class="card card--pad">' +
      M.ui.settingRow({
        title: 'دریافت پشتیبان',
        text: 'یک فایل JSON شامل پروفایل، تنظیمات، پیشرفت، آزمون‌ها و مرورها. این فایل را در جای امن نگه دارید.',
        action:
          '<button class="btn btn--primary btn--sm" type="button" data-export>' +
          M.icon('download', 16) +
          'دریافت پشتیبان</button>'
      }) +
      M.ui.settingRow({
        title: 'بازیابی از پشتیبان',
        text: 'فایل پشتیبان پیش از جای‌گزینی بررسی و نمایش داده می‌شود. تا تأیید شما هیچ داده‌ای تغییر نمی‌کند.',
        action:
          '<button class="btn btn--ghost btn--sm" type="button" data-import-open>' +
          M.icon('upload', 16) +
          'انتخاب فایل</button>'
      }) +
      M.ui.settingRow({
        title: 'پاک‌کردن داده‌های کاربر',
        text: 'پروفایل، پیشرفت، آزمون‌ها و مرورها حذف می‌شوند. این کار برگشت‌پذیر نیست.',
        action:
          '<button class="btn btn--ghost btn--sm" type="button" data-clear style="color:var(--danger);border-color:var(--danger)">' +
          M.icon('trash', 15) +
          'پاک‌کردن</button>'
      }) +
      '<div class="banner" style="margin-top:14px">' +
      M.icon('info', 16) +
      '<span>پشتیبان به‌صورت خودکار در پوشه‌ای ذخیره نمی‌شود؛ فایل دانلودشده را خودتان نگه دارید. برای اطمینان، هر چند هفته یک‌بار پشتیبان بگیرید.</span>' +
      '</div>' +
      '</div></section>';

    var storageSection =
      '<section class="section">' + M.ui.sectionHead('ذخیره‌سازی') + storageCard() + '</section>';

    var devSection =
      '<section class="section">' +
      M.ui.sectionHead('ابزار توسعه') +
      '<div class="card card--pad">' +
      M.ui.settingRow({
        title: 'پیش‌نمایش ساختاری',
        text: 'یک کتاب نمونهٔ بدون محتوای آموزشی را نمایش می‌دهد تا موتور درس، آزمون و مرور بررسی شود. این گزینه برای استفادهٔ روزانه لازم نیست.',
        action:
          '<div class="segmented" role="tablist" aria-label="پیش‌نمایش ساختاری">' +
          '<button class="segmented__item' +
          (!prefs.devPreview ? ' is-active' : '') +
          '" type="button" data-demo="off">خاموش</button>' +
          '<button class="segmented__item' +
          (prefs.devPreview ? ' is-active' : '') +
          '" type="button" data-demo="on">روشن</button>' +
          '</div>'
      }) +
      '<p class="hint" style="margin-top:10px">در حالت روشن، یک نشان «نمونهٔ ساختاری» روی کتاب نمایش داده می‌شود تا با محتوای واقعی اشتباه نشود.</p>' +
      '</div></section>';

    var aboutSection =
      '<section class="section">' +
      M.ui.sectionHead('برنامه') +
      '<div class="card card--pad">' +
      M.ui.settingRow({
        title: 'دربارهٔ سازنده',
        text: 'نام و راه‌های ارتباطی سازنده فقط در همین بخش نمایش داده می‌شود.',
        action: '<a class="btn btn--ghost btn--sm" href="#/about">' + M.icon('user', 15) + 'مشاهده</a>'
      }) +
      '<div class="summary-list" style="margin-top:6px">' +
      '<div class="summary-row"><span class="summary-row__label">نسخه</span><span class="summary-row__value num">' +
      util.toFa(M.version) +
      '</span></div>' +
      '<div class="summary-row"><span class="summary-row__label">ساخت</span><span class="summary-row__value num">' +
      esc(M.build.stamp) +
      '</span></div>' +
      '<div class="summary-row"><span class="summary-row__label">نسخهٔ داده</span><span class="summary-row__value num">' +
      util.toFa(M.schemaVersion) +
      '</span></div>' +
      '<div class="summary-row"><span class="summary-row__label">محتوای درسی</span><span class="summary-row__value">' +
      (M.content.hasAnyContent()
        ? util.toFa(M.content.lessonCount()) + ' درس'
        : 'هنوز افزوده نشده') +
      '</span></div>' +
      '</div>' +
      '</div></section>';

    var body =
      '<div class="stack" style="gap:22px">' +
      '<section class="section">' +
      M.ui.sectionHead('پروفایل من') +
      profileCard() +
      '</section>' +
      appearance +
      dataSection +
      storageSection +
      devSection +
      aboutSection +
      '</div>';

    if (M.store.futureData) {
      body =
        M.ui.banner({
          type: 'warn',
          icon: 'alert',
          text: 'داده‌های ذخیره‌شده از نسخهٔ فعلی برنامه جدیدتر است. برای جلوگیری از آسیب، ذخیره‌سازی خودکار خاموش شده است. لطفاً برنامه را به‌روزرسانی کنید.'
        }) + body;
    }

    return {
      title: 'تنظیمات',
      nav: 'settings',
      html: M.ui.pageHead({
        eyebrow: 'تنظیمات',
        title: 'تنظیمات و داده‌ها',
        sub: 'ظاهر، پشتیبان‌گیری و وضعیت ذخیره‌سازی. هیچ‌کدام از این گزینه‌ها داده‌ای به بیرون نمی‌فرستد.'
      }) + body,
      onMount: function (root) {
        // theme
        util.$$('[data-theme-set]', root).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var value = btn.getAttribute('data-theme-set');
            M.store.setPref('theme', value);
            M.app.applyPrefs();
            M.router.refresh();
            M.ui.toast(value === 'night' ? 'پوستهٔ شبانه فعال شد.' : 'پوستهٔ روشن فعال شد.', { type: 'ok' });
          });
        });

        util.$$('[data-motion-set]', root).forEach(function (btn) {
          btn.addEventListener('click', function () {
            M.store.setPref('motion', btn.getAttribute('data-motion-set'));
            M.app.applyPrefs();
            M.router.refresh();
            M.ui.toast('تنظیم حرکت ذخیره شد.', { type: 'ok' });
          });
        });

        util.$$('[data-reset-prefs]', root).forEach(function (btn) {
          btn.addEventListener('click', function () {
            M.ui
              .confirm({
                title: 'بازگشت به ظاهر پیش‌فرض؟',
                text: 'پوسته به حالت روشن و انیمیشن به حالت کامل برمی‌گردد. اطلاعات درسی تغییر نمی‌کند.',
                confirmLabel: 'بازنشانی ظاهر'
              })
              .then(function (ok) {
                if (!ok) return;
                M.store.update(function (s) {
                  s.prefs.theme = 'light';
                  s.prefs.motion = 'system';
                }, 'prefs.reset');
                M.app.applyPrefs();
                M.router.refresh();
                M.ui.toast('ظاهر برنامه بازنشانی شد.', { type: 'ok' });
              });
          });
        });

        util.$$('[data-demo]', root).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var on = btn.getAttribute('data-demo') === 'on';
            M.content.setDemo(on);
            M.router.refresh();
            M.ui.toast(on ? 'پیش‌نمایش ساختاری روشن شد.' : 'پیش‌نمایش ساختاری خاموش شد.', {
              type: 'warn',
              icon: 'info'
            });
          });
        });

        // export
        util.$$('[data-export]', root).forEach(function (btn) {
          btn.addEventListener('click', function () {
            try {
              var info = M.backup.download();
              M.ui.toast('پشتیبان ساخته شد: ' + info.name, { type: 'ok', ttl: 6200 });
              if (!M.storage.status().ok) {
                M.ui.toast('توجه: ذخیره‌سازی دائمی در دسترس نیست؛ این فایل تنها نسخهٔ شماست.', {
                  type: 'warn',
                  ttl: 7000
                });
              }
            } catch (err) {
              M.diag.record('error', err.message, { scope: 'backup.export' });
              M.ui.toast('ساخت پشتیبان ممکن نشد: ' + err.message, { type: 'danger', ttl: 7000 });
            }
          });
        });

        // restore flow, shared with the welcome screen
        var openBtn = util.$('[data-import-open]', root);
        if (openBtn) {
          openBtn.addEventListener('click', function () {
            M.app.openImport();
          });
        }

        util.$$('[data-clear]', root).forEach(function (btn) {
          btn.addEventListener('click', function () {
            M.ui
              .confirm({
                title: 'پاک‌کردن همهٔ داده‌ها؟',
                text:
                  'پروفایل، پیشرفت درس‌ها، نتیجهٔ آزمون‌ها و برنامهٔ مرور حذف می‌شوند. این کار قابل بازگشت نیست. اگر پشتیبان نگرفته‌اید، ابتدا از بخش «دریافت پشتیبان» استفاده کنید.',
                confirmLabel: 'همه را پاک کن',
                cancelLabel: 'انصراف',
                danger: true
              })
              .then(function (ok) {
                if (!ok) return;
                M.store.clearUserData(false).then(function () {
                  M.ui.toast('داده‌های کاربر پاک شد.', { type: 'ok' });
                  M.router.go('#/welcome');
                });
              });
          });
        });

        util.$$('[data-recheck]', root).forEach(function (btn) {
          btn.addEventListener('click', function () {
            btn.disabled = true;
            M.storage.recheck().then(function () {
              M.router.refresh();
              M.ui.toast(
                M.storage.status().ok
                  ? 'ذخیره‌سازی بررسی شد: ' + M.storage.label() + ' فعال است.'
                  : 'ذخیره‌سازی دائمی در دسترس نیست.',
                { type: M.storage.status().ok ? 'ok' : 'warn' }
              );
            });
          });
        });
      }
    };
  };

  /* ---- about ------------------------------------------------------------ */
  views.about = function () {
    var html =
      M.ui.pageHead({
        eyebrow: 'درباره',
        title: 'دربارهٔ مهراز',
        sub: 'مهراز یک وب‌سایت آموزشی آفلاین است؛ بدون حساب کاربری، بدون تبلیغ و بدون ارسال اطلاعات شما به بیرون.'
      }) +
      '<section class="section"><div class="creator-card">' +
      '<div class="avatar avatar--lg" aria-hidden="true">' +
      esc('ا') +
      '</div>' +
      '<div style="min-width:0;flex:1 1 220px">' +
      '<div class="card__title" style="font-size:var(--fs-16)">آمین</div>' +
      '<div class="card__text">سازندهٔ مهراز</div>' +
      '</div>' +
      '<div class="creator-links">' +
      '<a class="linkbtn" href="https://t.me/Mozrd" target="_blank" rel="noopener noreferrer">' +
      M.icon('telegram', 18) +
      '<span>تلگرام: <span dir="ltr">@Mozrd</span></span></a>' +
      '<a class="linkbtn" href="https://rubika.ir/angosht0" target="_blank" rel="noopener noreferrer">' +
      M.icon('rubika', 18) +
      '<span>روبیکا: <span dir="ltr">@angosht0</span></span></a>' +
      '</div>' +
      '</div>' +
      '<p class="hint" style="margin-top:10px">این اطلاعات فقط در همین صفحه نمایش داده می‌شود. پیوندها تنها با انتخاب شما باز می‌شوند و برای کار با برنامه نیازی به اینترنت نیست.</p>' +
      '</section>' +
      '<section class="section">' +
      M.ui.sectionHead('اصول مهراز') +
      '<div class="grid grid--two">' +
      '<div class="card card--pad"><div class="card__head"><span class="card__icon">' +
      M.icon('lock', 18) +
      '</span><div class="card__title">حریم خصوصی</div></div><p class="card__text">همهٔ اطلاعات در حافظهٔ مرورگر شما می‌ماند. هیچ درخواست شبکه‌ای، تحلیلی یا تبلیغاتی وجود ندارد.</p></div>' +
      '<div class="card card--pad"><div class="card__head"><span class="card__icon">' +
      M.icon('book', 18) +
      '</span><div class="card__title">منبع‌محور</div></div><p class="card__text">هر محتوای آموزشی در نسخهٔ بعدی به کتاب رسمی و شمارهٔ صفحه ارجاع داده می‌شود.</p></div>' +
      '<div class="card card--pad"><div class="card__head"><span class="card__icon">' +
      M.icon('shield', 18) +
      '</span><div class="card__title">بدون حساب کاربری</div></div><p class="card__text">ورود، رمز عبور و پروفایل آنلاین وجود ندارد. پشتیبان‌گیری با فایل JSON در اختیار شماست.</p></div>' +
      '<div class="card card--pad"><div class="card__head"><span class="card__icon">' +
      M.icon('database', 18) +
      '</span><div class="card__title">داده در اختیار شما</div></div><p class="card__text">هر زمان می‌توانید پشتیبان بگیرید، بازیابی کنید یا همهٔ داده‌ها را پاک کنید.</p></div>' +
      '</div></section>' +
      '<section class="section"><div class="card card--pad">' +
      '<div class="summary-list">' +
      '<div class="summary-row"><span class="summary-row__label">نسخهٔ برنامه</span><span class="summary-row__value num">' +
      util.toFa(M.version) +
      '</span></div>' +
      '<div class="summary-row"><span class="summary-row__label">نسخهٔ داده</span><span class="summary-row__value num">' +
      util.toFa(M.schemaVersion) +
      '</span></div>' +
      '<div class="summary-row"><span class="summary-row__label">حالت اجرا</span><span class="summary-row__value">' +
      (util.isFileProtocol() ? 'فایل محلی (file://)' : 'مرورگر') +
      '</span></div>' +
      '</div></div></section>';

    return { title: 'درباره', nav: '', html: html };
  };
})(window, document);
