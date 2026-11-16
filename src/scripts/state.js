/* ==========================================================================
   MEHRAZ — application state
   One documented namespace (window.MEHRAZ.store) owns all mutable state.
   Writes are debounced, then persisted through the storage adapter.
   ========================================================================== */
(function (window) {
  'use strict';

  var M = window.MEHRAZ;
  var util = M.util;

  var GRADES = [7, 8, 9, 10, 11, 12];
  var TRACKS = ['math', 'experimental', 'humanities'];
  var ACTIVITY_CAP = 400;
  var ATTEMPT_CAP = 200;

  function defaultState() {
    return {
      schemaVersion: M.schemaVersion,
      profile: null,
      prefs: {
        theme: 'light',
        motion: 'system',
      },
      progress: {
        lessons: {},
        chapters: {}
      },
      exams: {
        attempts: []
      },
      review: {
        items: []
      },
      activity: [],
      meta: {
        createdAt: util.nowISO(),
        updatedAt: util.nowISO(),
        appVersion: M.version,
        installId: util.uid('mz')
      }
    };
  }

  function isObject(v) {
    return util.isPlainObject(v);
  }

  function normalizeProfile(p) {
    if (!isObject(p)) return null;
    var name = typeof p.displayName === 'string' ? p.displayName.trim() : '';
    if (!name) return null;
    var grade = Number(p.grade);
    if (GRADES.indexOf(grade) === -1) return null;
    var track = p.track === null || p.track === undefined ? null : String(p.track);
    if (grade >= 10 && TRACKS.indexOf(track) === -1) return null;
    if (grade < 10) track = null;
    var birth = isObject(p.birthDate) ? p.birthDate : {};
    var jy = Number(birth.jy);
    var jm = Number(birth.jm);
    var jd = Number(birth.jd);
    var validBirth = M.jalali.isValid(jy, jm, jd);
    return {
      id: typeof p.id === 'string' && p.id ? p.id : util.uid('stu'),
      displayName: name.slice(0, 40),
      birthDate: validBirth
        ? { jy: jy, jm: jm, jd: jd, iso: M.jalali.toISO(jy, jm, jd) }
        : null,
      grade: grade,
      track: track,
      createdAt: p.createdAt || util.nowISO(),
      updatedAt: p.updatedAt || util.nowISO()
    };
  }

  function normalizeState(raw) {
    var base = defaultState();
    if (!isObject(raw)) return base;

    var out = {};
    var k;
    for (k in raw) {
      if (Object.prototype.hasOwnProperty.call(raw, k)) out[k] = raw[k];
    }
    out.schemaVersion = M.schemaVersion;

    out.profile = normalizeProfile(raw.profile);

    if (isObject(raw.prefs)) {
      base.prefs.theme = raw.prefs.theme === 'night' ? 'night' : 'light';
      base.prefs.motion = raw.prefs.motion === 'reduced' ? 'reduced' : 'system';
    }
    out.prefs = base.prefs;

    if (isObject(raw.progress)) {
      base.progress.lessons = isObject(raw.progress.lessons) ? raw.progress.lessons : {};
      base.progress.chapters = isObject(raw.progress.chapters) ? raw.progress.chapters : {};
    }
    out.progress = base.progress;

    if (isObject(raw.exams) && Array.isArray(raw.exams.attempts)) {
      base.exams.attempts = raw.exams.attempts.filter(function (a) {
        return isObject(a) && a.id && a.examId;
      }).slice(-ATTEMPT_CAP);
    }
    out.exams = base.exams;

    if (isObject(raw.review) && Array.isArray(raw.review.items)) {
      base.review.items = raw.review.items.filter(function (it) {
        return isObject(it) && it.id;
      });
    }
    out.review = base.review;

    if (Array.isArray(raw.activity)) {
      base.activity = raw.activity.filter(isObject).slice(-ACTIVITY_CAP);
    }
    out.activity = base.activity;

    if (isObject(raw.meta)) {
      base.meta.createdAt = raw.meta.createdAt || base.meta.createdAt;
      base.meta.installId = raw.meta.installId || base.meta.installId;
    }
    base.meta.updatedAt = util.nowISO();
    base.meta.appVersion = M.version;
    out.meta = base.meta;

    return out;
  }

  var listeners = [];
  var saveTimer = null;

  var store = (M.store = {
    state: defaultState(),
    ready: false,
    futureData: false,
    storageIssue: false,
    loadInfo: null,

    GRADES: GRADES,
    TRACKS: TRACKS,

    init: function () {
      store.futureData = false;
      return M.storage.get().then(function (raw) {
        if (raw && typeof raw.schemaVersion === 'number' && raw.schemaVersion > M.schemaVersion) {
          store.futureData = true;
          store.state = defaultState();
          store.loadInfo = { future: true, version: raw.schemaVersion };
          M.diag.record('note', 'stored data is newer than this build; writes disabled');
        } else {
          store.state = normalizeState(raw);
          store.loadInfo = { future: false, existed: !!raw };
        }
        store.ready = true;
        return store.state;
      });
    },

    /* Mutate state in one place, then persist. */
    update: function (mutator, reason) {
      if (typeof mutator === 'function') mutator(store.state);
      // Every write path shares the same cap; several mutators used to append
      // to activity without trimming it.
      if (Array.isArray(store.state.activity) && store.state.activity.length > ACTIVITY_CAP) {
        store.state.activity = store.state.activity.slice(-ACTIVITY_CAP);
      }
      store.state.meta.updatedAt = util.nowISO();
      store.schedule(reason);
      return store.state;
    },

    schedule: function (reason) {
      if (store.futureData) return;
      if (saveTimer) window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(function () {
        saveTimer = null;
        store.flush(reason);
      }, M.config.persistDelay);
    },

    flush: function (reason) {
      if (store.futureData) return Promise.resolve(false);
      return M.storage.set(store.state).then(function (ok) {
        store.storageIssue = !ok;
        listeners.forEach(function (fn) {
          try {
            fn(store.state, { type: 'persist', ok: ok, reason: reason });
          } catch (err) {
            M.diag.record('error', err.message, { scope: 'store.listener' });
          }
        });
        return ok;
      });
    },

    subscribe: function (fn) {
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (f) {
          return f !== fn;
        });
      };
    },

    notify: function (payload) {
      listeners.forEach(function (fn) {
        try {
          fn(store.state, payload || {});
        } catch (err) {
          M.diag.record('error', err.message, { scope: 'store.listener' });
        }
      });
    },

    /* ---- profile -------------------------------------------------------- */
    profile: function () {
      return store.state.profile;
    },

    hasProfile: function () {
      return !!store.state.profile;
    },

    saveProfile: function (profile) {
      var clean = normalizeProfile(profile);
      if (!clean) return null;
      clean.updatedAt = util.nowISO();
      store.update(function (s) {
        if (s.profile && s.profile.createdAt) clean.createdAt = s.profile.createdAt;
        s.profile = clean;
        s.activity.push({
          id: util.uid('act'),
          type: 'profile.saved',
          at: util.nowISO(),
          meta: { grade: clean.grade }
        });
      }, 'profile');
      return clean;
    },

    /* ---- preferences ---------------------------------------------------- */
    prefs: function () {
      return store.state.prefs;
    },

    setPref: function (key, value) {
      store.update(function (s) {
        s.prefs[key] = value;
      }, 'prefs');
    },

    /* ---- progress ------------------------------------------------------- */
    lessonState: function (lessonId) {
      return (
        store.state.progress.lessons[lessonId] || {
          status: 'not-started',
          openedAt: null,
          completedAt: null,
          section: 0
        }
      );
    },

    touchLesson: function (lessonId, extra) {
      if (!lessonId) return;
      store.update(function (s) {
        var cur = s.progress.lessons[lessonId] || { status: 'not-started' };
        if (cur.status !== 'done') cur.status = 'in-progress';
        cur.openedAt = cur.openedAt || util.nowISO();
        cur.lastOpenedAt = util.nowISO();
        if (extra && typeof extra.section === 'number') cur.section = extra.section;
        s.progress.lessons[lessonId] = cur;
        s.activity.push({
          id: util.uid('act'),
          type: 'lesson.opened',
          at: util.nowISO(),
          meta: { lessonId: lessonId }
        });
        if (s.activity.length > ACTIVITY_CAP) s.activity = s.activity.slice(-ACTIVITY_CAP);
      }, 'lesson.open');
    },

    completeLesson: function (lessonId) {
      if (!lessonId) return;
      store.update(function (s) {
        var cur = s.progress.lessons[lessonId] || { status: 'in-progress' };
        cur.status = 'done';
        cur.completedAt = cur.completedAt || util.nowISO();
        cur.lastOpenedAt = util.nowISO();
        s.progress.lessons[lessonId] = cur;
        s.activity.push({
          id: util.uid('act'),
          type: 'lesson.completed',
          at: util.nowISO(),
          meta: { lessonId: lessonId }
        });
        if (s.activity.length > ACTIVITY_CAP) s.activity = s.activity.slice(-ACTIVITY_CAP);
      }, 'lesson.done');
    },

    isLessonDone: function (lessonId) {
      var st = store.state.progress.lessons[lessonId];
      return !!(st && st.status === 'done');
    },

    /* ---- exams ---------------------------------------------------------- */
    addAttempt: function (attempt) {
      store.update(function (s) {
        s.exams.attempts.push(attempt);
        if (s.exams.attempts.length > ATTEMPT_CAP) s.exams.attempts = s.exams.attempts.slice(-ATTEMPT_CAP);
        s.activity.push({
          id: util.uid('act'),
          type: 'exam.finished',
          at: util.nowISO(),
          meta: {
            examId: attempt.examId,
            score: attempt.score,
            total: attempt.total
          }
        });
        if (s.activity.length > ACTIVITY_CAP) s.activity = s.activity.slice(-ACTIVITY_CAP);
      }, 'exam.attempt');
    },

    attempts: function (examId) {
      var all = store.state.exams.attempts.slice();
      if (!examId) return all;
      return all.filter(function (a) {
        return a.examId === examId;
      });
    },

    /* ---- review --------------------------------------------------------- */
    reviewItems: function () {
      return store.state.review.items;
    },

    dueReviewItems: function () {
      var now = Date.now();
      return store.state.review.items.filter(function (it) {
        return it.status !== 'done' && (!it.dueAt || new Date(it.dueAt).getTime() <= now);
      });
    },

    completeReview: function (itemId) {
      store.update(function (s) {
        s.review.items.forEach(function (it) {
          if (it.id === itemId) {
            it.status = 'done';
            it.doneAt = util.nowISO();
          }
        });
        s.activity.push({
          id: util.uid('act'),
          type: 'review.done',
          at: util.nowISO(),
          meta: { itemId: itemId }
        });
      }, 'review.done');
    },

    /* ---- activity + derived stats --------------------------------------- */
    activityFor: function (dayKey) {
      return store.state.activity.filter(function (a) {
        return util.dayKey(a.at) === dayKey;
      });
    },

    weekActivity: function () {
      var start = util.startOfWeek();
      var days = [];
      for (var i = 0; i < 7; i += 1) {
        var d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        d.setDate(d.getDate() + i);
        var key = util.dayKey(d.toISOString());
        days.push({
          key: key,
          label: util.monthShort(M.jalali.toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()).jm),
          day: M.jalali.toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()).jd,
          count: store.activityFor(key).length,
          isToday: key === util.todayKey()
        });
      }
      return days;
    },

    stats: function (lessonIds) {
      var known = Array.isArray(lessonIds) ? lessonIds : null;
      var lessons = store.state.progress.lessons;
      var done = 0;
      Object.keys(lessons).forEach(function (id) {
        if (!lessons[id] || lessons[id].status !== 'done') return;
        if (known && known.indexOf(id) === -1) return;
        done += 1;
      });
      var attempts = store.state.exams.attempts;
      var scored = attempts.filter(function (a) {
        return typeof a.score === 'number' && a.total > 0;
      });
      var avg = 0;
      if (scored.length) {
        var sum = scored.reduce(function (acc, a) {
          return acc + (a.score / a.total) * 100;
        }, 0);
        avg = sum / scored.length;
      }
      var totalLessons = known ? known.length : 0;
      return {
        lessonsDone: done,
        lessonsTotal: totalLessons,
        lessonPercent: totalLessons ? util.clamp((done / totalLessons) * 100, 0, 100) : 0,
        examsTaken: attempts.length,
        averagePercent: avg,
        reviewDue: store.dueReviewItems().length,
        reviewTotal: store.state.review.items.filter(function (i) {
          return i.status !== 'done';
        }).length
      };
    },

    clearUserData: function (keepPrefs) {
      var prefs = util.clone(store.state.prefs);
      store.state = defaultState();
      if (keepPrefs) store.state.prefs = prefs;
      return store.flush('clear');
    },

    exportPayload: function () {
      return {
        profile: util.clone(store.state.profile),
        prefs: util.clone(store.state.prefs),
        progress: util.clone(store.state.progress),
        exams: util.clone(store.state.exams),
        review: util.clone(store.state.review),
        activity: util.clone(store.state.activity)
      };
    },

    importPayload: function (payload) {
      store.state = normalizeState({
        schemaVersion: M.schemaVersion,
        profile: payload.profile,
        prefs: payload.prefs,
        progress: payload.progress,
        exams: payload.exams,
        review: payload.review,
        activity: payload.activity,
        meta: store.state.meta
      });
      return store.flush('import');
    }
  });
})(window);
