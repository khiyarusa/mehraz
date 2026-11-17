/* ==========================================================================
   MEHRAZ — learning surfaces
   Library -> grade -> subject -> book -> chapter -> lesson.
   The lesson renderer is content-driven: it draws whatever the catalogue
   provides and shows a designed placeholder when a section is still empty.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var M = window.MEHRAZ;
  var util = M.util;
  var esc = util.esc;
  var views = (M.views = M.views || {});

  var CYCLE_LABEL = { middle: 'متوسطهٔ اول', high: 'متوسطهٔ دوم' };

  /* ---- library ---------------------------------------------------------- */
  views.library = function (params, query) {
    var p = M.store.profile();
    var scope = query && query.scope === 'all' ? 'all' : 'mine';
    var track = p.grade >= 10 ? p.track : null;

    var tabs =
      '<div class="segmented" role="tablist" aria-label="نمای کتابخانه">' +
      '<a class="segmented__item' + (scope === 'mine' ? ' is-active' : '') + '" role="tab" aria-selected="' + (scope === 'mine') + '" href="#/library">پایهٔ من</a>' +
      '<a class="segmented__item' + (scope === 'all' ? ' is-active' : '') + '" role="tab" aria-selected="' + (scope === 'all') + '" href="#/library?scope=all">همهٔ پایه‌ها</a>' +
      '</div>';

    var head = M.ui.pageHead({
      eyebrow: 'کتابخانه',
      title: 'کتابخانهٔ درس‌ها',
      sub: 'پایه و رشتهٔ خود را ببینید، کتاب را باز کنید و از فصل اول شروع کنید.',
      actions: tabs
    });

    var body;

    if (scope === 'mine') {
      var subjects = M.content.subjectsFor(p.grade, track);
      var spotlight =
        '<div class="spotlight">' +
        '<div class="spotlight__num">' + util.toFa(p.grade) + '</div>' +
        '<div style="min-width:0;flex:1 1 240px">' +
        '<h2>پایهٔ ' + esc(M.content.gradeLabel(p.grade)) + (track ? ' — ' + esc(M.content.trackLabel(track)) : '') + '</h2>' +
        '<p>' + (subjects.length ? util.toFa(subjects.length) + ' درس در این پایه' : 'هنوز کتابی برای این پایه ثبت نشده است') + '</p>' +
        '</div>' +
        (p.grade >= 10
          ? '<div class="trackchips">' + M.store.TRACKS.map(function (t) {
              return '<a class="trackchip" href="#/library/' + p.grade + '/' + t + '">' + esc(M.content.trackLabel(t)) + '</a>';
            }).join('') + '</div>'
          : '<a class="trackchip" href="#/library?scope=all">همهٔ پایه‌ها</a>') +
        '</div>';

      body = spotlight +
        '<section class="section">' + M.ui.sectionHead('درس‌های من') +
        (subjects.length
          ? '<div class="grid grid--subjects stagger">' + subjects.map(function (s) {
              var pct = s.lessonCount ? (s.doneCount / s.lessonCount) * 100 : 0;
              return (
                '<a class="subjectcard" href="#/subject/' + encodeURIComponent(s.id) + '">' +
                '<div class="subjectcard__top">' + M.art.monogram(s.id, 46) +
                '<div style="min-width:0"><div class="subjectcard__title truncate">' + esc(s.title) + '</div>' +
                '<div class="subjectcard__meta">' + util.toFa(s.lessonCount) + ' درس</div></div></div>' +
                '<div><div class="progress__label"><span>پیشرفت</span><b>' + util.fmtPct(pct) + '</b></div>' +
                '<span class="sr-only">پیشرفت ' + util.fmtPct(pct) + '</span>' +
                M.ui.progress(pct, { size: 'sm', decorative: true }) + '</div></a>'
              );
            }).join('') + '</div>'
          : M.ui.empty({
              icon: 'library',
              title: 'برای این پایه کتابی ثبت نشده است',
              text: 'کتاب‌های این پایه هنوز به کتابخانه اضافه نشده‌اند. می‌توانید فهرست همهٔ پایه‌ها را ببینید.',
              actions: '<a class="btn btn--primary btn--sm" href="#/library?scope=all">دیدن همهٔ پایه‌ها</a>'
            })) +
        '</section>';
    } else {
      var groups = { middle: [7, 8, 9], high: [10, 11, 12] };
      body = ['middle', 'high'].map(function (cycle) {
        return (
          '<section class="section">' + M.ui.sectionHead(CYCLE_LABEL[cycle]) +
          '<div class="grid grid--grades stagger">' +
          groups[cycle].map(function (g) {
            var meta = M.content.gradeMeta[g];
            var isMine = g === p.grade;
            var tracks = g >= 10
              ? '<div class="trackchips">' + M.store.TRACKS.map(function (t) {
                  return '<a class="trackchip" href="#/library/' + g + '/' + t + '">' + esc(M.content.trackLabel(t)) + '</a>';
                }).join('') + '</div>'
              : '<div class="trackchips"><a class="trackchip" href="#/library/' + g + '">مشاهدهٔ درس‌ها</a></div>';
            return (
              '<div class="gradecard"><div class="row">' +
              '<span class="gradecard__num">' + util.toFa(g) + '</span>' +
              '<div class="gradecard__body"><h3>پایهٔ ' + esc(meta.label) +
              (isMine ? ' <span class="chip chip--brand" style="vertical-align:middle">پایهٔ شما</span>' : '') +
              '</h3><p>' + esc(meta.cycleLabel) + '</p></div></div>' + tracks + '</div>'
            );
          }).join('') +
          '</div></section>'
        );
      }).join('');
    }

    return {
      title: 'کتابخانه',
      nav: 'library',
      html: head + body,
      onMount: function (root) { M.ui.animateProgress(root); }
    };
  };
  views.grade = function (params) {
    var grade = Number(params.grade);
    if (!M.content.gradeMeta[grade]) {
      return { title: 'پایه', nav: 'library', html: M.router.notFound() };
    }
    var p = M.store.profile();
    var meta = M.content.gradeMeta[grade];
    var track = params.track && M.content.trackMeta[params.track] ? params.track : null;
    // Opening a grade from the "all grades" list used to lose the student's
    // track and show an empty page for their own grade.
    if (!track && grade >= 10 && p.grade === grade && p.track) track = p.track;

    var head = M.ui.pageHead({
      eyebrow: meta.cycleLabel,
      title: 'پایهٔ ' + meta.label,
      sub:
        grade >= 10
          ? 'رشتهٔ تحصیلی را انتخاب کنید تا فهرست درس‌ها نمایش داده شود.'
          : 'درس‌های این پایه در کتابخانه فهرست می‌شوند.',
      actions: '<a class="btn btn--ghost btn--sm" href="#/library?scope=all">' + M.icon('arrowEnd', 15) + 'همهٔ پایه‌ها</a>'
    });

    var trackBar =
      grade >= 10
        ? '<div class="segmented" role="tablist" aria-label="رشته">' +
          M.store.TRACKS.map(function (t) {
            return (
              '<a class="segmented__item' +
              (track === t ? ' is-active' : '') +
              '" role="tab" aria-selected="' +
              (track === t) +
              '" href="#/library/' +
              grade +
              '/' +
              t +
              '">' +
              esc(M.content.trackLabel(t)) +
              '</a>'
            );
          }).join('') +
          '</div>'
        : '';

    var subjects = M.content.subjectsFor(grade, track);
    var body;
    if (grade >= 10 && !track) {
      body = M.ui.empty({
        icon: 'layers',
        title: 'رشته را انتخاب کنید',
        text: 'برای پایه‌های دهم تا دوازدهم، فهرست درس‌ها به رشتهٔ تحصیلی وابسته است.'
      });
    } else if (subjects.length) {
      body =
        '<div class="grid grid--subjects stagger">' +
        subjects
          .map(function (s) {
            return (
              '<a class="subjectcard" href="#/subject/' +
              encodeURIComponent(s.id) +
              '"><div class="subjectcard__top"><span class="card__icon">' +
              M.icon('book', 18) +
              '</span><div style="min-width:0"><div class="subjectcard__title truncate">' +
              esc(s.title) +
              '</div><div class="subjectcard__meta">' +
              util.toFa(s.lessonCount) +
              ' درس</div></div></div>' +
              M.ui.progress(s.lessonCount ? (s.doneCount / s.lessonCount) * 100 : 0, {
                size: 'sm',
                decorative: true
              }) +
              '</a>'
            );
          })
          .join('') +
        '</div>';
    } else {
      body = M.ui.empty({
        icon: 'book',
        title: 'هنوز کتابی برای این ' + (track ? 'رشته' : 'پایه') + ' ثبت نشده',
        text: 'کتاب رسمی این پایه به‌زودی به کتابخانه اضافه می‌شود.',
        actions:
          grade === p.grade
            ? '<a class="btn btn--primary btn--sm" href="#/dashboard">بازگشت به داشبورد</a>'
            : '<a class="btn btn--ghost btn--sm" href="#/library?scope=all">همهٔ پایه‌ها</a>'
      });
    }

    return {
      title: 'پایهٔ ' + meta.label,
      nav: 'library',
      html: head + trackBar + body,
      onMount: function (root) {
        M.ui.animateProgress(root);
      }
    };
  };

  /* ---- shared book renderer -------------------------------------------- */
  function bookScreen(book, opts) {
    opts = opts || {};
    var progress = M.content.bookProgress(book);
    var chapters = M.content.chapters(book.id);

    var head =
      '<div class="lesson-hero">' +
      '<div class="breadcrumb"><a href="#/library">کتابخانه</a><span class="breadcrumb__sep">/</span>' +
      '<a href="#/library/' +
      book.grade +
      (book.track ? '/' + book.track : '') +
      '">پایهٔ ' +
      esc(M.content.gradeLabel(book.grade)) +
      '</a><span class="breadcrumb__sep">/</span><span>' +
      esc((book.subject && book.subject.title) || book.title) +
      '</span></div>' +
      '<div class="row row--wrap" style="align-items:flex-end;gap:16px">' +
      '<div style="min-width:0;flex:1 1 280px">' +
      '<h1>' +
      esc(book.title) +
      '</h1>' +
      '<div class="row row--wrap" style="margin-top:10px">' +
      '<span class="chip chip--brand">' +
      esc((book.subject && book.subject.title) || 'درس') +
      '</span>' +
      (book.academicYear ? '<span class="chip">سال تحصیلی ' + esc(book.academicYear) + '</span>' : '') +
      (book.edition ? '<span class="chip chip--outline">نسخهٔ ' + esc(book.edition) + '</span>' : '') +
      '<span class="chip">' +
      util.toFa(progress.total) +
      ' درس</span>' +
      '</div>' +
      '</div>' +
      '<div style="min-width:180px">' +
      '<div class="progress__label"><span>پیشرفت کتاب</span><b>' +
      util.fmtPct(progress.percent) +
      '</b></div>' +
      M.ui.progress(progress.percent, { size: 'sm', aria: 'پیشرفت کتاب' }) +
      '<div class="hint" style="margin-top:6px">' +
      util.toFa(progress.done) +
      ' از ' +
      util.toFa(progress.total) +
      ' درس کامل شده</div>' +
      '</div>' +
      '</div>' +
      '</div>';

    if (!chapters.length) {
      return (
        head +
        '<section class="section" style="margin-top:20px">' +
        M.ui.empty({
          icon: 'layers',
          title: 'هنوز فصلی برای این کتاب ثبت نشده',
          text: 'به‌زودی فصل‌ها و درس‌های رسمی این کتاب اضافه می‌شوند.',
          actions: '<a class="btn btn--ghost btn--sm" href="#/library">بازگشت به کتابخانه</a>'
        }) +
        '</section>'
      );
    }

    var search =
      '<div class="field" style="max-width:420px">' +
      '<div class="searchbox">' +
      M.icon('search', 16) +
      '<input type="search" id="book-search" placeholder="جست‌وجو در فصل‌ها و درس‌ها" aria-label="جست‌وجو در کتاب">' +
      '</div></div>';

    var chapterHtml = chapters
      .map(function (ch, idx) {
        var cp = M.content.chapterProgress(ch);
        var lessons = (ch.lessons || [])
          .slice()
          .sort(function (a, b) {
            return (a.order || 0) - (b.order || 0);
          })
          .map(function (ls) {
            var done = M.store.isLessonDone(ls.id);
            return (
              '<a class="lessonrow' +
              (done ? ' is-done' : '') +
              '" data-lesson-row data-search="' +
              esc((ls.title + ' ' + ch.title).toLowerCase()) +
              '" href="#/lesson/' +
              encodeURIComponent(book.id) +
              '/' +
              encodeURIComponent(ch.id) +
              '/' +
              encodeURIComponent(ls.id) +
              '">' +
              '<span class="lessonrow__status">' +
              M.icon('check', 14) +
              '</span>' +
              '<span style="min-width:0;flex:1 1 auto"><span class="lessonrow__title">' +
              esc(ls.title) +
              '</span><span class="lessonrow__meta" style="display:block">' +
              (ls.minutes ? util.toFa(ls.minutes) + ' دقیقه' : 'زمان نامشخص') +
              (done ? ' • خوانده‌شده' : '') +
              '</span></span>' +
              M.icon('chevronEnd', 16) +
              '</a>'
            );
          })
          .join('');

        return (
          '<div class="accordion__item' +
          (idx === 0 ? ' is-open' : '') +
          '" data-chapter>' +
          '<button class="accordion__head" type="button" aria-expanded="' +
          (idx === 0) +
          '">' +
          '<span class="chapterrow__idx">' +
          util.toFa(idx + 1) +
          '</span>' +
          '<span style="min-width:0"><span class="truncate" style="display:block">' +
          esc(ch.title) +
          '</span><span class="chapterrow__meta">' +
          util.toFa(cp.total) +
          ' درس • ' +
          util.fmtPct(cp.percent) +
          ' کامل</span></span>' +
          '<span class="accordion__chev">' +
          M.icon('chevronDown', 18) +
          '</span>' +
          '</button>' +
          '<div class="accordion__panel"><div class="accordion__inner"><div class="accordion__body">' +
          '<div class="chapterlist">' +
          (lessons || '<p class="hint">درسی در این فصل ثبت نشده است.</p>') +
          '</div></div></div></div></div>'
        );
      })
      .join('');

    return (
      head +
      '<section class="section" style="margin-top:22px">' +
      '<div class="row row--wrap" style="gap:10px">' +
      search +
      '<button class="btn btn--quiet btn--sm push" type="button" data-expand-all>بازکردن همهٔ فصل‌ها</button>' +
      '</div>' +
      '<div class="accordion" data-chapter-list>' +
      chapterHtml +
      '</div>' +
      '<p class="hint" data-search-empty hidden>درسی با این عبارت پیدا نشد.</p>' +
      '</section>'
    );
  }

  function bindBook(root) {
    util.$$('[data-chapter]', root).forEach(function (item) {
      var head = util.$('.accordion__head', item);
      head.addEventListener('click', function () {
        var open = item.classList.toggle('is-open');
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    var expand = util.$('[data-expand-all]', root);
    if (expand) {
      var expanded = false;
      expand.addEventListener('click', function () {
        expanded = !expanded;
        util.$$('[data-chapter]', root).forEach(function (item) {
          item.classList.toggle('is-open', expanded);
          var head = util.$('.accordion__head', item);
          if (head) head.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
        expand.textContent = expanded ? 'بستن همهٔ فصل‌ها' : 'بازکردن همهٔ فصل‌ها';
      });
    }

    var search = util.$('#book-search', root);
    var emptyNote = util.$('[data-search-empty]', root);
    if (search) {
      M.ui.debounceInput(search, function (value) {
        var q = util.toEn(String(value || '')).trim().toLowerCase();
        var shown = 0;
        util.$$('[data-chapter]', root).forEach(function (item) {
          var rows = util.$$('[data-lesson-row]', item);
          var chapterTitle = util.$('.accordion__head', item).textContent.toLowerCase();
          var hits = 0;
          rows.forEach(function (row) {
            var hay = row.getAttribute('data-search') || '';
            var match = !q || hay.indexOf(q) !== -1 || chapterTitle.indexOf(q) !== -1;
            row.hidden = !match;
            if (match) hits += 1;
          });
          item.hidden = q ? hits === 0 : false;
          if (q && hits) {
            item.classList.add('is-open');
            var head = util.$('.accordion__head', item);
            if (head) head.setAttribute('aria-expanded', 'true');
          }
          shown += hits;
        });
        if (emptyNote) emptyNote.hidden = !q || shown > 0;
      });
    }
  }

  views.book = function (params) {
    var book = M.content.book(params.bookId);
    if (!book) {
      return { title: 'درس', nav: 'library', html: M.router.notFound() };
    }
    return {
      title: (book.subject && book.subject.title) || book.title,
      nav: 'library',
      html: bookScreen(book),
      onMount: function (root) {
        bindBook(root);
        M.ui.animateProgress(root);
        var chapterId = params.chapterId;
        if (chapterId) {
          var idx = M.content
            .chapters(book.id)
            .findIndex(function (ch) {
              return ch.id === chapterId;
            });
          var items = util.$$('[data-chapter]', root);
          items.forEach(function (item, i) {
            item.classList.toggle('is-open', i === idx);
            var head = util.$('.accordion__head', item);
            if (head) head.setAttribute('aria-expanded', i === idx ? 'true' : 'false');
          });
          if (items[idx]) items[idx].scrollIntoView({ block: 'center' });
        }
      }
    };
  };

  views.subject = function (params) {
    var p = M.store.profile();
    var track = p.grade >= 10 ? p.track : null;
    var subjects = M.content.subjectsFor(p.grade, track);
    var subject = subjects.filter(function (s) {
      return s.id === params.subjectId;
    })[0];

    if (!subject) {
      var anyBooks = M.content.books({});
      var fallback = null;
      anyBooks.forEach(function (b) {
        if ((b.subject && b.subject.id) === params.subjectId) fallback = b;
      });
      if (fallback) {
        return views.book({ bookId: fallback.id });
      }
      return {
        title: 'درس',
        nav: 'library',
        html: M.ui.empty({
          icon: 'book',
          title: 'این درس در دسترس نیست',
          text: 'ممکن است درس مربوط به پایه یا رشتهٔ دیگری باشد.',
          actions: '<a class="btn btn--primary" href="#/library">کتابخانه</a>'
        })
      };
    }

    if (subject.books.length === 1) {
      return views.book({ bookId: subject.books[0].id });
    }

    var html = M.ui.pageHead({
      eyebrow: 'درس',
      title: subject.title,
      sub: 'برای این درس بیش از یک کتاب ثبت شده است. کتاب مورد نظر را انتخاب کنید.',
      actions: '<a class="btn btn--ghost btn--sm" href="#/library">' + M.icon('arrowEnd', 15) + 'کتابخانه</a>'
    });

    html +=
      '<section class="section"><div class="stack">' +
      subject.books
        .map(function (b) {
          var pr = M.content.bookProgress(b);
          return (
            '<a class="card card--pad card--link" href="#/book/' +
            encodeURIComponent(b.id) +
            '"><div class="row"><span class="card__icon">' +
            M.icon('book', 18) +
            '</span><div style="min-width:0;flex:1 1 auto"><div class="card__title">' +
            esc(b.title) +
            '</div><div class="card__text">' +
            util.toFa(pr.total) +
            ' درس • ' +
            util.fmtPct(pr.percent) +
            ' کامل</div></div>' +
            M.icon('chevronEnd', 18) +
            '</div></a>'
          );
        })
        .join('') +
      '</div></section>';

    return { title: subject.title, nav: 'library', html: html };
  };

  /* ---- lesson ----------------------------------------------------------- */
  function blockSource(block) {
    if (!block || !block.source || !block.source.reference) return '';
    return '<p class="block-source">منبع: ' + esc(block.source.reference) + '</p>';
  }

  function renderBlock(block) {
    if (!block || typeof block !== 'object') return '';
    if (block.type === 'p') return '<p>' + esc(block.text || '') + '</p>';
    if (block.type === 'list') {
      return (
        '<ul style="list-style:disc;padding-inline-start:20px;display:flex;flex-direction:column;gap:6px">' +
        (block.items || [])
          .map(function (it) {
            return '<li>' + esc(it) + '</li>';
          })
          .join('') +
        '</ul>'
      );
    }
    if (block.type === 'note') {
      return M.ui.banner({ text: block.text, type: block.tone === 'warn' ? 'warn' : 'info', icon: 'info' });
    }
    if (block.type === 'figure') {
      var src = String(block.src || '');
      var safe = /^data:image\//.test(src) || /^blob:/.test(src);
      return safe
        ? '<figure style="margin:0"><img src="' +
            esc(src) +
            '" alt="' +
            esc(block.alt || '') +
            '" loading="lazy" style="border-radius:var(--r-md)">' +
            (block.caption ? '<figcaption class="hint">' + esc(block.caption) + '</figcaption>' : '') +
            '</figure>' +
            blockSource(block)
        : '<div class="banner banner--warn">' +
            M.icon('alert', 16) +
            '<span>این تصویر در دسترس نیست.</span></div>';
    }
    if (block.type === 'table' && block.head) {
      return (
        '<div class="tablewrap"><table class="table"><thead><tr>' +
        block.head
          .map(function (h) {
            return '<th>' + esc(h) + '</th>';
          })
          .join('') +
        '</tr></thead><tbody>' +
        (block.rows || [])
          .map(function (row) {
            return (
              '<tr>' +
              row
                .map(function (cell) {
                  return '<td>' + esc(cell) + '</td>';
                })
                .join('') +
              '</tr>'
            );
          })
          .join('') +
        '</tbody></table></div>' +
        blockSource(block)
      );
    }
    return '';
  }

  function renderSection(section, index) {
    var body;
    if (section.questions) {
      body = renderExercises(section.questions);
    } else if (section.activities) {
      body = section.activities.map(function (a) { return M.activities.render(a); }).join('');
    } else if (section.hasContent && section.data) {
      var data = section.data;
      if (Array.isArray(data.blocks)) {
        body = data.blocks.map(renderBlock).join('');
      } else if (typeof data === 'string') {
        body = '<p>' + esc(data) + '</p>';
      } else {
        body = '<p>' + esc(data.text || '') + '</p>';
      }
    } else {
      body =
        '<div class="section-ph">' +
        '<span class="section-ph__tag">' +
        M.icon('clock', 14) +
        'به‌زودی</span>' +
        '<p class="hint">این بخش با محتوای رسمی درس تکمیل می‌شود.</p>' +
        '</div>';
    }
    return (
      '<section class="lsection" id="sec-' + section.key + '" data-section="' + section.key + '">' +
      '<div class="lsection__head">' +
      '<span class="lsection__idx">' + util.toFa(index + 1) + '</span>' +
      '<h2 class="lsection__title">' + esc(section.label) + '</h2>' +
      '</div>' +
      '<div class="lsection__body">' + body + '</div>' +
      '</section>'
    );
  }

  /* Exercises live on the lesson, not in the exam engine: the student answers,
     then opens the explanation. The exam engine stays for timed assessment. */
  function renderExercises(questions) {
    return (
      '<div class="exercises">' +
      questions
        .map(function (q, i) {
          var answer = '';
          if (q.type === 'mcq' || q.type === 'multi') {
            var idxs = Array.isArray(q.correct) ? q.correct : [q.correct];
            answer = idxs
              .map(function (ix) {
                return (q.options && q.options[ix]) || '';
              })
              .filter(Boolean)
              .join('، ');
          } else if (q.type === 'truefalse') {
            answer = q.correct === 'true' ? 'درست' : 'نادرست';
          } else {
            answer = util.toFa(q.answer) + (q.unit ? ' ' + q.unit : '');
          }
          var options =
            q.options && q.options.length
              ? '<ol class="exercise__options" type="a">' +
                q.options
                  .map(function (o) {
                    return '<li>' + esc(o) + '</li>';
                  })
                  .join('') +
                '</ol>'
              : '';
          return (
            '<article class="exercise">' +
            '<div class="exercise__head"><span class="exercise__num">' + util.toFa(i + 1) + '</span>' +
            '<p class="exercise__prompt">' + esc(q.prompt) + '</p></div>' +
            options +
            '<details class="exercise__answer"><summary>پاسخ و توضیح</summary>' +
            '<p class="exercise__key">پاسخ: <b>' + esc(answer) + '</b></p>' +
            (q.explanation ? '<p class="hint">' + esc(q.explanation) + '</p>' : '') +
            '</details></article>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  views.lesson = function (params) {
    var row = M.content.findLesson(params.bookId, params.chapterId, params.lessonId);
    if (!row) {
      return {
        title: 'درس',
        nav: 'library',
        html: M.router.notFound()
      };
    }
    var book = row.book;
    var chapter = row.chapter;
    var lesson = row.lesson;
    var plan = M.content.sectionPlan(lesson);
    // Only sections with real material are rendered. Empty optional sections
    // are not shown as a row of "coming soon" placeholders.
    var visible = plan.filter(function (s) { return s.hasContent; });
    if (lesson.activities && lesson.activities.length) {
      var hasInteractive = visible.some(function (s) { return s.key === 'interactive'; });
      if (!hasInteractive) {
        var actAt = -1;
        for (var ai = 0; ai < visible.length; ai += 1) {
          if (visible[ai].key === 'exercises' || visible[ai].key === 'summary') { actAt = ai; break; }
        }
        var actSection = { key: 'interactive', label: 'آزمایش تعاملی', icon: 'play', hasContent: true, activities: lesson.activities };
        if (actAt === -1) visible.push(actSection);
        else visible.splice(actAt, 0, actSection);
      }
    }
    if (lesson.questions && lesson.questions.length) {
      var at = -1;
      for (var vi = 0; vi < visible.length; vi += 1) {
        if (visible[vi].key === 'summary') { at = vi; break; }
      }
      var exerciseSection = { key: 'exercises', label: 'تمرین‌ها', icon: 'edit', hasContent: true, questions: lesson.questions };
      if (at === -1) visible.push(exerciseSection);
      else visible.splice(at, 0, exerciseSection);
    }
    var done = M.store.isLessonDone(lesson.id);
    var lessonIndex = (chapter.lessons || []).findIndex(function (l) {
      return l.id === lesson.id;
    });
    var next = (chapter.lessons || [])[lessonIndex + 1] || null;
    var prev = (chapter.lessons || [])[lessonIndex - 1] || null;

    var head =
      '<div class="lesson-hero">' +
      '<div class="breadcrumb"><a href="#/library">کتابخانه</a><span class="breadcrumb__sep">/</span>' +
      '<a href="#/book/' +
      encodeURIComponent(book.id) +
      '">' +
      esc(book.title) +
      '</a><span class="breadcrumb__sep">/</span><span>' +
      esc(chapter.title) +
      '</span></div>' +
      '<div class="row row--wrap" style="align-items:flex-start;gap:18px">' +
      '<div style="flex:1 1 320px;min-width:0">' +
      '<h1>' +
      esc(lesson.title) +
      '</h1>' +
      '<div class="row row--wrap" style="margin-top:10px">' +
      '<span class="chip chip--brand">' +
      esc((book.subject && book.subject.title) || book.title) +
      '</span>' +
      '<span class="chip">' +
      util.toFa(plan.length) +
      ' بخش</span>' +
      (lesson.minutes ? '<span class="chip">' + util.toFa(lesson.minutes) + ' دقیقه</span>' : '') +
      (done ? '<span class="chip chip--ok">' + M.icon('check', 12) + ' خوانده‌شده</span>' : '') +
      (lesson.verification && lesson.verification.status !== 'verified'
        ? '<span class="chip chip--warn">پیش‌نویس</span>'
        : '') +
      '</div>' +
      (lesson.source && lesson.source.reference
        ? '<p class="hint" style="margin-top:10px">منبع: ' +
          esc(lesson.source.title || 'کتاب درسی رسمی') +
          ' — ' +
          esc(lesson.source.reference) +
          (lesson.source.academicYear ? ' (سال تحصیلی ' + esc(lesson.source.academicYear) + ')' : '') +
          '</p>'
        : '') +
      '</div>' +
      '<div class="row" style="gap:8px">' +
      '<button class="btn ' +
      (done ? 'btn--ghost' : 'btn--primary') +
      ' btn--sm" type="button" data-complete="1"' +
      (done ? ' disabled' : '') +
      '>' +
      M.icon('check', 16) +
      (done ? 'این درس خوانده شده' : 'علامت‌گذاری به‌عنوان خوانده‌شده') +
      '</button>' +
      '</div>' +
      '</div>' +
      '</div>';

    var toc =
      '<aside class="toc" aria-label="فهرست بخش‌ها">' +
      '<div class="toc__title">بخش‌های درس</div>' +
      '<div class="toc__list">' +
      visible
        .map(function (s) {
          return (
            '<a class="toc__link" href="#sec-' +
            s.key +
            '" data-toc="' +
            s.key +
            '"><span class="dot ' +
            (s.hasContent ? 'dot--ok' : '') +
            '"></span>' +
            esc(s.label) +
            '</a>'
          );
        })
        .join('') +
      '</div>' +
      '<div class="divider" style="margin:10px 0"></div>' +
      '<div class="hint">' +
      (done
        ? 'این درس در تاریخ ' + esc(M.jalali.formatISO(new Date(M.store.lessonState(lesson.id).completedAt).getTime())) + ' کامل شد.'
        : 'وقتی درس را خواندید، دکمهٔ «خوانده‌شده» را بزنید تا در مسیر شما ثبت شود.') +
      '</div>' +
      '</aside>';

    var sections =
      '<div class="stack" style="gap:14px">' +
      visible.map(renderSection).join('') +
      '<nav class="card card--pad" aria-label="پیمایش درس">' +
      '<div class="row row--wrap" style="gap:10px">' +
      (prev
        ? '<a class="btn btn--ghost btn--sm" href="#/lesson/' +
          encodeURIComponent(book.id) +
          '/' +
          encodeURIComponent(chapter.id) +
          '/' +
          encodeURIComponent(prev.id) +
          '">' +
          M.icon('arrowEnd', 15) +
          'درس قبل</a>'
        : '') +
      (next
        ? '<a class="btn btn--primary btn--sm push" href="#/lesson/' +
          encodeURIComponent(book.id) +
          '/' +
          encodeURIComponent(chapter.id) +
          '/' +
          encodeURIComponent(next.id) +
          '">درس بعد' +
          M.icon('arrowStart', 15) +
          '</a>'
        : '<a class="btn btn--ghost btn--sm push" href="#/book/' +
          encodeURIComponent(book.id) +
          '">بازگشت به فصل‌ها</a>') +
      '</div></nav>' +
      '</div>';

    var view = {
      title: lesson.title,
      nav: 'library',
      html: head + '<div class="lesson-layout" style="margin-top:20px">' + sections + toc + '</div>',
      onMount: function (root) {
        M.store.touchLesson(lesson.id);
        M.activities.mount(root);

        var completeBtn = util.$('[data-complete]', root);
        if (completeBtn && !completeBtn.disabled) {
          completeBtn.addEventListener('click', function () {
            completeBtn.disabled = true;
            M.store.completeLesson(lesson.id);
            M.store.flush('lesson.complete').then(function (ok) {
              if (!ok) {
                completeBtn.disabled = false;
                M.ui.toast('ذخیرهٔ آخرین تغییر انجام نشد. لطفاً از اطلاعات خود نسخهٔ پشتیبان تهیه کنید.', {
                  type: 'warn',
                  ttl: 9000,
                  actionLabel: 'پشتیبان',
                  onAction: function () { M.router.go('#/settings'); }
                });
                return;
              }
              M.ui.toast('درس «' + lesson.title + '» در مسیر شما ثبت شد.', { type: 'ok', icon: 'check' });
              M.router.refresh();
            });
          });
        }

        // scroll-spy for the section list
        if ('IntersectionObserver' in window) {
          var links = util.$$('[data-toc]', root);
          var observer = new IntersectionObserver(
            function (entries) {
              entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var key = entry.target.getAttribute('data-section');
                links.forEach(function (l) {
                  l.classList.toggle('is-active', l.getAttribute('data-toc') === key);
                });
              });
            },
            { rootMargin: '-96px 0px -62% 0px', threshold: 0 }
          );
          util.$$('[data-section]', root).forEach(function (sec) {
            observer.observe(sec);
          });
          view.onUnmount = function () {
            observer.disconnect();
          };
        }

        util.$$('[data-toc]', root).forEach(function (link) {
          link.addEventListener('click', function (ev) {
            var id = link.getAttribute('href');
            var target = document.getElementById(id.slice(1));
            if (target) {
              ev.preventDefault();
              target.scrollIntoView({ behavior: util.prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
              target.classList.add('rise-in');
              window.setTimeout(function () {
                target.classList.remove('rise-in');
              }, 500);
            }
          });
        });
      }
    };

    return view;
  };

  views.chapter = function (params) {
    var book = M.content.book(params.bookId);
    if (!book) return { title: 'فصل', nav: 'library', html: M.router.notFound() };
    return views.book({ bookId: book.id, chapterId: params.chapterId });
  };
})(window, document);
