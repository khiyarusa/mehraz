/* ==========================================================================
   MEHRAZ — content engine
   The catalogue is embedded at build time (window.MEHRAZ_CONTENT). PROMPT 01
   ships the contract and the renderer, never the educational content; content
   is added only from validated sources, never as sample data.
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
    generator: 'prompt-01',
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
    loaded: false,
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
      return content.catalog;
    },

    gradeLabel: function (g) {
      return GRADE_META[g] ? GRADE_META[g].label : '';
    },

    trackLabel: function (t) {
      return TRACK_META[t] ? TRACK_META[t].label : '';
    },

    activeCatalog: function () {
      return content.catalog;
    },
    books: function (filter) {
      filter = filter || {};
      return asArray(content.activeCatalog().books).filter(function (b) {
        if (filter.grade && b.grade !== filter.grade) return false;
        if (filter.track !== undefined && filter.track !== null) {
          if (b.track !== filter.track) return false;
        }
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
            incomplete: false
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

    /* Lesson ids that belong to the student's own shelf. Counts must use this
       set, otherwise "3 of 360" mixes the student's shelf with the catalogue. */
    lessonIdsFor: function (grade, track) {
      return content
        .lessonIndex()
        .filter(function (row) {
          if (grade && row.book.grade !== grade) return false;
          if (track !== undefined && track !== null && row.book.track !== track) return false;
          return true;
        })
        .map(function (row) {
          return row.lesson.id;
        });
    },

    lessonCountFor: function (grade, track) {
      return content.lessonIdsFor(grade, track).length;
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
        var data = provided[spec.key];
        // A key that exists but carries no blocks must not render an empty panel.
        var hasContent = !!(
          data &&
          ((Array.isArray(data.blocks) && data.blocks.length > 0) ||
            typeof data === 'string' ||
            (data.text && String(data.text).trim()))
        );
        return {
          key: spec.key,
          label: spec.label,
          icon: spec.icon,
          hasContent: hasContent,
          data: hasContent ? data : null
        };
      });
    },

    hasAnyContent: function () {
      return asArray(content.activeCatalog().books).some(function (b) {
        return true;
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
