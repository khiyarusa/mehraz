/* ==========================================================================
   MEHRAZ — dashboard
   Every number on this page is derived from stored data. When there is no
   data, the student sees an explanatory empty state, never a fake figure.
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

  function firstAvailableLesson() {
    var profile = M.store.profile();
    var index = M.content.lessonIndex();
    var forGrade = index.filter(function (row) {
      return row.book.grade === profile.grade;
    });
    return forGrade[0] || null;
  }

  function lessonCard() {
    var row = lastLesson();
    var isResume = !!row;
    if (!row) row = firstAvailableLesson();
    if (!row) {
      return M.ui.empty({
        icon: 'book',
        title: 'هنوز درسی برای مطالعه نیست',
        text: 'کتاب‌های پایهٔ شما پس از اعتبارسنجی منابع رسمی افزوده می‌شوند. تا آن زمان می‌توانید کتابخانه را ببینید و پروفایل خود را کامل کنید.',
        actions:
          '<a class="btn btn--ghost btn--sm" href="#/library">مشاهدهٔ کتابخانه</a>' +
          '<a class="btn btn--quiet btn--sm" href="#/settings">تنظیمات</a>'
      });
    }
    return (
      '<div class="card card--pad">' +
      '<div class="card__head">' +
      '<span class="card__icon">' +
      M.icon('book', 19) +
      '</span>' +
      '<div style="min-width:0">' +
      '<div class="card__title truncate">' +
      esc(row.lesson.title) +
      '</div>' +
      '<div class="card__text">' +
      esc(row.book.subject ? row.book.subject.title : row.book.title) +
      ' — ' +
      esc(row.chapter.title) +
      '</div>' +
      '</div>' +
      '<span class="chip ' +
      (isResume ? 'chip--brand' : 'chip--outline') +
      '" style="margin-inline-start:auto">' +
      (isResume ? 'در حال مطالعه' : 'پیشنهاد شروع') +
      '</span>' +
      '</div>' +
      '<div class="row" style="margin-top:14px">' +
      '<a class="btn btn--primary btn--sm" href="' +
      row.route +
      '">' +
      (isResume ? 'ادامهٔ درس' : 'شروع درس') +
      M.icon('arrowStart', 15) +
      '</a>' +
      '<span class="hint">' +
      (row.lesson.minutes ? util.toFa(row.lesson.minutes) + ' دقیقه مطالعه' : 'زمان مطالعه ثبت نشده') +
      '</span>' +
      '</div>' +
      '</div>'
    );
  }

  function subjectCards() {
    var profile = M.store.profile();
    var track = profile.grade >= 10 ? profile.track : null;
    var subjects = M.content.subjectsFor(profile.grade, track);
    if (!subjects.length) {
      return M.ui.empty({
        icon: 'library',
        title: 'کتابخانهٔ این پایه خالی است',
        text:
          'برای پایهٔ ' +
          M.content.gradeLabel(profile.grade) +
          (track ? ' رشتهٔ ' + M.content.trackLabel(track) : '') +
          ' هنوز کتابی ثبت نشده است. ساختار کتابخانه آماده است و کتاب‌های رسمی پس از اعتبارسنجی به آن افزوده می‌شوند.',
        actions: '<a class="btn btn--ghost btn--sm" href="#/library">ساختار کتابخانه</a>'
      });
    }
    return (
      '<div class="grid grid--subjects stagger">' +
      subjects
        .map(function (s) {
          var pct = s.lessonCount ? (s.doneCount / s.lessonCount) * 100 : 0;
          return (
            '<a class="subjectcard" href="#/subject/' +
            encodeURIComponent(s.id) +
            '">' +
            '<div class="subjectcard__top">' +
            '<span class="card__icon">' +
            M.icon('book', 18) +
            '</span>' +
            '<div style="min-width:0">' +
            '<div class="subjectcard__title truncate">' +
            esc(s.title) +
            '</div>' +
            '<div class="subjectcard__meta">' +
            util.toFa(s.lessonCount) +
            ' درس' +
            (s.demo ? ' • نمونهٔ ساختاری' : '') +
            '</div>' +
            '</div>' +
            '</div>' +
            '<span class="sr-only">پیشرفت ' + util.fmtPct(pct) + '</span>' + M.ui.progress(pct, { size: 'sm', decorative: true }) +
            '</a>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function reviewBlock() {
    var due = M.store.dueReviewItems().slice(0, 3);
    if (!due.length) {
      return M.ui.empty({
        icon: 'review',
        compact: true,
        title: 'مروری در انتظار نیست',
        text: 'پس از مطالعهٔ درس‌ها و ثبت پاسخ‌های آزمون، مرورهای بعدی همین‌جا فهرست می‌شوند.'
      });
    }
    return (
      '<div class="stack stack--sm">' +
      due
        .map(function (item) {
          var row = item.lessonId ? M.content.findLessonById(item.lessonId) : null;
          return (
            '<div class="card card--pad" style="padding:12px 14px">' +
            '<div class="row">' +
            '<span class="card__icon" style="width:32px;height:32px;border-radius:9px">' +
            M.icon('clock', 16) +
            '</span>' +
            '<div style="min-width:0">' +
            '<div class="card__title truncate" style="font-size:var(--fs-13)">' +
            esc(row ? row.lesson.title : 'مرور برنامه‌ریزی‌شده') +
            '</div>' +
            '<div class="card__text">' +
(item.dueAt ? 'موعد: ' + esc(M.jalali.formatISO(new Date(item.dueAt).getTime())) : 'بدون تاریخ') +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>'
          );
        })
        .join('') +
      '<a class="btn btn--ghost btn--sm" href="#/review">همهٔ مرورها</a>' +
      '</div>'
    );
  }

  function examBlock() {
    var attempts = M.store
      .attempts()
      .slice()
      .sort(function (a, b) {
        return new Date(b.finishedAt || b.startedAt || 0) - new Date(a.finishedAt || a.startedAt || 0);
      })
      .slice(0, 3);
    if (!attempts.length) {
      return M.ui.empty({
        icon: 'exam',
        compact: true,
        title: 'هنوز آزمونی ثبت نشده',
        text: 'نتیجهٔ آزمون‌های شما پس از شرکت در آن‌ها همین‌جا نمایش داده می‌شود.',
        actions: '<a class="btn btn--ghost btn--sm" href="#/exam">صفحهٔ آزمون‌ها</a>'
      });
    }
    return (
      '<div class="tablewrap"><table class="table"><thead><tr>' +
      '<th>آزمون</th><th class="num">نتیجه</th><th>زمان</th></tr></thead><tbody>' +
      attempts
        .map(function (a) {
          var found = M.content.exam(a.examId);
          var title = found ? found.exam.title : a.title || 'آزمون';
          var pct = a.total ? (a.score / a.total) * 100 : 0;
          return (
            '<tr><td>' +
            esc(title) +
            '</td><td class="num">' +
            util.toFa(a.score) +
            '/' +
            util.toFa(a.total) +
            ' <span class="chip ' +
            (pct >= 50 ? 'chip--ok' : 'chip--danger') +
            '">' +
            util.fmtPct(pct) +
            '</span></td><td class="muted">' +
            esc(util.relTime(a.finishedAt || a.startedAt)) +
            '</td></tr>'
          );
        })
        .join('') +
      '</tbody></table></div>'
    );
  }

  function profileCard() {
    var p = M.store.profile();
    var age = p.birthDate ? M.jalali.ageYears(p.birthDate.jy, p.birthDate.jm, p.birthDate.jd) : null;
    return (
      '<div class="card card--pad">' +
      '<div class="row" style="gap:12px">' +
      M.ui.avatar(p.displayName, 'lg') +
      '<div style="min-width:0">' +
      '<div class="card__title truncate">' +
      esc(p.displayName) +
      '</div>' +
      '<div class="card__text">' +
      'پایهٔ ' +
      esc(M.content.gradeLabel(p.grade)) +
      (p.track ? ' • ' + esc(M.content.trackLabel(p.track)) : '') +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="summary-list" style="margin-top:14px">' +
      '<div class="summary-row"><span class="summary-row__label">تاریخ تولد</span><span class="summary-row__value">' +
      esc(p.birthDate ? M.jalali.format(p.birthDate.jy, p.birthDate.jm, p.birthDate.jd) : '—') +
      '</span></div>' +
      (age !== null
        ? '<div class="summary-row"><span class="summary-row__label">سن</span><span class="summary-row__value">' +
          util.toFa(age) +
          ' سال</span></div>'
        : '') +
      '</div>' +
      '<a class="btn btn--ghost btn--sm btn--block" href="#/profile/edit" style="margin-top:12px">' +
      M.icon('edit', 15) +
      'ویرایش پروفایل</a>' +
      '</div>'
    );
  }

  function storageLine() {
    var st = M.storage.status();
    var ok = st.ok;
    return (
      '<div class="row" style="gap:8px;font-size:var(--fs-11);color:var(--txt-muted)">' +
      '<span class="dot ' +
      (ok ? 'dot--ok' : 'dot--warn') +
      '"></span>' +
      '<span>' +
      (ok
        ? 'ذخیره‌سازی محلی فعال است (' + esc(M.storage.label()) + ')'
        : 'ذخیره‌سازی دائمی در دسترس نیست') +
      '</span>' +
      '</div>'
    );
  }

  views.dashboard = function () {
    var p = M.store.profile();
    var lessonsTotal = M.content.lessonCount();
    var stats = M.store.stats(lessonsTotal);
    var today = M.jalali.today();
    var week = M.store.weekActivity();

    var hero =
      '<section class="hero">' +
      '<svg class="hero__arcs" viewBox="0 0 400 400" fill="none" aria-hidden="true">' +
      '<circle cx="220" cy="200" r="150" stroke="rgba(255,255,255,.14)" stroke-width="1"/>' +
      '<circle cx="220" cy="200" r="112" stroke="rgba(255,255,255,.1)" stroke-width="1"/>' +
      '<path d="M150 300V196l70-40 70 40v104" stroke="rgba(255,255,255,.16)" stroke-width="1.3"/>' +
      '</svg>' +
      '<div class="hero__body">' +
      '<div class="hero__text">' +
      '<div class="hero__greet">' +
      M.icon('calendar', 14) +
      '<span>' +
      esc(M.jalali.format(today.jy, today.jm, today.jd, { weekday: true })) +
      '</span>' +
      '</div>' +
      '<h1>' +
      esc(greeting()) +
      '، ' +
      esc(p.displayName) +
      '</h1>' +
      '<p class="hero__sub">' +
      (stats.lessonsDone
        ? 'تا اینجا ' + util.toFa(stats.lessonsDone) + ' درس را کامل کرده‌اید. ادامه بدهید؛ هر قدم کوچک ثبت می‌شود.'
        : 'مسیر یادگیری شما آماده است. با انتخاب یک درس از کتابخانه شروع کنید؛ پیشرفت‌تان به‌صورت خودکار ذخیره می‌شود.') +
      '</p>' +
      '<div class="hero__meta">' +
      '<span class="chip">پایهٔ ' + esc(M.content.gradeLabel(p.grade)) + '</span>' +
      (p.track ? '<span class="chip">' + esc(M.content.trackLabel(p.track)) + '</span>' : '') +
      '<span class="chip">' +
      (lessonsTotal
        ? util.toFa(lessonsTotal) + ' درس در کتابخانه'
        : 'کتابخانه در حال آماده‌سازی') +
      '</span>' +
      '</div>' +
      '</div>' +
      '<div class="hero__aside">' +
      '<div class="hero__progress">' +
      '<div class="hero__progress-label"><span>پیشرفت کلی</span><b>' +
      util.fmtPct(stats.lessonPercent) +
      '</b></div>' +
      M.ui.progress(stats.lessonPercent, { onDark: true, size: 'sm', aria: 'پیشرفت کلی' }) +
      '<div class="hint" style="color:rgba(255,255,255,.78);margin-top:8px">' +
      util.toFa(stats.lessonsDone) +
      ' از ' +
      util.toFa(stats.lessonsTotal || 0) +
      ' درس' +
      '</div>' +
      '</div>' +
      '<a class="btn btn--primary btn--block" href="' +
      (lastLesson() || firstAvailableLesson()
        ? (lastLesson() || firstAvailableLesson()).route
        : '#/library') +
      '">' +
      (lastLesson() ? 'ادامهٔ یادگیری' : 'شروع از کتابخانه') +
      M.icon('arrowStart', 17) +
      '</a>' +
      '</div>' +
      '</div>' +
      '</section>';

    var statsRow =
      '<div class="grid grid--stats stagger">' +
      M.ui.stat({
        icon: 'check',
        label: 'درس‌های تکمیل‌شده',
        value: util.toFa(stats.lessonsDone),
        foot: stats.lessonsTotal ? 'از ' + util.toFa(stats.lessonsTotal) + ' درس' : 'هنوز درسی ثبت نشده'
      }) +
      M.ui.stat({
        icon: 'exam',
        label: 'آزمون‌های انجام‌شده',
        value: util.toFa(stats.examsTaken),
        foot: stats.examsTaken ? 'میانگین ' + util.fmtPct(stats.averagePercent) : 'بدون آزمون'
      }) +
      M.ui.stat({
        icon: 'target',
        label: 'میانگین نتایج',
        value: stats.examsTaken ? util.fmtPct(stats.averagePercent) : '—',
        foot: stats.examsTaken ? 'بر پایهٔ ' + util.toFa(stats.examsTaken) + ' آزمون' : 'پس از نخستین آزمون'
      }) +
      M.ui.stat({
        icon: 'review',
        label: 'مرور در انتظار',
        value: util.toFa(stats.reviewDue),
        foot: stats.reviewTotal ? 'از ' + util.toFa(stats.reviewTotal) + ' مرور' : 'برنامهٔ مرور خالی است'
      }) +
      '</div>';

    var html =
      hero +
      statsRow +
      '<div class="split">' +
      '<div class="stack" style="gap:22px">' +
      '<section class="section">' +
      M.ui.sectionHead('ادامهٔ یادگیری', { href: '#/library', label: 'کتابخانه' }) +
      lessonCard() +
      '</section>' +
      '<section class="section">' +
      M.ui.sectionHead('درس‌های من', { href: '#/library', label: 'همهٔ پایه‌ها' }) +
      subjectCards() +
      '</section>' +
      '<section class="section">' +
      M.ui.sectionHead('آزمون‌های اخیر', { href: '#/exam', label: 'همهٔ آزمون‌ها' }) +
      examBlock() +
      '</section>' +
      '</div>' +
      '<div class="stack" style="gap:18px">' +
      profileCard() +
      '<section class="section"><div class="card card--pad">' +
      '<div class="card__head"><span class="card__icon">' +
      M.icon('progress', 18) +
      '</span><div class="card__title">فعالیت این هفته</div></div>' +
      M.ui.weekChart(week) +
      '</div></section>' +
      '<section class="section">' +
      M.ui.sectionHead('مرور', { href: '#/review', label: 'برنامهٔ مرور' }) +
      reviewBlock() +
      '</section>' +
      '<div class="card card--pad card--flat">' +
      storageLine() +
      '</div>' +
      '</div>' +
      '</div>';

    return {
      title: 'داشبورد',
      nav: 'dashboard',
      html: html,
      onMount: function (root) {
        M.ui.animateProgress(root);
      }
    };
  };
})(window);
