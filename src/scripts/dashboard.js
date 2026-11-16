/* ==========================================================================
   MEHRAZ — dashboard
   A composition, not a grid of boxes: hero + identity, a single stat band,
   one continuing thread, the subjects themselves, then history.
   Every number is derived from stored data; empty means empty.
   ========================================================================== */
(function (window) {
  'use strict';

  var M = window.MEHRAZ;
  var util = M.util;
  var esc = util.esc;
  var views = (M.views = M.views || {});

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return 'صبح بخیر';
    if (h < 17) return 'ظهر بخیر';
    if (h < 20) return 'عصر بخیر';
    return 'شب بخیر';
  }

  function lastLesson() {
    var lessons = M.store.state.progress.lessons;
    var rows = Object.keys(lessons)
      .map(function (id) {
        return { id: id, st: lessons[id] };
      })
      .filter(function (row) {
        return row.st && row.st.status !== 'done';
      })
      .sort(function (a, b) {
        return new Date(b.st.lastOpenedAt || b.st.openedAt || 0) - new Date(a.st.lastOpenedAt || a.st.openedAt || 0);
      });
    for (var i = 0; i < rows.length; i += 1) {
      var found = M.content.findLessonById(rows[i].id);
      if (found) return found;
    }
    return null;
  }

  function firstLesson() {
    var profile = M.store.profile();
    var track = profile.grade >= 10 ? profile.track : null;
    var index = M.content.lessonIndex();
    return (
      index.filter(function (row) {
        if (row.book.grade !== profile.grade) return false;
        if (track && row.book.track && row.book.track !== track) return false;
        return true;
      })[0] || null
    );
  }

  /* ---- hero ------------------------------------------------------------- */
  function hero(stats, next) {
    var p = M.store.profile();
    var today = M.jalali.today();
    var ctaHref = next ? next.route : '#/library';
    return (
      '<section class="hero">' +
      '<div class="hero__body">' +
      '<div class="hero__text">' +
      '<div class="hero__greet"><span class="dot"></span><span>' +
      esc(M.jalali.format(today.jy, today.jm, today.jd, { weekday: true })) +
      '</span></div>' +
      '<h1>' + esc(greeting()) + '، ' + esc(p.displayName) + '</h1>' +
      '<p class="hero__sub">' +
      (M.content.lessonCount() === 0
        ? 'کتابخانهٔ پایهٔ شما در حال آماده‌شدن است. تا آن زمان پایه‌های دیگر را ببینید و پروفایل خود را کامل کنید.'
        : stats.lessonsDone
        ? 'مسیر شما در جریان است. آخرین قدم ثبت شدهاند و ادامهٔ همین مسیر، کوتاه راه است.'
        : 'یک درس بردارید و از همانجا شروع کنید؛ هرچه بخوانید، در همین مسیر می.') +
      '</p>' +
      '<div class="hero__meta">' +
      '<span class="chip chip--glass">پایهٔ ' + esc(M.content.gradeLabel(p.grade)) + '</span>' +
      (p.track ? '<span class="chip chip--glass">' + esc(M.content.trackLabel(p.track)) + '</span>' : '') +
      '<span class="chip chip--glass">' +
      (M.content.lessonCount() ? util.toFa(M.content.lessonCount()) + ' درس در دسترس' : 'کتابخانه در راه است') +
      '</span></div>' +
      '<div class="hero__actions">' +
      '<a class="btn btn--primary btn--lg" href="' + ctaHref + '">' +
      (next ? (next.st && next.st.status === 'in-progress' ? 'ادامهٔ یادگیری' : 'شروع یادگیری') : 'ورود به کتابخانه') +
      M.icon('arrowStart', 18) + '</a>' +
      '<a class="btn btn--ghost btn--lg hero__ghost" href="#/progress">مسیر من</a>' +
      '</div>' +
      '</div>' +
      '<div class="hero__art">' + M.art.orbit({ pct: stats.lessonPercent }) +
      '<div class="hero__badge"><span>پیشرفت کلی</span><b>' + util.fmtPct(stats.lessonPercent) + '</b></div>' +
      '</div>' +
      '</div></section>'
    );
  }

  /* ---- continue --------------------------------------------------------- */
  function continueBlock(next) {
    if (!next) {
      return M.ui.empty({
        icon: 'book',
        title: 'هنوز درسی برای مطالعه نیست',
        text: 'کتاب این پایه هنوز به کتابخانه اضافه نشدهاند. می پایههای دیگر را ببینید یا پروفایل خود را کامل کنید.',
        actions: '<a class="btn btn--ghost btn--sm" href="#/library?scope=all">همهٔ پایهها</a>'
      });
    }
    var done = M.store.isLessonDone(next.lesson.id);
    var pct = done ? 100 : 0;
    return (
      '<a class="continue-card" href="' + next.route + '">' +
      '<span class="continue-card__art">' + M.icon('book', 28) + '</span>' +
      '<span class="continue-card__body">' +
      '<span class="chip chip--brand" style="margin-bottom:8px">' + (done ? 'درس خواندهشده' : 'ادامه از همینجا') + '</span>' +
      '<span class="continue-card__title truncate">' + esc(next.lesson.title) + '</span>' +
      '<span class="continue-card__meta">' +
      esc(next.book.title) + ' • ' + esc(next.chapter.title) +
      (next.lesson.minutes ? ' • ' + util.toFa(next.lesson.minutes) + ' دقیقه' : '') +
      '</span></span>' +
      M.art.ring(pct, { size: 74, stroke: 7, caption: 'درس' }) +
      M.icon('chevronEnd', 20) +
      '</a>'
    );
  }

  /* ---- subjects --------------------------------------------------------- */
  function subjects() {
    var p = M.store.profile();
    var track = p.grade >= 10 ? p.track : null;
    var list = M.content.subjectsFor(p.grade, track);

    if (!list.length) {
      return M.ui.empty({
        icon: 'library',
        title: 'کتابخانهٔ این پایه خالی است',
        text: 'برای پایهٔ ' + M.content.gradeLabel(p.grade) +
          (track ? ' رشتهٔ ' + M.content.trackLabel(track) : '') +
          ' هنوز کتابی ثبت نشده است. کتاب‌های رسمی همین پایه به‌زودی اضافه می‌شوند.',
        actions: '<a class="btn btn--ghost btn--sm" href="#/library?scope=all">دیدن همهٔ پایه‌ها</a>'
      });
    }

    return (
      '<div class="grid grid--subjects stagger">' +
      list.map(function (s) {
        var pct = s.lessonCount ? (s.doneCount / s.lessonCount) * 100 : 0;
        return (
          '<a class="subjectcard" href="#/subject/' + encodeURIComponent(s.id) + '">' +
          '<div class="subjectcard__top">' + M.art.monogram(s.id, 46) +
          '<div style="min-width:0">' +
          '<div class="subjectcard__title truncate">' + esc(s.title) + '</div>' +
          '<div class="subjectcard__meta">' + util.toFa(s.lessonCount) + ' درس</div></div>' +
          '</div>' +
          '<div>' +
          '<div class="progress__label"><span>پیشرفت</span><b>' + util.fmtPct(pct) + '</b></div>' +
          '<span class="sr-only">پیشرفت ' + util.fmtPct(pct) + '</span>' +
          M.ui.progress(pct, { size: 'sm', decorative: true }) +
          '</div></a>'
        );
      }).join('') +
      '</div>'
    );
  }

  /* ---- activity --------------------------------------------------------- */
  function activity() {
    var week = M.store.weekActivity();
    var total = week.reduce(function (a, d) { return a + d.count; }, 0);
    return (
      '<section class="section"><div class="card card--pad">' +
      '<div class="row" style="margin-bottom:14px">' +
      '<div><div class="card__title">فعالیت هفته</div>' +
      '<div class="hint">' + (total ? util.toFa(total) + ' فعالیت در هفت روز گذشته' : 'هنوز فعالیتی ثبت نشده') + '</div></div>' +
      '<span class="chip chip--outline push">۷ روز</span></div>' +
      M.ui.weekChart(week) +
      '</div></section>'
    );
  }

  /* ---- exams ------------------------------------------------------------ */
  function exams() {
    var attempts = M.store.attempts().slice().sort(function (a, b) {
      return new Date(b.finishedAt || b.startedAt || 0) - new Date(a.finishedAt || a.startedAt || 0);
    }).slice(0, 4);

    if (!attempts.length) {
      return M.ui.empty({
        icon: 'exam',
        compact: true,
        title: 'هنوز آزمونی ثبت نشده',
        text: 'نتیجهٔ آزمون پس از شرکت در آنها همینجا می.',
        actions: '<a class="btn btn--ghost btn--sm" href="#/exam">آزمون</a>'
      });
    }

    return (
      '<div class="stack stack--sm">' +
      attempts.map(function (a) {
        var found = M.content.exam(a.examId);
        var pct = a.total ? (a.score / a.total) * 100 : 0;
        return (
          '<div class="row" style="gap:12px;padding:12px 0;border-block-end:1px solid var(--line-2)">' +
          '<span class="card__icon" style="width:36px;height:36px;border-radius:11px">' + M.icon('exam', 17) + '</span>' +
          '<div style="min-width:0;flex:1 1 auto">' +
          '<div class="card__title truncate" style="font-size:var(--fs-13)">' + esc(found ? found.exam.title : a.title || 'آزمون') + '</div>' +
          '<div class="card__text">' + esc(util.relTime(a.finishedAt || a.startedAt)) + '</div></div>' +
          '<span class="chip ' + (pct >= 50 ? 'chip--ok' : 'chip--danger') + '">' + util.fmtPct(pct) + '</span>' +
          '</div>'
        );
      }).join('') +
      '<a class="btn btn--quiet btn--sm" href="#/exam" style="align-self:flex-start">همهٔ آزمون' + M.icon('chevronEnd', 14) + '</a>' +
      '</div>'
    );
  }

  /* ---- review ----------------------------------------------------------- */
  function review() {
    var due = M.store.dueReviewItems().slice(0, 4);
    if (!due.length) {
      return M.ui.empty({
        icon: 'review',
        compact: true,
        title: 'مروری در انتظار نیست',
        text: 'وقتی مروری برای شما برنامه‌ریزی شود، همین‌جا دیده می‌شود.'
      });
    }
    return (
      '<div class="stack stack--sm">' +
      due.map(function (item) {
        var row = item.lessonId ? M.content.findLessonById(item.lessonId) : null;
        return (
          '<a class="reviewrow reviewrow--due" href="' + (row ? row.route : '#/review') + '">' +
          '<span class="reviewrow__icon">' + M.icon('clock', 17) + '</span>' +
          '<span style="min-width:0;flex:1 1 auto">' +
          '<span class="card__title truncate" style="font-size:var(--fs-13);display:block">' + esc(row ? row.lesson.title : 'مرور برنامهریزیشده') + '</span>' +
          '<span class="card__text">' + (item.dueAt ? esc(M.jalali.formatISO(new Date(item.dueAt).getTime())) : 'امروز') + '</span></span>' +
          M.icon('chevronEnd', 16) + '</a>'
        );
      }).join('') +
      '</div>'
    );
  }

  /* ---- profile ---------------------------------------------------------- */
  function profileCard() {
    var p = M.store.profile();
    var age = p.birthDate ? M.jalali.ageYears(p.birthDate.jy, p.birthDate.jm, p.birthDate.jd) : null;
    return (
      '<button class="card card--pad card--link" type="button" data-go-profile style="text-align:start;width:100%">' +
      '<div class="row" style="gap:13px">' + M.ui.avatar(p.displayName, 'lg') +
      '<div style="min-width:0"><div class="card__title truncate">' + esc(p.displayName) + '</div>' +
      '<div class="card__text">پایهٔ ' + esc(M.content.gradeLabel(p.grade)) +
      (p.track ? ' • ' + esc(M.content.trackLabel(p.track)) : '') + '</div></div>' +
      '<span class="push chip chip--outline">ویرایش</span></div>' +
      '<div class="summary-list summary-list--edit" style="margin-top:14px">' +
      '<div class="summary-row"><span class="summary-row__label">تاریخ تولد</span><span class="summary-row__value">' +
      esc(p.birthDate ? M.jalali.format(p.birthDate.jy, p.birthDate.jm, p.birthDate.jd) : '—') + '</span></div>' +
      (age !== null ? '<div class="summary-row"><span class="summary-row__label">سن</span><span class="summary-row__value">' + util.toFa(age) + ' سال</span></div>' : '') +
      '</div></button>'
    );
  }

  views.dashboard = function () {
    var p = M.store.profile();
    var shelf = M.content.lessonIdsFor(p.grade, p.grade >= 10 ? p.track : null);
    var stats = M.store.stats(shelf);
    var next = lastLesson() || firstLesson();
    if (next) next.st = M.store.state.progress.lessons[next.lesson.id] || { status: 'not-started' };

    var band = M.ui.statBand([
      { icon: 'check', label: 'درس خواندهشده', value: util.toFa(stats.lessonsDone), unit: 'درس', foot: stats.lessonsTotal ? 'از ' + util.toFa(stats.lessonsTotal) + ' درس' : 'کتابخانه خالی است' },
      { icon: 'exam', label: 'آزمون', value: util.toFa(stats.examsTaken), unit: 'آزمون', foot: stats.examsTaken ? 'میانگین ' + util.fmtPct(stats.averagePercent) : 'هنوز آزمونی نداده‌اید' },
      { icon: 'target', label: 'میانگین نتایج', value: stats.examsTaken ? util.fmtPct(stats.averagePercent) : '—', foot: stats.examsTaken ? 'بر پایهٔ ' + util.toFa(stats.examsTaken) + ' آزمون' : 'پس از نخستین آزمون' },
      { icon: 'review', label: 'مرور در انتظار', value: util.toFa(stats.reviewDue), unit: 'مرور', foot: stats.reviewTotal ? 'از ' + util.toFa(stats.reviewTotal) : 'برنامهٔ مرور خالی است' }
    ]);

    var html =
      hero(stats, next) +
      band +
      '<div class="split">' +
      '<div class="stack" style="gap:24px">' +
      '<section class="section">' + M.ui.sectionHead('ادامهٔ یادگیری', { href: '#/library', label: 'کتابخانه' }) + continueBlock(next) + '</section>' +
      '<section class="section">' + M.ui.sectionHead('درس‌های من', { href: '#/library', label: 'همهٔ پایه‌ها' }) + subjects() + '</section>' +
      '<section class="section">' + M.ui.sectionHead('آزمون‌های اخیر', { href: '#/exam', label: 'همه' }) + '<div class="card card--pad">' + exams() + '</div></section>' +
      '</div>' +
      '<aside class="stack" style="gap:18px">' +
      activity() +
      '<section class="section"><div class="card card--pad">' +
      '<div class="row" style="margin-bottom:6px"><div class="card__title">مرور</div>' +
      '<a class="section__link push" href="#/review">برنامه' + M.icon('chevronEnd', 13) + '</a></div>' +
      review() + '</div></section>' +
      profileCard() +
      '</aside>' +
      '</div>';

    return {
      title: 'داشبورد',
      nav: 'dashboard',
      html: html,
      onMount: function (root) {
        M.ui.animateProgress(root);
        var go = util.$('[data-go-profile]', root);
        if (go) go.addEventListener('click', function () { M.router.go('#/profile/edit'); });
      }
    };
  };
})(window);
