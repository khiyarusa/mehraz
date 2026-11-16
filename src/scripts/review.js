/* ==========================================================================
   MEHRAZ — review and progress
   Review items and weak topics are produced from stored answers only.
   Nothing here invents a schedule or a statistic.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var M = window.MEHRAZ;
  var util = M.util;
  var esc = util.esc;
  var views = (M.views = M.views || {});

  function questionIndex() {
    var map = {};
    M.content.exams().forEach(function (row) {
      M.content.questionsFor(row.exam).forEach(function (q) {
        map[q.id] = { question: q, exam: row.exam, book: row.book, chapter: row.chapter };
      });
    });
    return map;
  }

  function weakTopics(qIndex) {
    var map = {};
    M.store.attempts().forEach(function (attempt) {
      (attempt.detail || []).forEach(function (item) {
        var ref = qIndex[item.qid];
        if (!ref) return;
        var key = ref.question.topicId || ref.question.topic || (ref.chapter ? ref.chapter.id : 'general');
        var label =
          ref.question.topic ||
          (ref.chapter
            ? ref.chapter.title
            : ref.book && ref.book.subject
              ? ref.book.subject.title
              : 'موضوع‌های عمومی');
        if (!map[key]) map[key] = { id: key, label: label, wrong: 0, total: 0 };
        map[key].total += 1;
        if (!item.ok) map[key].wrong += 1;
      });
    });
    return Object.keys(map)
      .map(function (k) {
        return map[k];
      })
      .filter(function (t) {
        return t.wrong > 0;
      })
      .sort(function (a, b) {
        return b.wrong - a.wrong;
      });
  }

  function reviewRow(item, isDue) {
    var found = item.lessonId ? M.content.findLessonById(item.lessonId) : null;
    var title = found ? found.lesson.title : item.title || 'مرور برنامه‌ریزی‌شده';
    var meta = found
      ? (found.book.subject ? found.book.subject.title : found.book.title) + ' — ' + found.chapter.title
      : item.note || 'بدون درس مرتبط';
    return (
      '<div class="row row--wrap" style="padding:14px 0;border-block-end:1px solid var(--border)">' +
      '<span class="card__icon" style="width:36px;height:36px;border-radius:10px">' +
      M.icon(isDue ? 'clock' : 'calendar', 17) +
      '</span>' +
      '<div style="min-width:0;flex:1 1 200px">' +
      '<div class="card__title" style="font-size:var(--fs-13)">' +
      esc(title) +
      '</div>' +
      '<div class="card__text">' +
      esc(meta) +
      (item.dueAt ? ' • موعد: ' + esc(M.jalali.formatISO(new Date(item.dueAt).getTime())) : '') +
      '</div>' +
      '</div>' +
      (isDue
        ? '<button class="btn btn--soft btn--sm" type="button" data-review-done="' +
          esc(item.id) +
          '">مرور شد</button>' +
          (found
            ? '<a class="btn btn--quiet btn--sm" href="' + found.route + '">رفتن به درس</a>'
            : '')
        : '<span class="chip">در انتظار</span>') +
      '</div>'
    );
  }

  views.review = function () {
    var items = M.store.reviewItems();
    var due = M.store.dueReviewItems();
    var upcoming = items.filter(function (it) {
      return it.status !== 'done' && due.indexOf(it) === -1;
    });
    var completed = items.filter(function (it) {
      return it.status === 'done';
    });
    var qIndex = questionIndex();
    var weak = weakTopics(qIndex);
    var wrongAnswers = [];
    M.store.attempts().forEach(function (attempt) {
      (attempt.detail || []).forEach(function (item) {
        if (item.ok) return;
        var ref = qIndex[item.qid];
        wrongAnswers.push({
          attempt: attempt,
          item: item,
          question: ref ? ref.question : null,
          exam: ref ? ref.exam : null
        });
      });
    });

    var head = M.ui.pageHead({
      title: 'برنامهٔ مرور',
      sub: 'مرور‌های شما، موضوع‌های نیازمند تمرین و تاریخچهٔ پاسخ‌ها در یک صفحه.'
    });

    var dueBlock = due.length
      ? '<div class="card card--pad">' + due.map(function (it) {
          return reviewRow(it, true);
        }).join('') + '</div>'
      : M.ui.empty({
          icon: 'review',
          title: 'برای امروز مروری نیست',
          text: 'وقتی مروری برای شما برنامه‌ریزی شود، همین‌جا دیده می‌شود.'
        });

    var upcomingBlock = upcoming.length
      ? '<div class="card card--pad">' + upcoming.map(function (it) {
          return reviewRow(it, false);
        }).join('') + '</div>'
      : '<p class="hint">مرور زمان‌بندی‌شده‌ای در انتظار نیست.</p>';

    var weakBlock = weak.length
      ? '<div class="stack stack--sm">' +
        weak
          .map(function (t) {
            var pct = t.total ? (t.wrong / t.total) * 100 : 0;
            return (
              '<div class="card card--pad" style="padding:12px 14px">' +
              '<div class="row"><span class="card__icon" style="width:32px;height:32px;border-radius:9px;background:var(--danger-soft);color:var(--danger)">' +
              M.icon('target', 16) +
              '</span><div style="min-width:0;flex:1 1 auto"><div class="card__title" style="font-size:var(--fs-13)">' +
              esc(t.label) +
              '</div><div class="card__text">' +
              util.toFa(t.wrong) +
              ' پاسخ نادرست از ' +
              util.toFa(t.total) +
              ' پرسش</div></div><span class="chip chip--danger">' +
              util.fmtPct(pct) +
              '</span></div>' +
              '</div>'
            );
          })
          .join('') +
        '</div>'
      : M.ui.empty({
          icon: 'target',
          compact: true,
          title: 'هنوز موضوع ضعیفی شناسایی نشده',
          text: 'پس از شرکت در آزمون‌ها، موضوع‌هایی که پاسخ نادرست بیشتری دارند اینجا فهرست می‌شوند.'
        });

    var wrongBlock = wrongAnswers.length
      ? '<div class="tablewrap"><table class="table"><thead><tr><th>پرسش</th><th>آزمون</th><th>زمان</th></tr></thead><tbody>' +
        wrongAnswers
          .slice(0, 10)
          .map(function (w) {
            return (
              '<tr><td>' +
              esc(w.question ? w.question.prompt : 'پرسش ' + w.item.qid) +
              '</td><td class="muted">' +
              esc(w.exam ? w.exam.title : w.attempt.title || '—') +
              '</td><td class="muted">' +
              esc(util.relTime(w.attempt.finishedAt)) +
              '</td></tr>'
            );
          })
          .join('') +
        '</tbody></table></div>'
      : '<p class="hint">پاسخ نادرستی ثبت نشده است.</p>';

    var html =
      head +
      '<div class="split">' +
      '<div class="stack" style="gap:20px">' +
      '<section class="section">' +
      M.ui.sectionHead('مرورهای امروز') +
      dueBlock +
      '</section>' +
      '<section class="section">' +
      M.ui.sectionHead('تاریخچهٔ پاسخ‌های نادرست') +
      wrongBlock +
      '</section>' +
      '</div>' +
      '<div class="stack" style="gap:20px">' +
      '<section class="section">' +
      M.ui.sectionHead('موضوع‌های نیازمند تمرین') +
      weakBlock +
      '</section>' +
      '<section class="section">' +
      M.ui.sectionHead('مرورهای آینده') +
      upcomingBlock +
      '</section>' +
      '<section class="section">' +
      M.ui.sectionHead('مرورهای انجام‌شده') +
      (completed.length
        ? '<div class="card card--pad">' +
          completed
            .slice(0, 6)
            .map(function (it) {
              return (
                '<div class="row" style="padding:8px 0"><span class="dot dot--ok"></span><span class="truncate">' +
                esc(it.title || 'مرور') +
                '</span><span class="chip chip--outline push">' +
                esc(it.doneAt ? util.relTime(it.doneAt) : 'انجام شد') +
                '</span></div>'
              );
            })
            .join('') +
          '</div>'
        : '<p class="hint">مروری کامل نشده است.</p>') +
      '</section>' +
      '</div>' +
      '</div>';

    return {
      title: 'مرور',
      nav: 'review',
      html: html,
      onMount: function (root) {
        util.$$('[data-review-done]', root).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-review-done');
            M.store.completeReview(id);
            M.store.flush('review.done');
            M.ui.toast('مرور ثبت شد.', { type: 'ok' });
            M.router.refresh();
          });
        });
      }
    };
  };

  /* ---- progress --------------------------------------------------------- */
  views.progress = function () {
    var p = M.store.profile();
    var shelf = M.content.lessonIdsFor(p.grade, p.grade >= 10 ? p.track : null);
    var stats = M.store.stats(shelf);
    var books = M.content.books({});
    var attempts = M.store
      .attempts()
      .slice()
      .sort(function (a, b) {
        return new Date(b.finishedAt || 0) - new Date(a.finishedAt || 0);
      });

    var body;

    if (!stats.lessonsDone && !attempts.length) {
      body = M.ui.empty({
        icon: 'progress',
        title: 'هنوز داده‌ای برای نمایش نیست',
        text: 'پس از مطالعهٔ نخستین درس یا شرکت در یک آزمون، نمودار پیشرفت بر پایهٔ داده‌های واقعی شما ساخته می‌شوند.',
        actions: '<a class="btn btn--primary btn--sm" href="#/library">شروع از کتابخانه</a>'
      });
    } else {
      var bookRows = books
        .map(function (b) {
          var pr = M.content.bookProgress(b);
          return (
            '<div class="row" style="gap:12px;padding:10px 0">' +
            '<div style="min-width:0;flex:1 1 180px"><div class="card__title" style="font-size:var(--fs-13)">' +
            esc(b.title) +
            '</div><div class="card__text">' +
            util.toFa(pr.done) +
            ' از ' +
            util.toFa(pr.total) +
            ' درس</div></div>' +
            '<div style="flex:0 0 40%">' +
            M.ui.progress(pr.percent, { size: 'sm', aria: 'پیشرفت ' + b.title }) +
            '</div>' +
            '<span class="num" style="font-size:var(--fs-12);color:var(--txt-muted);min-width:52px;text-align:end">' +
            util.fmtPct(pr.percent) +
            '</span>' +
            '</div>'
          );
        })
        .join('');

      var historyTable = attempts.length
        ? '<div class="tablewrap"><table class="table"><thead><tr><th>آزمون</th><th class="num">نتیجه</th><th>زمان</th><th></th></tr></thead><tbody>' +
          attempts
            .map(function (a) {
              var found = M.content.exam(a.examId);
              return (
                '<tr><td>' +
                esc(found ? found.exam.title : a.title || 'آزمون') +
                '</td><td class="num">' +
                util.toFa(a.score) +
                '/' +
                util.toFa(a.total) +
                '</td><td class="muted">' +
                esc(M.jalali.formatISO(new Date(a.finishedAt || Date.now()).getTime())) +
                '</td><td><a class="btn btn--quiet btn--sm" href="#/exam/' +
                encodeURIComponent(a.examId) +
                '/result/' +
                encodeURIComponent(a.id) +
                '">مشاهده</a></td></tr>'
              );
            })
            .join('') +
          '</tbody></table></div>'
        : '<p class="hint">آزمونی ثبت نشده است.</p>';

      body =
        '<div class="split">' +
        '<div class="stack" style="gap:20px">' +
        '<section class="section"><div class="card card--pad"><div class="row row--wrap" style="gap:18px">' +
        M.ui.donut(stats.lessonPercent, { size: 110, stroke: 11, caption: 'تکمیل درس‌ها' }) +
        '<div style="flex:1 1 220px">' +
        '<h2 class="card__title" style="font-size:var(--fs-16);margin-bottom:6px">پیشرفت کلی</h2>' +
        '<p class="card__text">' +
        util.toFa(stats.lessonsDone) +
        ' درس از ' +
        util.toFa(stats.lessonsTotal) +
        ' درس کتابخانهٔ شما کامل شده است.' +
        (stats.examsTaken
          ? ' میانگین نتایج آزمون‌ها ' + util.fmtPct(stats.averagePercent) + ' است.'
          : ' هنوز آزمونی ثبت نشده است.') +
        '</p>' +
        '</div></div></div></section>' +
        '<section class="section">' +
        M.ui.sectionHead('پیشرفت کتاب‌ها') +
        '<div class="card card--pad">' +
        bookRows +
        '</div></section>' +
        '<section class="section">' +
        M.ui.sectionHead('تاریخچهٔ آزمون‌ها') +
        historyTable +
        '</section>' +
        '</div>' +
        '<div class="stack" style="gap:20px">' +
        '<section class="section"><div class="card card--pad">' +
        '<div class="card__head"><span class="card__icon">' +
        M.icon('progress', 18) +
        '</span><div class="card__title">فعالیت هفته</div></div>' +
        M.ui.weekChart(M.store.weekActivity()) +
        '</div></section>' +
        '<section class="section"><div class="card card--pad">' +
        '<div class="card__head"><span class="card__icon">' +
        M.icon('clock', 18) +
        '</span><div class="card__title">آخرین فعالیت‌ها</div></div>' +
        (M.store.state.activity.length
          ? '<div class="stack stack--sm">' +
            M.store.state.activity
              .slice(-6)
              .reverse()
              .map(function (a) {
                return (
                  '<div class="row" style="gap:8px;font-size:var(--fs-12);color:var(--txt-muted)"><span class="dot"></span><span>' +
                  esc(activityLabel(a)) +
                  '</span><span class="push hint">' +
                  esc(util.relTime(a.at)) +
                  '</span></div>'
                );
              })
              .join('') +
            '</div>'
          : '<p class="hint">فعالیتی ثبت نشده است.</p>') +
        '</div></section>' +
        '</div></div>';
    }

    return {
      title: 'پیشرفت',
      nav: 'progress',
      html:
        M.ui.pageHead({
          title: 'مسیر من',
          sub: 'هر عدد این صفحه از کار واقعی شما ساخته می‌شود.'
        }) + body,
      onMount: function (root) {
        M.ui.animateProgress(root);
      }
    };
  };

  function activityLabel(a) {
    var labels = {
      'profile.saved': 'اطلاعات پروفایل ذخیره شد',
      'lesson.opened': 'یک درس باز شد',
      'lesson.completed': 'یک درس تکمیل شد',
      'exam.finished': 'یک آزمون ثبت شد',
      'review.done': 'یک مرور انجام شد'
    };
    return labels[a.type] || 'فعالیت یادگیری';
  }
})(window, document);
