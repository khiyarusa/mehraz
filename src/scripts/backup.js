/* ==========================================================================
   MEHRAZ — backup / restore
   A plain JSON document the student owns. Validation happens before anything
   is written, and the existing data is only replaced after explicit consent.
   ========================================================================== */
(function (window) {
  'use strict';

  var M = window.MEHRAZ;
  var util = M.util;

  var FORMAT = 'mehraz-backup';
  var FORMAT_VERSION = 1;
  var MAX_BYTES = 12 * 1024 * 1024;

  function isObj(v) {
    return util.isPlainObject(v);
  }

  function build() {
    var payload = M.store.exportPayload();
    var lessons = payload.progress && payload.progress.lessons ? payload.progress.lessons : {};
    var done = 0;
    Object.keys(lessons).forEach(function (id) {
      if (lessons[id] && lessons[id].status === 'done') done += 1;
    });
    return {
      format: FORMAT,
      formatVersion: FORMAT_VERSION,
      schemaVersion: M.schemaVersion,
      exportedAt: util.nowISO(),
      app: {
        name: 'MEHRAZ',
        version: M.version,
        channel: M.build.channel,
        locale: 'fa-IR',
        timezoneOffset: new Date().getTimezoneOffset()
      },
      summary: {
        hasProfile: !!payload.profile,
        displayName: payload.profile ? payload.profile.displayName : null,
        grade: payload.profile ? payload.profile.grade : null,
        track: payload.profile ? payload.profile.track : null,
        lessonsDone: done,
        lessonsTracked: Object.keys(lessons).length,
        examAttempts: payload.exams && payload.exams.attempts ? payload.exams.attempts.length : 0,
        reviewItems: payload.review && payload.review.items ? payload.review.items.length : 0,
        activityEntries: payload.activity ? payload.activity.length : 0
      },
      payload: payload
    };
  }

  function filename() {
    var p = M.store.profile();
    var name = p ? util.toEn(p.displayName).replace(/[^A-Za-z0-9\u0600-\u06FF_-]+/g, '-') : 'student';
    var j = M.jalali.today();
    var stamp =
      j.jy + '-' + String(j.jm).padStart(2, '0') + '-' + String(j.jd).padStart(2, '0');
    return 'mehraz-backup-' + name + '-' + stamp + '.json';
  }

  function serialize() {
    return JSON.stringify(build(), null, 2);
  }

  function download() {
    var text = serialize();
    var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename();
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    window.setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1200);
    return { bytes: blob.size, name: a.download };
  }

  function validateProfile(p) {
    var errors = [];
    if (!p) return errors;
    if (!isObj(p)) {
      errors.push('پروفایل باید یک شیء باشد.');
      return errors;
    }
    if (typeof p.displayName !== 'string' || !p.displayName.trim()) {
      errors.push('نام نمایشی در پشتیبان معتبر نیست.');
    }
    if ([7, 8, 9, 10, 11, 12].indexOf(Number(p.grade)) === -1) {
      errors.push('پایهٔ تحصیلی در پشتیبان معتبر نیست.');
    }
    if (Number(p.grade) >= 10 && ['math', 'experimental', 'humanities'].indexOf(p.track) === -1) {
      errors.push('رشتهٔ تحصیلی در پشتیبان معتبر نیست.');
    }
    if (p.birthDate) {
      if (!isObj(p.birthDate) || !M.jalali.isValid(p.birthDate.jy, p.birthDate.jm, p.birthDate.jd)) {
        errors.push('تاریخ تولد در پشتیبان معتبر نیست.');
      }
    }
    return errors;
  }

  function parse(text) {
    var errors = [];
    var warnings = [];
    var result = { ok: false, data: null, errors: errors, warnings: warnings, summary: null };

    if (typeof text !== 'string' || !text.trim()) {
      errors.push('فایل پشتیبان خالی است.');
      return result;
    }
    var bytes = 0;
    try {
      bytes = new Blob([text]).size;
    } catch (err) {
      bytes = text.length;
    }
    if (bytes > MAX_BYTES) {
      errors.push('حجم فایل پشتیبان بیش از حد مجاز است.');
      return result;
    }

    var parsed = util.safeParse(text);
    if (!parsed.ok) {
      errors.push('فایل پشتیبان قابل خواندن نیست.');
      return result;
    }
    var data = parsed.value;

    if (!isObj(data)) {
      errors.push('ریشهٔ فایل پشتیبان باید یک شیء باشد.');
      return result;
    }
    if (data.format !== FORMAT) {
      errors.push('این فایل، پشتیبان مهراز نیست.');
      return result;
    }
    if (typeof data.formatVersion !== 'number' || data.formatVersion < 1) {
      errors.push('نسخهٔ قالب پشتیبان مشخص نیست.');
      return result;
    }
    if (data.formatVersion > FORMAT_VERSION) {
      errors.push(
        'این پشتیبان با نسخهٔ جدیدتری از برنامه ساخته شده است (قالب ' +
          util.toFa(data.formatVersion) +
          '). برای بازیابی، برنامه را به‌روزرسانی کنید.'
      );
      return result;
    }
    if (typeof data.schemaVersion !== 'number') {
      errors.push('نسخهٔ داده‌های پشتیبان مشخص نیست.');
      return result;
    }
    if (data.schemaVersion > M.schemaVersion) {
      errors.push(
        'داده‌های این پشتیبان از نسخهٔ فعلی برنامه جدیدتر است (نسخهٔ ' +
          util.toFa(data.schemaVersion) +
          '). برای جلوگیری از آسیب به اطلاعات، بازیابی انجام نشد.'
      );
      return result;
    }
    if (data.schemaVersion < M.schemaVersion) {
      warnings.push('این پشتیبان از نسخهٔ قدیمی‌تر است؛ داده‌ها به‌صورت سازگار تبدیل می‌شوند.');
    }

    var payload = data.payload;
    if (!isObj(payload)) {
      errors.push('بخش داده‌های پشتیبان یافت نشد.');
      return result;
    }

    validateProfile(payload.profile).forEach(function (msg) {
      errors.push(msg);
    });

    if (payload.progress && !isObj(payload.progress)) {
      errors.push('بخش پیشرفت تحصیلی معتبر نیست.');
    }
    if (payload.exams && !isObj(payload.exams)) {
      errors.push('بخش آزمون‌ها معتبر نیست.');
    }
    if (payload.review && !isObj(payload.review)) {
      errors.push('بخش مرور معتبر نیست.');
    }
    if (payload.activity && !Array.isArray(payload.activity)) {
      errors.push('بخش فعالیت‌ها معتبر نیست.');
    }
    if (payload.prefs && !isObj(payload.prefs)) {
      warnings.push('تنظیمات ظاهری نادیده گرفته می‌شود.');
    }

    var lessonMap =
      payload.progress && isObj(payload.progress.lessons) ? payload.progress.lessons : {};
    var attempts =
      payload.exams && Array.isArray(payload.exams.attempts) ? payload.exams.attempts : [];
    var reviewItems =
      payload.review && Array.isArray(payload.review.items) ? payload.review.items : [];
    var activity = Array.isArray(payload.activity) ? payload.activity : [];

    result.ok = errors.length === 0;
    result.data = data;
    result.summary = {
      displayName: payload.profile ? String(payload.profile.displayName || '') : '',
      grade: payload.profile ? Number(payload.profile.grade) : null,
      track: payload.profile ? payload.profile.track || null : null,
      birthDate:
        payload.profile && payload.profile.birthDate && M.jalali.isValid(
          payload.profile.birthDate.jy,
          payload.profile.birthDate.jm,
          payload.profile.birthDate.jd
        )
          ? M.jalali.format(
              payload.profile.birthDate.jy,
              payload.profile.birthDate.jm,
              payload.profile.birthDate.jd
            )
          : '—',
      exportedAt: data.exportedAt || null,
      exportedLabel: data.exportedAt
        ? util.relTime(data.exportedAt) + ' (' + M.jalali.formatISO(new Date(data.exportedAt).getTime()) + ')'
        : '—',
      lessonsTracked: Object.keys(lessonMap).length,
      lessonsDone: Object.keys(lessonMap).filter(function (id) {
        return lessonMap[id] && lessonMap[id].status === 'done';
      }).length,
      examAttempts: attempts.length,
      reviewItems: reviewItems.length,
      activityEntries: activity.length,
      appVersion: data.app && data.app.version ? String(data.app.version) : '—'
    };
    return result;
  }

  function parseFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error('فایلی انتخاب نشد.'));
        return;
      }
      if (file.size > MAX_BYTES) {
        reject(new Error('حجم فایل پشتیبان بیش از حد مجاز است.'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || ''));
      };
      reader.onerror = function () {
        reject(new Error('خواندن فایل ممکن نشد.'));
      };
      reader.readAsText(file, 'utf-8');
    });
  }

  function apply(validated) {
    if (!validated || !validated.ok) return Promise.resolve(false);
    return M.store.importPayload(validated.data.payload);
  }

  M.backup = {
    FORMAT: FORMAT,
    FORMAT_VERSION: FORMAT_VERSION,
    build: build,
    serialize: serialize,
    filename: filename,
    download: download,
    parse: parse,
    parseFile: parseFile,
    apply: apply
  };
})(window);
