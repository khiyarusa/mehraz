/* ==========================================================================
   MEHRAZ — Jalali calendar
   Deterministic conversion and validation (algorithm after the well-known
   Borkowski / jalaali-js 33-year cycle method). No external calls, no tables
   loaded from disk, works in any browser at any year 1178–3177.
   ========================================================================== */
(function (window) {
  'use strict';

  var M = window.MEHRAZ;
  var util = M.util;

  var BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

  function div(a, b) {
    return ~~(a / b);
  }

  function mod(a, b) {
    return a - ~~(a / b) * b;
  }

  function jalCal(jy, withoutLeap) {
    var bl = BREAKS.length;
    var gy = jy + 621;
    var leapJ = -14;
    var jp = BREAKS[0];
    var jump = 0;
    var leap = 0;
    var leapG;
    var march;
    var n;
    var i;
    var jm;

    if (jy < jp || jy >= BREAKS[bl - 1]) {
      throw new Error('Invalid Jalaali year ' + jy);
    }

    for (i = 1; i < bl; i += 1) {
      jm = BREAKS[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }

    n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

    leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    march = 20 + leapJ - leapG;

    if (!withoutLeap) {
      if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
      leap = mod(mod(n + 1, 33) - 1, 4);
      if (leap === -1) leap = 4;
    }

    return { leap: leap, gy: gy, march: march };
  }

  function g2d(gy, gm, gd) {
    var d =
      div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }

  function d2g(jdn) {
    var j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    var i = div(mod(j, 1461), 4) * 5 + 308;
    var gd = div(mod(i, 153), 5) + 1;
    var gm = mod(div(i, 153), 12) + 1;
    var gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy: gy, gm: gm, gd: gd };
  }

  function j2d(jy, jm, jd) {
    var r = jalCal(jy, true);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }

  function d2j(jdn) {
    var gy = d2g(jdn).gy;
    var jy = gy - 621;
    var r = jalCal(jy, false);
    var jdn1f = g2d(gy, 3, r.march);
    var k = jdn - jdn1f;
    var jm;
    var jd;

    if (k >= 0) {
      if (k <= 185) {
        jm = 1 + div(k, 31);
        jd = mod(k, 31) + 1;
        return { jy: jy, jm: jm, jd: jd };
      }
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
    return { jy: jy, jm: jm, jd: jd };
  }

  var jalali = (M.jalali = {});

  jalali.months = [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند'
  ];

  jalali.weekdays = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

  jalali.toJalali = function (gy, gm, gd) {
    return d2j(g2d(gy, gm, gd));
  };

  jalali.toGregorian = function (jy, jm, jd) {
    return d2g(j2d(jy, jm, jd));
  };

  jalali.isLeap = function (jy) {
    try {
      return jalCal(jy, false).leap === 0;
    } catch (err) {
      return false;
    }
  };

  jalali.monthLength = function (jy, jm) {
    if (jm <= 0 || jm > 12) return 0;
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return jalali.isLeap(jy) ? 30 : 29;
  };

  jalali.isValid = function (jy, jm, jd) {
    jy = Number(jy);
    jm = Number(jm);
    jd = Number(jd);
    if (!jy || !jm || !jd) return false;
    if (!isFinite(jy) || !isFinite(jm) || !isFinite(jd)) return false;
    if (jy < 1178 || jy > 3177) return false;
    if (jm < 1 || jm > 12) return false;
    if (jd < 1) return false;
    return jd <= jalali.monthLength(jy, jm);
  };

  jalali.today = function () {
    var now = new Date();
    return jalali.toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  };

  jalali.format = function (jy, jm, jd, opts) {
    opts = opts || {};
    if (!jalali.isValid(jy, jm, jd)) return '—';
    var out = util.toFa(jd) + ' ' + jalali.months[jm - 1] + ' ' + util.toFa(jy);
    if (opts.weekday) {
      var g = jalali.toGregorian(jy, jm, jd);
      var d = new Date(g.gy, g.gm - 1, g.gd);
      out = jalali.weekdays[d.getDay()] + '، ' + out;
    }
    return out;
  };

  jalali.formatISO = function (millis) {
    var d = millis ? new Date(millis) : new Date();
    var j = jalali.toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return jalali.format(j.jy, j.jm, j.jd);
  };

  jalali.formatNow = function (opts) {
    var j = jalali.today();
    return jalali.format(j.jy, j.jm, j.jd, opts);
  };

  jalali.toISO = function (jy, jm, jd) {
    var g = jalali.toGregorian(jy, jm, jd);
    return (
      g.gy + '-' + String(g.gm).padStart(2, '0') + '-' + String(g.gd).padStart(2, '0')
    );
  };

  jalali.fromISO = function (iso) {
    var parts = String(iso || '').split('-').map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
    return jalali.toJalali(parts[0], parts[1], parts[2]);
  };

  jalali.ageYears = function (jy, jm, jd) {
    if (!jalali.isValid(jy, jm, jd)) return null;
    var t = jalali.today();
    var age = t.jy - jy;
    if (t.jm < jm || (t.jm === jm && t.jd < jd)) age -= 1;
    return age >= 0 && age < 130 ? age : null;
  };

  jalali.daysBetween = function (aISO, bISO) {
    var a = new Date(aISO);
    var b = new Date(bISO);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  };

  jalali.addDays = function (iso, days) {
    var d = new Date(iso);
    d.setDate(d.getDate() + Number(days || 0));
    return d.toISOString();
  };

  jalali.yearRange = function (span) {
    var t = jalali.today();
    var out = [];
    for (var y = t.jy - (span || 30); y <= t.jy; y += 1) out.push(y);
    return out;
  };
})(window);
