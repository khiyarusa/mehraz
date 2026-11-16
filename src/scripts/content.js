/* ==========================================================================
   MEHRAZ — content engine
   Phase 01 ships the contract and the renderer, never the educational content.
   The catalogue is embedded at build time (window.MEHRAZ_CONTENT) or left
   empty; PROMPT 02 fills it. A clearly-labelled structural demo pack exists
   only behind the developer switch in Settings and contains no subject facts.
   ========================================================================== */
(function (window) {
  'use strict';

  var M = window.MEHRAZ;
  var util = M.util;

  var GRADE_META = {
    7: { label: 'هفتم', cycle: 'middle', cycleLabel: 'متوسطهٔ اول' },
    8: { label: 'هشتم', cycle: 'middle', cycleLabel: 'متوسطهٔ اول' },
    9: { label: 'نهم', cycle: 'middle', cycleLabel: 'متوسطهٔ اول' },
    10: { label: 'دهم', cycle: 'high', cycleLabel: 'متوسطهٔ دوم' },
    11: { label: 'یازدهم', cycle: 'high', cycleLabel: 'متوسطهٔ دوم' },
    12: { label: 'دوازدهم', cycle: 'high', cycleLabel: 'متوسطهٔ دوم' }
  };

  var TRACK_META = {
    math: { label: 'ریاضی و فیزیک', short: 'ریاضی' },
    experimental: { label: 'علوم تجربی', short: 'تجربی' },
    humanities: { label: 'علوم انسانی', short: 'انسانی' }
  };

  var SECTIONS = [
    { key: 'intro', label: 'درآمد', icon: 'info' },
    { key: 'objectives', label: 'اهداف یادگیری', icon: 'target' },
    { key: 'explanation', label: 'شرح درس', icon: 'book' },
    { key: 'keyConcepts', label: 'مفاهیم کلیدی', icon: 'layers' },
    { key: 'examples', label: 'نمونه‌ها و مثال‌ها', icon: 'sparkles' },
    { key: 'illustrations', label: 'تصویرها و نمودارها', icon: 'progress' },
    { key: 'interactive', label: 'آزمایش تعاملی', icon: 'play' },
    { key: 'exercises', label: 'تمرین‌ها', icon: 'edit' },
    { key: 'summary', label: 'جمع‌بندی', icon: 'check' },
    { key: 'references', label: 'منابع و ارجاع‌ها', icon: 'shield' }
  ];

  var EMPTY_CATALOG = {
    schemaVersion: 1,
    updatedAt: null,
    generator: 'phase-01',
    books: []
  };

  function isObj(v) {
    return util.isPlainObject(v);
  }

  function asArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function validateBook(book, index, errors) {
    var at = 'books[' + index + ']';
    if (!isObj(book)) {
      errors.push({ path: at, message: 'book must be an object' });
      return;
    }
    ['id', 'title'].forEach(function (key) {
      if (typeof book[key] !== 'string' || !book[key].trim()) {
        errors.push({ path: at + '.' + key, message: 'required non-empty string' });
      }
    });
    if (typeof book.grade !== 'number' || !GRADE_META[book.grade]) {
      errors.push({ path: at + '.grade', message: 'grade must be 7..12' });
    }
    if (book.track !== null && book.track !== undefined && !TRACK_META[book.track]) {
      errors.push({ path: at + '.track', message: 'track must be math|experimental|humanities|null' });
    }
    if (!isObj(book.subject) || typeof book.subject.title !== 'string') {
      errors.push({ path: at + '.subject', message: 'subject.title is required' });
    }
    if (!Array.isArray(book.chapters)) {
      errors.push({ path: at + '.chapters', message: 'chapters must be an array' });
      return;
    }
    book.chapters.forEach(function (ch, ci) {
      var cat = at + '.chapters[' + ci + ']';
      if (!isObj(ch) || typeof ch.id !== 'string' || typeof ch.title !== 'string') {
        errors.push({ path: cat, message: 'chapter needs id and title' });
        return;
      }
      asArray(ch.lessons).forEach(function (ls, li) {
        if (!isObj(ls) || typeof ls.id !== 'string' || typeof ls.title !== 'string') {
          errors.push({ path: cat + '.lessons[' + li + ']', message: 'lesson needs id and title' });
        }
      });
    });
  }

  function validate(catalog) {
    var errors = [];
    if (!isObj(catalog)) {
      return { ok: false, errors: [{ path: '', message: 'catalogue must be an object' }] };
    }
    if (catalog.schemaVersion !== 1) {
      errors.push({ path: 'schemaVersion', message: 'expected 1' });
    }
    if (!Array.isArray(catalog.books)) {
      errors.push({ path: 'books', message: 'books must be an array' });
    } else {
      catalog.books.forEach(function (b, i) {
        validateBook(b, i, errors);
      });
    }
    return { ok: errors.length === 0, errors: errors };
  }

  var content = (M.content = {
    catalog: EMPTY_CATALOG,
    gradeMeta: GRADE_META,
    trackMeta: TRACK_META,
    sections: SECTIONS,
    demoEnabled: false,
    loadError: null,

    init: function () {
      var raw = window.MEHRAZ_CONTENT || EMPTY_CATALOG;
      var res = validate(raw);
      if (res.ok) {
        content.catalog = raw;
      } else {
        content.catalog = EMPTY_CATALOG;
        content.loadError = res.errors;
        M.diag.record('error', 'content catalogue rejected', res.errors.slice(0, 8));
      }
      content.demoEnabled = !!(M.store.prefs() && M.store.prefs().devPreview);
      return content.catalog;
    },

    setDemo: function (on) {
      content.demoEnabled = !!on;
      M.store.setPref('devPreview', !!on);
    },

    gradeLabel: function (g) {
      return GRADE_META[g] ? GRADE_META[g].label : '';
    },

    trackLabel: function (t) {
      return TRACK_META[t] ? TRACK_META[t].label : '';
    },

    /* ---- structural demo (no educational facts) ------------------------- */
    demoPack: function () {
      var profile = M.store.profile() || { grade: 7, track: null };
      var grade = profile.grade || 7;
      var track = grade >= 10 ? profile.track || 'math' : null;
      return {
        schemaVersion: 1,
        demo: true,
        updatedAt: null,
        books: [
          {
            id: 'demo-book',
            title: 'نمونهٔ ساختاری کتاب',
            subject: { id: 'demo-subject', title: 'درس نمونه' },
            grade: grade,
            track: track,
            academicYear: '۱۴۰۵–۱۴۰۶',
            edition: 'structural-demo',
            source: { kind: 'demo', note: 'داده‌ی ساختاری برای آزمون رابط — محتوای آموزشی نیست' },
            chapters: [
              {
                id: 'demo-chapter',
                order: 1,
                title: 'فصل نمونه',
                lessons: [
                  {
                    id: 'demo-lesson',
                    order: 1,
                    title: 'درس نمونه',
                    minutes: 12,
                    objectives: [],
                    sections: {},
                    source: { kind: 'demo', pages: '—' }
                  }
                ],
                exams: []
              }
            ],
            exams: [
              {
                id: 'demo-exam',
                title: 'آزمون نمونهٔ ساختاری',
                chapterId: 'demo-chapter',
                questions: [
                  {
                    id: 'demo-q1',
                    type: 'mcq',
                    prompt: 'پرسش نمونه است؛ گزینهٔ دوم را انتخاب کنید.',
                    options: ['گزینهٔ الف', 'گزینهٔ ب', 'گزینهٔ ج', 'گزینهٔ د'],
                    correct: [1],
                    explanation: 'پاسخ درست گزینهٔ دوم است.'
                  },
                  {
                    id: 'demo-q2',
                    type: 'truefalse',
                    prompt: 'این یک جملهٔ نمونه برای آزمون ساختاری است.',
                    correct: 'true',
                    explanation: 'این جمله فقط برای بررسی رابط ساخته شده است.'
                  },
                  {
                    id: 'demo-q3',
                    type: 'multi',
                    prompt: 'کدام گزینه‌ها نمونهٔ ساختاری‌اند؟',
                    options: ['نمونهٔ الف', 'نمونهٔ ب', 'نمونهٔ ج', 'نمونهٔ د'],
                    correct: [0, 2],
                    explanation: 'گزینه‌های یکم و سوم انتخاب می‌شوند.'
                  },
                  {
                    id: 'demo-q4',
                    type: 'numeric',
                    prompt: 'عدد ۱۲ را وارد کنید.',
                    answer: 12,
                    tolerance: 0,
                    explanation: 'پاسخ عددی ۱۲ است.'
                  }
                ]
              }
            ]
          }
        ]
      };
    },

    activeCatalog: function () {
      // Read the live preference: clearing user data resets prefs, and the
      // demo pack must disappear with it instead of lingering in a cached flag.
      var prefs = M.store.prefs();
      content.demoEnabled = prefs ? prefs.devPreview === true : content.demoEnabled;
      if (!content.demoEnabled) return content.catalog;
      var demo = content.demoPack();
      var merged = {
        schemaVersion: content.catalog.schemaVersion,
        updatedAt: content.catalog.updatedAt,
        demo: true,
        books: asArray(content.catalog.books).concat(demo.books)
      };
      return merged;
    },

    books: function (filter) {
      filter = filter || {};
      return asArray(content.activeCatalog().books).filter(function (b) {
        if (filter.grade && b.grade !== filter.grade) return false;
        if (filter.track !== undefined && filter.track !== null) {
          if (b.track !== filter.track) return false;
        }
        if (filter.includeDemo === false && b.id === 'demo-book') return false;
        return true;
      });
    },

    subjectsFor: function (grade, track) {
      var books = content.books({ grade: grade, track: track === undefined ? null : track });
      var map = {};
      var order = [];
      books.forEach(function (b) {
        var key = (b.subject && b.subject.id) || b.id;
        if (!map[key]) {
          map[key] = {
            id: key,
            title: (b.subject && b.subject.title) || b.title,
            books: [],
            lessonCount: 0,
            doneCount: 0,
            demo: !!b.demo || b.id === 'demo-book'
          };
          order.push(key);
        }
        map[key].books.push(b);
        asArray(b.chapters).forEach(function (ch) {
          asArray(ch.lessons).forEach(function (ls) {
            map[key].lessonCount += 1;
            if (M.store.isLessonDone(ls.id)) map[key].doneCount += 1;
          });
        });
      });
      return order.map(function (k) {
        return map[k];
      });
    },

    book: function (bookId) {
      return (
        asArray(content.activeCatalog().books).filter(function (b) {
          return b.id === bookId;
        })[0] || null
      );
    },

    chapters: function (bookId) {
      var b = content.book(bookId);
      if (!b) return [];
      return asArray(b.chapters)
        .slice()
        .sort(function (x, y) {
          return (x.order || 0) - (y.order || 0);
        });
    },

    chapter: function (bookId, chapterId) {
      return (
        content.chapters(bookId).filter(function (ch) {
          return ch.id === chapterId;
        })[0] || null
      );
    },

    lessonIndex: function () {
      var out = [];
      asArray(content.activeCatalog().books).forEach(function (b) {
        asArray(b.chapters).forEach(function (ch) {
          asArray(ch.lessons).forEach(function (ls) {
            out.push({
              lesson: ls,
              chapter: ch,
              book: b,
              route: '#/lesson/' + encodeURIComponent(b.id) + '/' + encodeURIComponent(ch.id) + '/' + encodeURIComponent(ls.id)
            });
          });
        });
      });
      return out;
    },

    findLesson: function (bookId, chapterId, lessonId) {
      return (
        content.lessonIndex().filter(function (row) {
          return row.book.id === bookId && row.chapter.id === chapterId && row.lesson.id === lessonId;
        })[0] || null
      );
    },

    findLessonById: function (lessonId) {
      return (
        content.lessonIndex().filter(function (row) {
          return row.lesson.id === lessonId;
        })[0] || null
      );
    },

    lessonCount: function () {
      return content.lessonIndex().length;
    },

    bookProgress: function (book) {
      var total = 0;
      var done = 0;
      asArray(book.chapters).forEach(function (ch) {
        asArray(ch.lessons).forEach(function (ls) {
          total += 1;
          if (M.store.isLessonDone(ls.id)) done += 1;
        });
      });
      return { total: total, done: done, percent: total ? (done / total) * 100 : 0 };
    },

    chapterProgress: function (chapter) {
      var total = asArray(chapter.lessons).length;
      var done = 0;
      asArray(chapter.lessons).forEach(function (ls) {
        if (M.store.isLessonDone(ls.id)) done += 1;
      });
      return { total: total, done: done, percent: total ? (done / total) * 100 : 0 };
    },

    exams: function () {
      var out = [];
      asArray(content.activeCatalog().books).forEach(function (b) {
        asArray(b.exams).forEach(function (ex) {
          out.push({ exam: ex, book: b });
        });
        asArray(b.chapters).forEach(function (ch) {
          asArray(ch.exams).forEach(function (ex) {
            out.push({ exam: ex, book: b, chapter: ch });
          });
        });
      });
      return out;
    },

    exam: function (examId) {
      var row = content.exams().filter(function (r) {
        return r.exam.id === examId;
      })[0];
      return row || null;
    },

    search: function (query) {
      var q = util.toEn(String(query || '')).trim().toLowerCase();
      if (!q) return [];
      var out = [];
      asArray(content.activeCatalog().books).forEach(function (b) {
        var subject = (b.subject && b.subject.title) || '';
        var hay = (b.title + ' ' + subject).toLowerCase();
        if (hay.indexOf(q) !== -1) {
          out.push({
            kind: 'book',
            title: b.title,
            meta: subject + ' — پایهٔ ' + content.gradeLabel(b.grade),
            route: '#/book/' + encodeURIComponent(b.id)
          });
        }
        asArray(b.chapters).forEach(function (ch) {
          if ((ch.title || '').toLowerCase().indexOf(q) !== -1) {
            out.push({
              kind: 'chapter',
              title: ch.title,
              meta: subject + ' — ' + b.title,
              route: '#/book/' + encodeURIComponent(b.id) + '/' + encodeURIComponent(ch.id)
            });
          }
          asArray(ch.lessons).forEach(function (ls) {
            if ((ls.title || '').toLowerCase().indexOf(q) !== -1) {
              out.push({
                kind: 'lesson',
                title: ls.title,
                meta: subject + ' — ' + ch.title,
                route:
                  '#/lesson/' +
                  encodeURIComponent(b.id) +
                  '/' +
                  encodeURIComponent(ch.id) +
                  '/' +
                  encodeURIComponent(ls.id)
              });
            }
          });
        });
      });
      return out.slice(0, 12);
    },

    /* Sections a lesson page always offers, whether or not content exists. */
    sectionPlan: function (lesson) {
      var provided = (lesson && lesson.sections) || {};
      return SECTIONS.map(function (spec) {
        return {
          key: spec.key,
          label: spec.label,
          icon: spec.icon,
          hasContent: !!provided[spec.key],
          data: provided[spec.key] || null
        };
      });
    },

    hasAnyContent: function () {
      return asArray(content.activeCatalog().books).some(function (b) {
        return b.id !== 'demo-book';
      });
    }
  });

  /* Multi-source exam questions live on books, chapters and lessons in phase 02. */
  content.questionsFor = function (exam) {
    if (!exam || !Array.isArray(exam.questions)) return [];
    return exam.questions.filter(function (q) {
      return q && q.id && q.type;
    });
  };
})(window);
