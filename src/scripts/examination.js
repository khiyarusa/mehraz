/* ==========================================================================
   MEHRAZ — examination engine
   Four question kinds (single choice, true/false, multiple answer, numeric),
   navigation, submission confirmation, scoring, explanations and review of
   wrong answers. It renders only the questions the catalogue provides.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var M = window.MEHRAZ;
  var util = M.util;
  var esc = util.esc;
  var views = (M.views = M.views || {});

  var TYPE_LABEL = {
    mcq: 'چندگزینه‌ای',
    truefalse: 'درست / نادرست',
    multi: 'چندپاسخی',
    numeric: 'پاسخ عددی'
  };

  function normalizeAnswer(q, value) {
    if (q.type === 'numeric') {
      if (value === '' || value === null || value === undefined) return null;
      var num = Number(util.toEn(String(value)).replace(/[٫،,\s]/g, '.').replace(/\.(?=.*\.)/g, ''));
      return isNaN(num) ? null : num;
    }
    if (q.type === 'multi') return Array.isArray(value) ? value.slice().sort() : [];
    if (value === undefined || value === null || value === '') return null;
    return typeof value === 'string' && q.type === 'mcq' ? Number(value) : value;
  }

  function isAnswered(q, value) {
    if (q.type === 'numeric') return normalizeAnswer(q, value) !== null;
    if (q.type === 'multi') return Array.isArray(value) && value.length > 0;
    return value !== undefined && value !== null && value !== '';
  }

  function isCorrect(q, value) {
    var given = normalizeAnswer(q, value);
    if (given === null) return false;
    if (q.type === 'numeric') {
      var target = Number(q.answer);
      var tol = Number(q.tolerance || 0);
      return Math.abs(given - target) <= tol;
    }
    if (q.type === 'multi') {
      var correct = (q.correct || []).slice().sort();
      if (correct.length !== given.length) return false;
      return correct.every(function (v, i) {
        return String(v) === String(given[i]);
      });
    }
    if (q.type === 'truefalse') return String(given) === String(q.correct);
    var single = Array.isArray(q.correct) ? q.correct[0] : q.correct;
    return String(given) === String(single);
  }

  function optionLabel(i) {
    var letters = ['الف', 'ب', 'ج', 'د', 'ه', 'و'];
    return letters[i] || util.toFa(i + 1);
  }

  /* ---- list ------------------------------------------------------------- */
  views.examList = function () {
    var rows = M.content.exams();
    var attempts = M.store
      .attempts()
      .slice()
      .sort(function (a, b) {
        return new Date(b.finishedAt || 0) - new Date(a.finishedAt || 0);
      });

    var head = M.ui.pageHead({
      eyebrow: 'آزمون',
      title: 'آزمون و سنجش',
      sub: 'پس از افزودن محتوای درسی، آزمون‌های هر فصل در این بخش فهرست می‌شوند. نتیجه و پاسخ‌ها روی همین دستگاه ذخیره می‌شود.'
    });

    var list;
    if (!rows.length) {
      list = M.ui.empty({
        icon: 'exam',
        title: 'هنوز آزمونی تعریف نشده است',
        text: 'موتور آزمون آماده است و چهار نوع پرسش را پشتیبانی می‌کند: چندگزینه‌ای، درست/نادرست، چندپاسخی و پاسخ عددی. پرسش‌ها همراه محتوای رسمی افزوده می‌شوند.',
        actions: '<a class="btn btn--ghost btn--sm" href="#/library">کتابخانهٔ درسی</a>'
      });
    } else {
      list =
        '<div class="stack">' +
        rows
          .map(function (row) {
            var qs = M.content.questionsFor(row.exam);
            var best = attempts
              .filter(function (a) {
                return a.examId === row.exam.id;
              })
              .reduce(function (acc, a) {
                var pct = a.total ? (a.score / a.total) * 100 : 0;
                return Math.max(acc, pct);
              }, 0);
            return (
              '<a class="card card--pad card--link" href="#/exam/' +
              encodeURIComponent(row.exam.id) +
              '"><div class="row row--wrap"><span class="card__icon">' +
              M.icon('exam', 18) +
              '</span><div style="min-width:0;flex:1 1 220px"><div class="card__title">' +
              esc(row.exam.title) +
              '</div><div class="card__text">' +
              esc((row.book.subject && row.book.subject.title) || row.book.title) +
              (row.chapter ? ' • ' + esc(row.chapter.title) : '') +
              ' • ' +
              util.toFa(qs.length) +
              ' پرسش</div></div>' +
              (best ? '<span class="chip chip--brand">بهترین: ' + util.fmtPct(best) + '</span>' : '<span class="chip">شروع‌نشده</span>') +
              M.icon('chevronEnd', 18) +
              '</div></a>'
            );
          })
          .join('') +
        '</div>';
    }

    var history = attempts.length
      ? '<section class="section">' +
        M.ui.sectionHead('تاریخچهٔ آزمون‌ها') +
        '<div class="tablewrap"><table class="table"><thead><tr><th>آزمون</th><th class="num">نتیجه</th><th>زمان</th><th></th></tr></thead><tbody>' +
        attempts
          .slice(0, 12)
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
              esc(util.relTime(a.finishedAt)) +
              '</td><td><a class="btn btn--quiet btn--sm" href="#/exam/' +
              encodeURIComponent(a.examId) +
              '/result/' +
              encodeURIComponent(a.id) +
              '">نتیجه</a></td></tr>'
            );
          })
          .join('') +
        '</tbody></table></div></section>'
      : '';

    return {
      title: 'آزمون',
      nav: 'exam',
      html: head + '<section class="section">' + list + '</section>' + history
    };
  };

  /* ---- runner ----------------------------------------------------------- */
  views.examRun = function (params) {
    var found = M.content.exam(params.examId);
    if (!found) {
      return {
        title: 'آزمون',
        nav: 'exam',
        html: M.ui.empty({
          icon: 'exam',
          title: 'آزمون یافت نشد',
          text: 'این آزمون در محتوای فعلی وجود ندارد.',
          actions: '<a class="btn btn--primary" href="#/exam">فهرست آزمون‌ها</a>'
        })
      };
    }

    var exam = found.exam;
    var questions = M.content.questionsFor(exam);
    if (!questions.length) {
      return {
        title: exam.title,
        nav: 'exam',
        html: M.ui.empty({
          icon: 'exam',
          title: 'پرسشی برای این آزمون ثبت نشده',
          text: 'ساختار آزمون آماده است اما پرسش‌های آن هنوز افزوده نشده‌اند.'
        })
      };
    }

    var head =
      '<div class="page-head">' +
      '<div class="page-head__text">' +
      '<div class="breadcrumb"><a href="#/exam">آزمون‌ها</a><span class="breadcrumb__sep">/</span><span>' +
      esc(exam.title) +
      '</span></div>' +
      '<h1 style="margin-top:6px">' +
      esc(exam.title) +
      '</h1>' +
      '<p>' +
      esc((found.book.subject && found.book.subject.title) || found.book.title) +
      (found.chapter ? ' • ' + esc(found.chapter.title) : '') +
      ' • ' +
      util.toFa(questions.length) +
      ' پرسش</p>' +
      '</div></div>' +
      '<div class="card card--pad" data-run-shell>' +
      '<div class="row" style="margin-bottom:12px">' +
      '<span class="chip chip--brand" data-q-counter></span>' +
      '<span class="chip" data-answered-counter></span>' +
      '<span class="chip chip--outline push" data-timer>۰۰:۰۰</span>' +
      '</div>' +
      '<div data-progress-slot></div>' +
      '<div data-question-slot style="margin-top:16px"></div>' +
      '<div class="row row--wrap" style="margin-top:18px;gap:8px">' +
      '<button class="btn btn--ghost btn--sm" type="button" data-prev>قبلی</button>' +
      '<button class="btn btn--soft btn--sm" type="button" data-next>بعدی</button>' +
      '<button class="btn btn--primary btn--sm push" type="button" data-submit>پایان آزمون</button>' +
      '</div>' +
      '</div>' +
      '<div class="card card--pad" data-nav-shell style="margin-top:14px">' +
      '<div class="card__head"><span class="card__icon">' +
      M.icon('layers', 17) +
      '</span><div class="card__title">پیمایش پرسش‌ها</div></div>' +
      '<div class="qnav" data-qnav></div>' +
      '</div>';

    return {
      title: exam.title,
      nav: 'exam',
      html: head,
      onMount: function (root) {
        startRunner(root, exam, questions);
      }
    };
  };

  function startRunner(root, exam, questions) {
    var answers = {};
    var index = 0;
    var startedAt = Date.now();
    var finished = false;

    var qSlot = util.$('[data-question-slot]', root);
    var navSlot = util.$('[data-qnav]', root);
    var counter = util.$('[data-q-counter]', root);
    var answeredCounter = util.$('[data-answered-counter]', root);
    var progressSlot = util.$('[data-progress-slot]', root);
    var timerEl = util.$('[data-timer]', root);

    var timer = window.setInterval(function () {
      if (finished) return;
      var s = Math.floor((Date.now() - startedAt) / 1000);
      var mm = String(Math.floor(s / 60)).padStart(2, '0');
      var ss = String(s % 60).padStart(2, '0');
      if (timerEl) timerEl.textContent = util.toFa(mm + ':' + ss);
    }, 1000);

    function answeredCount() {
      return questions.filter(function (q) {
        return isAnswered(q, answers[q.id]);
      }).length;
    }

    function renderQuestion() {
      var q = questions[index];
      var value = answers[q.id];
      var body = '';

      if (q.type === 'numeric') {
        body =
          '<div class="field" style="max-width:280px">' +
          '<label class="label" for="q-num">پاسخ خود را وارد کنید' +
          (q.unit ? ' <span class="hint">(' + esc(q.unit) + ')</span>' : '') +
          '</label>' +
          '<input class="input" id="q-num" type="text" inputmode="decimal" autocomplete="off" value="' +
          esc(value === undefined || value === null ? '' : util.toFa(value)) +
          '" placeholder="عدد">' +
          '</div>';
      } else {
        var options =
          q.type === 'truefalse'
            ? [
                { value: 'true', label: 'درست' },
                { value: 'false', label: 'نادرست' }
              ]
            : (q.options || []).map(function (opt, i) {
                return { value: i, label: opt };
              });
        body =
          '<div class="optionlist" role="group" aria-label="گزینه‌ها">' +
          options
            .map(function (opt, i) {
              var selected;
              if (q.type === 'multi') {
                selected = Array.isArray(value) && value.indexOf(opt.value) !== -1;
              } else {
                selected = String(value) === String(opt.value);
              }
              return (
                '<button class="option' +
                (q.type === 'multi' ? ' option--multi' : '') +
                (selected ? ' is-selected' : '') +
                '" type="button" data-opt="' +
                esc(opt.value) +
                '" aria-pressed="' +
                (selected ? 'true' : 'false') +
                '"><span class="option__mark">' +
                (selected ? M.icon('check', 13) : esc(optionLabel(i))) +
                '</span><span>' +
                esc(opt.label) +
                '</span></button>'
              );
            })
            .join('') +
          '</div>';
      }

      qSlot.innerHTML =
        '<div class="qcard step-enter" style="border:0;box-shadow:none;padding:0">' +
        '<div class="qcard__head">' +
        '<span class="chip chip--brand">' +
        esc(TYPE_LABEL[q.type] || q.type) +
        '</span>' +
        '<span class="chip chip--outline">پرسش ' +
        util.toFa(index + 1) +
        ' از ' +
        util.toFa(questions.length) +
        '</span>' +
        (q.points ? '<span class="chip">' + util.toFa(q.points) + ' امتیاز</span>' : '') +
        '</div>' +
        '<p class="qcard__prompt" id="q-prompt">' +
        esc(q.prompt || '') +
        '</p>' +
        body +
        '</div>';

      var optionsEls = util.$$('[data-opt]', qSlot);
      optionsEls.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var raw = btn.getAttribute('data-opt');
          if (q.type === 'multi') {
            var arr = Array.isArray(answers[q.id]) ? answers[q.id].slice() : [];
            var val = Number(raw);
            var at = arr.indexOf(val);
            if (at === -1) arr.push(val);
            else arr.splice(at, 1);
            answers[q.id] = arr.sort();
          } else if (q.type === 'truefalse') {
            answers[q.id] = raw;
          } else {
            answers[q.id] = Number(raw);
          }
          renderQuestion();
          renderNav();
          updateCounters();
        });
      });

      var numInput = util.$('#q-num', qSlot);
      if (numInput) {
        numInput.addEventListener('input', function () {
          answers[q.id] = numInput.value;
          updateCounters();
          renderNav();
        });
      }
    }

    function renderNav() {
      navSlot.innerHTML = questions
        .map(function (q, i) {
          var answered = isAnswered(q, answers[q.id]);
          return (
            '<button class="qnav__btn' +
            (answered ? ' is-answered' : '') +
            (i === index ? ' is-current' : '') +
            '" type="button" data-jump="' +
            i +
            '" aria-label="پرسش ' +
            util.toFa(i + 1) +
            (answered ? ' پاسخ داده شده' : ' بی‌پاسخ') +
            '">' +
            util.toFa(i + 1) +
            '</button>'
          );
        })
        .join('');
      util.$$('[data-jump]', navSlot).forEach(function (btn) {
        btn.addEventListener('click', function () {
          index = Number(btn.getAttribute('data-jump'));
          renderQuestion();
          renderNav();
          updateCounters();
        });
      });
    }

    function updateCounters() {
      var answered = answeredCount();
      counter.textContent = 'پرسش ' + util.toFa(index + 1) + ' از ' + util.toFa(questions.length);
      answeredCounter.textContent = util.toFa(answered) + ' پاسخ داده‌شده';
      progressSlot.innerHTML = M.ui.progress((answered / questions.length) * 100, {
        size: 'sm',
        aria: 'پیشرفت پاسخ‌دهی'
      });
      M.ui.animateProgress(progressSlot);
      var prev = util.$('[data-prev]', root);
      var next = util.$('[data-next]', root);
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === questions.length - 1;
    }

    util.$('[data-prev]', root).addEventListener('click', function () {
      if (index > 0) {
        index -= 1;
        renderQuestion();
        renderNav();
        updateCounters();
      }
    });

    util.$('[data-next]', root).addEventListener('click', function () {
      if (index < questions.length - 1) {
        index += 1;
        renderQuestion();
        renderNav();
        updateCounters();
      }
    });

    util.$('[data-submit]', root).addEventListener('click', function () {
      var answered = answeredCount();
      var missing = questions.length - answered;
      M.ui
        .confirm({
          title: 'پایان آزمون؟',
          text:
            missing > 0
              ? util.toFa(missing) + ' پرسش بی‌پاسخ مانده است. پس از ثبت، پاسخ‌ها قابل تغییر نیستند.'
              : 'همهٔ پرسش‌ها پاسخ داده شده‌اند. نتیجه ثبت شود؟',
          confirmLabel: 'ثبت نتیجه',
          cancelLabel: 'بازگشت به آزمون'
        })
        .then(function (ok) {
          if (!ok) return;
          submit();
        });
    });

    function submit() {
      finished = true;
      window.clearInterval(timer);
      var detail = [];
      var score = 0;
      questions.forEach(function (q) {
        var ok = isCorrect(q, answers[q.id]);
        if (ok) score += 1;
        detail.push({
          qid: q.id,
          type: q.type,
          given: normalizeAnswer(q, answers[q.id]),
          ok: ok
        });
      });
      var attempt = {
        id: util.uid('att'),
        examId: exam.id,
        title: exam.title,
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: util.nowISO(),
        durationMs: Date.now() - startedAt,
        score: score,
        total: questions.length,
        answers: answers,
        detail: detail
      };
      M.store.addAttempt(attempt);
      M.store.flush('exam.submit').then(function () {
        M.router.go('#/exam/' + encodeURIComponent(exam.id) + '/result/' + encodeURIComponent(attempt.id));
      });
    }

    renderQuestion();
    renderNav();
    updateCounters();
  }

  /* ---- result ----------------------------------------------------------- */
  views.examResult = function (params) {
    var attempt = M.store
      .attempts()
      .filter(function (a) {
        return a.id === params.attemptId;
      })[0];
    if (!attempt) {
      return {
        title: 'نتیجهٔ آزمون',
        nav: 'exam',
        html: M.ui.empty({
          icon: 'exam',
          title: 'این نتیجه پیدا نشد',
          text: 'ممکن است داده‌ها پاک شده باشند.',
          actions: '<a class="btn btn--primary" href="#/exam">فهرست آزمون‌ها</a>'
        })
      };
    }

    var found = M.content.exam(attempt.examId);
    var questions = found ? M.content.questionsFor(found.exam) : [];
    var pct = attempt.total ? (attempt.score / attempt.total) * 100 : 0;
    var detail = attempt.detail || [];

    var head =
      '<div class="lesson-hero">' +
      '<div class="breadcrumb"><a href="#/exam">آزمون‌ها</a><span class="breadcrumb__sep">/</span><span>نتیجه</span></div>' +
      '<div class="row row--wrap" style="align-items:center;gap:20px">' +
      M.ui.donut(pct, { size: 96, stroke: 10, caption: 'درصد' }) +
      '<div style="min-width:0;flex:1 1 240px">' +
      '<h1>' +
      esc(found ? found.exam.title : attempt.title || 'نتیجهٔ آزمون') +
      '</h1>' +
      '<div class="row row--wrap" style="margin-top:10px">' +
      '<span class="chip ' +
      (pct >= 50 ? 'chip--ok' : 'chip--danger') +
      '">' +
      util.toFa(attempt.score) +
      ' از ' +
      util.toFa(attempt.total) +
      ' پاسخ درست</span>' +
      '<span class="chip">' +
      esc(M.jalali.formatISO(new Date(attempt.finishedAt).getTime())) +
      '</span>' +
      '<span class="chip chip--outline">' +
      esc(formatDuration(attempt.durationMs)) +
      '</span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';

    var questionsPresent = questions.length > 0;

    var rows = detail
      .map(function (item, i) {
        var q = questions.filter(function (x) {
          return x.id === item.qid;
        })[0];
        if (!q) return '';
        var givenLabel =
          q.type === 'numeric'
            ? item.given === null
              ? 'بی‌پاسخ'
              : util.toFa(item.given)
            : q.type === 'truefalse'
              ? item.given === 'true'
                ? 'درست'
                : item.given === 'false'
                  ? 'نادرست'
                  : 'بی‌پاسخ'
              : q.type === 'multi'
                ? item.given && item.given.length
                  ? item.given
                      .map(function (v) {
                        return optionLabel(v);
                      })
                      .join('، ')
                  : 'بی‌پاسخ'
                : item.given === null
                  ? 'بی‌پاسخ'
                  : optionLabel(Number(item.given));
        var correctLabel =
          q.type === 'numeric'
            ? util.toFa(q.answer)
            : q.type === 'truefalse'
              ? q.correct === 'true'
                ? 'درست'
                : 'نادرست'
              : q.type === 'multi'
                ? (q.correct || [])
                    .map(function (v) {
                      return optionLabel(v);
                    })
                    .join('، ')
                : optionLabel(Number(Array.isArray(q.correct) ? q.correct[0] : q.correct));
        return (
          '<div class="card card--pad card--flat" data-review-item="' +
          (item.ok ? 'ok' : 'bad') +
          '" style="border-color:' +
          (item.ok ? 'var(--border)' : 'var(--border)') +
          '">' +
          '<div class="row" style="align-items:flex-start;gap:10px">' +
          '<span class="chip ' +
          (item.ok ? 'chip--ok' : 'chip--danger') +
          '">' +
          (item.ok ? 'درست' : 'نادرست') +
          '</span>' +
          '<span class="chip chip--outline">پرسش ' +
          util.toFa(i + 1) +
          '</span>' +
          '</div>' +
          '<p class="qcard__prompt" style="font-size:var(--fs-14);margin-top:10px">' +
          esc(q.prompt) +
          '</p>' +
          '<div class="row row--wrap" style="margin-top:10px;gap:8px">' +
          '<span class="chip">پاسخ شما: ' +
          esc(givenLabel) +
          '</span>' +
          '<span class="chip chip--ok">پاسخ درست: ' +
          esc(correctLabel) +
          '</span>' +
          '</div>' +
          (q.explanation
            ? '<div class="banner" style="margin-top:12px">' +
              M.icon('info', 16) +
              '<span>' +
              esc(q.explanation) +
              '</span></div>'
            : '') +
          '</div>'
        );
      })
      .filter(Boolean)
      .join('');

    var body = !questionsPresent
      ? '<div class="banner banner--warn">' +
          M.icon('alert', 16) +
          '<span>متن پرسش‌های این آزمون در محتوای فعلی نیست؛ فقط خلاصهٔ نتیجه نمایش داده می‌شود.</span></div>'
      : '';

    var filterBar = detail.length
      ? '<div class="segmented" role="tablist" aria-label="صرف نمایش">' +
        '<button class="segmented__item is-active" type="button" data-filter="all" role="tab" aria-selected="true">همه</button>' +
        '<button class="segmented__item" type="button" data-filter="bad" role="tab" aria-selected="false">پاسخ‌های نادرست</button>' +
        '</div>'
      : '';

    var html =
      head +
      '<div class="row row--wrap" style="margin:20px 0 12px">' +
      filterBar +
      '<a class="btn btn--ghost btn--sm push" href="#/exam/' +
      encodeURIComponent(attempt.examId) +
      '">تکرار آزمون</a>' +
      '<a class="btn btn--primary btn--sm" href="#/exam">فهرست آزمون‌ها</a>' +
      '</div>' +
      body +
      '<div class="stack" data-review-list>' +
      rows +
      '</div>';

    return {
      title: 'نتیجهٔ آزمون',
      nav: 'exam',
      html: html,
      onMount: function (root) {
        M.ui.animateProgress(root);
        util.$$('[data-filter]', root).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var mode = btn.getAttribute('data-filter');
            util.$$('[data-filter]', root).forEach(function (b) {
              b.classList.toggle('is-active', b === btn);
              b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
            });
            util.$$('[data-review-item]', root).forEach(function (item) {
              item.hidden = mode === 'bad' && item.getAttribute('data-review-item') === 'ok';
            });
          });
        });
      }
    };
  };

  function formatDuration(ms) {
    var total = Math.max(0, Math.round((ms || 0) / 1000));
    var mm = Math.floor(total / 60);
    var ss = total % 60;
    return util.toFa(mm) + ' دقیقه و ' + util.toFa(ss) + ' ثانیه';
  }
})(window, document);
