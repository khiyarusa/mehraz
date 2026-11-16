/* ==========================================================================
   MEHRAZ — welcome, onboarding, profile editing
   The first minute decides everything: one clear promise, one obvious action,
   four short steps, and a confirmation that reads like a summary, not a form.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var M = window.MEHRAZ;
  var util = M.util;
  var esc = util.esc;
  var views = (M.views = M.views || {});

  function yearOptions() {
    var today = M.jalali.today();
    var out = [];
    for (var y = today.jy - 9; y >= today.jy - 25; y -= 1) out.push(y);
    return out;
  }

  function stepList(grade) {
    var list = ['name', 'birth', 'grade'];
    if (Number(grade) >= 10) list.push('track');
    list.push('confirm');
    return list;
  }

  function dayOptions(jy, jm) {
    var len = jy && jm ? M.jalali.monthLength(jy, jm) : 31;
    var out = [];
    for (var d = 1; d <= len; d += 1) out.push(d);
    return out;
  }

  function selectOptions(items, selected, placeholder, labelFn) {
    var out = placeholder
      ? '<option value=""' + (selected ? '' : ' selected') + ' disabled>' + esc(placeholder) + '</option>'
      : '';
    items.forEach(function (item) {
      var value = typeof item === 'object' ? item.value : item;
      var label = typeof item === 'object' ? item.label : labelFn ? labelFn(item) : util.toFa(item);
      out +=
        '<option value="' + esc(value) + '"' + (String(selected) === String(value) ? ' selected' : '') + '>' +
        esc(label) + '</option>';
    });
    return out;
  }

  /* ---- welcome ---------------------------------------------------------- */
  views.welcome = function () {
    var html =
      '<section class="hero" style="min-height:min(600px,82vh);display:flex;align-items:center">' +
      '<div class="hero__body" style="width:100%;align-items:center">' +
      '<div class="hero__text">' +
      '<div style="margin-bottom:22px">' + M.brand({ onDark: true }) + '</div>' +
      '<h1 style="font-size:clamp(1.9rem,5.2vw,2.9rem);line-height:1.36">هر درس، یک قدم روشن‌تر</h1>' +
      '<p class="hero__sub" style="font-size:var(--fs-14);max-width:42ch">' +
      'مهراز فضایی آرام برای یادگیری است: درس‌ها را می‌خوانید، تمرین می‌کنید، آزمون می‌دهید و هر چند وقت یک‌بار مرور می‌کنید — همه در یک جا و به‌ترتیب.' +
      '</p>' +
      '<div class="hero__actions" style="margin-top:26px">' +
      '<a class="btn btn--primary btn--lg" href="#/onboarding">شروع یادگیری' + M.icon('arrowStart', 18) + '</a>' +
      '<button class="btn btn--ghost btn--lg hero__ghost" type="button" data-import>بازیابی پشتیبان</button>' +
      '</div>' +
      '<div class="row row--wrap" style="margin-top:26px;gap:18px;color:rgba(255,255,255,.72)">' +
      '<span class="row" style="gap:7px;font-size:var(--fs-12)">' + M.icon('book', 15) + 'درس‌ها</span>' +
      '<span class="row" style="gap:7px;font-size:var(--fs-12)">' + M.icon('edit', 15) + 'تمرین</span>' +
      '<span class="row" style="gap:7px;font-size:var(--fs-12)">' + M.icon('exam', 15) + 'آزمون</span>' +
      '<span class="row" style="gap:7px;font-size:var(--fs-12)">' + M.icon('review', 15) + 'مرور</span>' +
      '</div>' +
      '</div>' +
      '<div class="hero__art" style="min-height:300px">' + M.art.orbit({ pct: 0 }) + '</div>' +
      '</div></section>';

    return {
      title: 'خوش آمدید',
      nav: '',
      html: html,
      onMount: function (root) {
        var restore = util.$('[data-import]', root);
        if (restore) {
          restore.addEventListener('click', function () {
            M.app.openImport();
          });
        }
      }
    };
  };

  /* ---- onboarding / edit ------------------------------------------------ */
  function createController(mode) {
    var existing = M.store.profile();
    var isEdit = mode === 'edit' && !!existing;
    var draft = {
      displayName: existing ? existing.displayName : '',
      jy: existing && existing.birthDate ? existing.birthDate.jy : '',
      jm: existing && existing.birthDate ? existing.birthDate.jm : '',
      jd: existing && existing.birthDate ? existing.birthDate.jd : '',
      grade: existing ? existing.grade : '',
      track: existing ? existing.track || '' : ''
    };
    var steps = stepList(draft.grade);
    var index = isEdit ? steps.length - 1 : 0;
    var error = '';
    var host = null;
    var yearList = yearOptions();

    function currentStep() { return steps[index]; }

    function setError(msg) {
      error = msg || '';
      render();
      util.announce(error);
    }

    function validName() {
      var name = String(draft.displayName || '').trim();
      if (!name) return 'نام نمایشی را وارد کنید.';
      if (name.length < 2) return 'نام نمایشی باید حداقل ۲ نویسه باشد.';
      if (name.length > 40) return 'نام نمایشی حداکثر ۴۰ نویسه است.';
      return '';
    }

    function validBirth() {
      if (!draft.jy || !draft.jm || !draft.jd) return 'روز، ماه و سال تولد را کامل انتخاب کنید.';
      if (!M.jalali.isValid(draft.jy, draft.jm, draft.jd)) return 'این تاریخ در تقویم شمسی وجود ندارد.';
      var iso = M.jalali.toISO(draft.jy, draft.jm, draft.jd);
      if (new Date(iso).getTime() > Date.now()) return 'تاریخ تولد نمی‌تواند در آینده باشد.';
      var age = M.jalali.ageYears(draft.jy, draft.jm, draft.jd);
      if (age === null || age < 9 || age > 25) return 'سال تولد با پایهٔ تحصیلی هم‌خوان نیست؛ سال را بررسی کنید.';
      return '';
    }

    function validGrade() {
      return [7, 8, 9, 10, 11, 12].indexOf(Number(draft.grade)) === -1 ? 'پایهٔ تحصیلی را انتخاب کنید.' : '';
    }

    function validTrack() {
      if (Number(draft.grade) < 10) return '';
      return ['math', 'experimental', 'humanities'].indexOf(draft.track) === -1 ? 'رشتهٔ تحصیلی را انتخاب کنید.' : '';
    }

    function validateStep() {
      var step = currentStep();
      if (step === 'name') return validName();
      if (step === 'birth') return validBirth();
      if (step === 'grade') return validGrade();
      if (step === 'track') return validTrack();
      return '';
    }

    function firstProblem() {
      var checks = [
        { step: 'name', msg: validName() },
        { step: 'birth', msg: validBirth() },
        { step: 'grade', msg: validGrade() },
        { step: 'track', msg: validTrack() }
      ];
      for (var i = 0; i < checks.length; i += 1) if (checks[i].msg) return checks[i];
      return null;
    }

    function stepBody() {
      var step = currentStep();

      if (step === 'name') {
        return {
          title: isEdit ? 'نام نمایشی' : 'چطور صدایت کنیم؟',
          text: 'همین نام در داشبورد و در کنار پیشرفت شما دیده می‌شود.',
          body:
            '<div class="field' + (error ? ' has-error' : '') + '">' +
            '<label class="label" for="f-name">نام نمایشی <span class="req">*</span></label>' +
            '<input class="input" id="f-name" name="displayName" type="text" maxlength="40" autocomplete="off" value="' +
            esc(draft.displayName) + '" placeholder="مثلاً سارا" autofocus style="font-size:1.05rem;min-height:54px">' +
            '<span class="hint">نام کوچک یا هر اسمی که دوست دارید کافی است.</span>' +
            '<span class="field-error" role="alert">' + esc(error) + '</span></div>'
        };
      }

      if (step === 'birth') {
        var days = dayOptions(draft.jy, draft.jm);
        return {
          title: 'تاریخ تولد',
          text: 'برای تنظیم یادآورها و نمایش سن، تاریخ تولد شمسی را انتخاب کنید.',
          body:
            '<div class="field' + (error ? ' has-error' : '') + '">' +
            '<span class="label">تاریخ تولد شمسی <span class="req">*</span></span>' +
            '<div class="input-group">' +
            '<select class="select" id="f-day" aria-label="روز">' + selectOptions(days, draft.jd, 'روز') + '</select>' +
            '<select class="select" id="f-month" aria-label="ماه">' +
            selectOptions(M.jalali.months.map(function (m, i) { return { value: i + 1, label: m }; }), draft.jm, 'ماه') +
            '</select>' +
            '<select class="select" id="f-year" aria-label="سال">' + selectOptions(yearList, draft.jy, 'سال') + '</select>' +
            '</div>' +
            '<span class="hint">اگر روزی در ماه انتخاب‌شده وجود نداشته باشد، به آخرین روز معتبر همان ماه تنظیم می‌شود.</span>' +
            '<span class="field-error" role="alert">' + esc(error) + '</span></div>'
        };
      }

      if (step === 'grade') {
        var cards = M.store.GRADES.map(function (g) {
          var meta = M.content.gradeMeta[g];
          var active = Number(draft.grade) === g;
          return (
            '<button type="button" class="gradecard' + (active ? ' is-selected' : '') + '" data-grade="' + g + '" aria-pressed="' + active + '" ' +
            'style="flex-direction:row;align-items:center;gap:11px;padding:13px;' +
            (active ? 'border-color:var(--brand);background:var(--brand-soft);box-shadow:0 0 0 3px rgba(47,107,255,.12)' : '') + '">' +
            '<span class="gradecard__num" style="width:42px;height:42px;font-size:var(--fs-15)">' + util.toFa(g) + '</span>' +
            '<span class="gradecard__body" style="text-align:start"><h3 style="font-size:var(--fs-13)">پایهٔ ' + esc(meta.label) + '</h3>' +
            '<p>' + esc(meta.cycleLabel) + '</p></span></button>'
          );
        }).join('');
        return {
          title: 'پایهٔ تحصیلی',
          text: 'کتابخانه و ترتیب درس‌ها بر اساس همین پایه چیده می‌شود.',
          body:
            '<div class="field' + (error ? ' has-error' : '') + '">' +
            '<span class="label sr-only">پایهٔ تحصیلی</span>' +
            '<div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:9px">' + cards + '</div>' +
            '<span class="field-error" role="alert">' + esc(error) + '</span></div>'
        };
      }

      if (step === 'track') {
        var tracks = [
          { key: 'math', desc: 'ریاضی، فیزیک و درس‌های پایه', icon: 'layers' },
          { key: 'experimental', desc: 'زیست‌شناسی، شیمی و درس‌های پایه', icon: 'target' },
          { key: 'humanities', desc: 'ادبیات، تاریخ، جغرافیا و درس‌های پایه', icon: 'book' }
        ].map(function (t) {
          var active = draft.track === t.key;
          return (
            '<button type="button" class="gradecard' + (active ? ' is-selected' : '') + '" data-track="' + t.key + '" aria-pressed="' + active + '" ' +
            'style="flex-direction:row;align-items:center;gap:13px;padding:15px;' +
            (active ? 'border-color:var(--brand);background:var(--brand-soft);box-shadow:0 0 0 3px rgba(47,107,255,.12)' : '') + '">' +
            '<span class="gradecard__num" style="width:40px;height:40px;border-radius:12px">' + M.icon(t.icon, 19) + '</span>' +
            '<span class="gradecard__body" style="text-align:start"><h3 style="font-size:var(--fs-13)">' +
            esc(M.content.trackLabel(t.key)) + '</h3><p>' + esc(t.desc) + '</p></span></button>'
          );
        }).join('');
        return {
          title: 'رشتهٔ تحصیلی',
          text: 'این انتخاب فقط برای پایه‌های دهم تا دوازدهم لازم است.',
          body:
            '<div class="field' + (error ? ' has-error' : '') + '">' +
            '<span class="label sr-only">رشتهٔ تحصیلی</span>' +
            '<div class="grid" style="gap:9px">' + tracks + '</div>' +
            '<span class="field-error" role="alert">' + esc(error) + '</span></div>'
        };
      }

      var rows = [
        { label: 'نام نمایشی', value: draft.displayName, step: 'name' },
        {
          label: 'تاریخ تولد',
          value: draft.jy && draft.jm && draft.jd ? M.jalali.format(draft.jy, draft.jm, draft.jd) : '—',
          step: 'birth'
        },
        { label: 'پایهٔ تحصیلی', value: draft.grade ? 'پایهٔ ' + M.content.gradeLabel(draft.grade) : '—', step: 'grade' }
      ];
      if (Number(draft.grade) >= 10) {
        rows.push({ label: 'رشتهٔ تحصیلی', value: M.content.trackLabel(draft.track) || '—', step: 'track' });
      }
      return {
        title: isEdit ? 'تأیید تغییرات' : 'همه‌چیز آماده است',
        text: isEdit ? 'هر بخش را می‌توانید ویرایش کنید؛ در پایان ذخیره کنید.' : 'یک نگاه به اطلاعات بیندازید و بعد وارد شوید.',
        body:
          '<div class="summary-list summary-list--edit">' +
          rows.map(function (r) {
            return (
              '<div class="summary-row"><span class="summary-row__label">' + esc(r.label) + '</span>' +
              '<span class="summary-row__value">' + esc(r.value || '—') + '</span>' +
              '<button type="button" class="btn btn--quiet btn--sm summary-row__edit" data-goto="' + r.step + '">ویرایش</button></div>'
            );
          }).join('') +
          '</div>'
      };
    }

    function render() {
      if (!host) return;
      var step = currentStep();
      var body = stepBody();
      var stepNumber = index + 1;
      var total = steps.length;
      var dots = steps
        .map(function (s, i) {
          return '<span class="stepper__dot' + (i < index ? ' is-done' : i === index ? ' is-active' : '') + '"></span>';
        })
        .join('');
      var nextLabel = isEdit ? 'ذخیرهٔ تغییرات' : step === 'confirm' ? 'ورود به داشبورد' : 'ادامه';
      var showBack = isEdit ? index < steps.length - 1 : index > 0;

      host.innerHTML =
        '<div class="onboard">' +
        '<div class="row" style="justify-content:space-between">' + M.brand({ small: true }) +
        '<span class="chip chip--outline">گام ' + util.toFa(stepNumber) + ' از ' + util.toFa(total) + '</span></div>' +
        '<div class="stepper" role="progressbar" aria-valuemin="1" aria-valuemax="' + total + '" aria-valuenow="' + stepNumber + '" aria-label="پیشرفت ثبت‌نام">' + dots + '</div>' +
        '<div class="onboard__card step-enter" data-step="' + step + '">' +
        '<h1 class="onboard__title">' + esc(body.title) + '</h1>' +
        '<p class="onboard__text">' + esc(body.text) + '</p>' +
        '<div class="onboard__step">' + body.body + '</div>' +
        '<div class="onboard__foot">' +
        (showBack ? '<button class="btn btn--quiet" type="button" data-back="1">' + M.icon('arrowEnd', 16) + 'قبلی</button>' : '') +
        '<button class="btn btn--primary push" type="button" data-next="1">' + esc(nextLabel) +
        M.icon(index === steps.length - 1 || isEdit ? 'check' : 'arrowStart', 17) + '</button>' +
        '</div></div>' +
        (isEdit ? '' : '<p class="hint" style="text-align:center">هر زمان خواستید می‌توانید این اطلاعات را تغییر دهید.</p>') +
        '</div>';

      bind();
    }

    function bind() {
      var next = util.$('[data-next]', host);
      if (next) next.addEventListener('click', onNext);
      var back = util.$('[data-back]', host);
      if (back) back.addEventListener('click', onBack);

      var nameInput = util.$('#f-name', host);
      if (nameInput) {
        nameInput.addEventListener('input', function () {
          draft.displayName = nameInput.value;
          if (error) {
            error = '';
            util.$('.field-error', host).textContent = '';
            util.$('.field', host).classList.remove('has-error');
          }
        });
        nameInput.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') { ev.preventDefault(); onNext(); }
        });
      }

      var day = util.$('#f-day', host);
      var month = util.$('#f-month', host);
      var year = util.$('#f-year', host);

      function syncBirth() {
        if (year) draft.jy = year.value ? Number(year.value) : '';
        if (month) draft.jm = month.value ? Number(month.value) : '';
        if (day) draft.jd = day.value ? Number(day.value) : '';
      }

      function clearError() {
        if (!error) return;
        error = '';
        var field = util.$('.field', host);
        if (field) field.classList.remove('has-error');
        var errEl = util.$('.field-error', host);
        if (errEl) errEl.textContent = '';
      }

      function refreshDays() {
        var daySel = util.$('#f-day', host);
        if (!daySel) return;
        var maxLen = draft.jy && draft.jm ? M.jalali.monthLength(draft.jy, draft.jm) : 31;
        if (draft.jd && draft.jd > maxLen) draft.jd = maxLen;
        daySel.innerHTML = selectOptions(dayOptions(draft.jy, draft.jm), draft.jd, 'روز');
      }

      [day, month, year].forEach(function (sel) {
        if (!sel) return;
        sel.addEventListener('change', function () {
          syncBirth();
          clearError();
          if (sel === month || sel === year) refreshDays();
        });
      });

      util.$$('[data-grade]', host).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var g = Number(btn.getAttribute('data-grade'));
          draft.grade = g;
          if (g < 10) draft.track = '';
          steps = stepList(g);
          if (index > steps.length - 1) index = steps.length - 1;
          error = '';
          render();
        });
      });

      util.$$('[data-track]', host).forEach(function (btn) {
        btn.addEventListener('click', function () {
          draft.track = btn.getAttribute('data-track');
          error = '';
          render();
        });
      });

      util.$$('[data-goto]', host).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var i = steps.indexOf(btn.getAttribute('data-goto'));
          if (i >= 0) { index = i; error = ''; render(); }
        });
      });
    }

    function onBack() {
      error = '';
      if (isEdit) { index = steps.length - 1; render(); return; }
      if (index === 0) { M.router.go('#/welcome'); return; }
      index -= 1;
      render();
    }

    function save() {
      var profile = {
        id: existing ? existing.id : undefined,
        displayName: String(draft.displayName).trim(),
        birthDate: { jy: draft.jy, jm: draft.jm, jd: draft.jd },
        grade: Number(draft.grade),
        track: Number(draft.grade) >= 10 ? draft.track : null
      };
      var saved = M.store.saveProfile(profile);
      if (!saved) { setError('ذخیرهٔ اطلاعات ممکن نشد؛ ورودی‌ها را بررسی کنید.'); return; }
      M.store.flush('profile.commit');
      if (isEdit) {
        M.ui.toast('اطلاعات شما به‌روزرسانی شد.', { type: 'ok' });
        M.router.go('#/settings');
      } else {
        M.ui.toast('خوش آمدید، ' + saved.displayName + '.', { type: 'ok', icon: 'sparkles' });
        M.router.go('#/dashboard');
      }
    }

    function onNext() {
      if (isEdit) {
        var problem = firstProblem();
        if (problem) {
          steps = stepList(draft.grade);
          index = Math.max(0, steps.indexOf(problem.step));
          setError(problem.msg);
          return;
        }
        save();
        return;
      }
      var currentProblem = validateStep();
      if (currentProblem) { setError(currentProblem); return; }
      error = '';
      if (index < steps.length - 1) { index += 1; render(); return; }
      save();
    }

    return {
      mount: function (root) {
        host = util.$('[data-onboard-host]', root);
        render();
      }
    };
  }

  views.onboarding = function (params, query) {
    var isEdit = !!(query && query.mode === 'edit') && M.store.hasProfile();
    var ctrl = createController(isEdit ? 'edit' : 'create');
    return {
      title: isEdit ? 'ویرایش پروفایل' : 'ثبت‌نام',
      nav: isEdit ? 'settings' : '',
      html: '<div data-onboard-host></div>',
      onMount: function (root) { ctrl.mount(root); }
    };
  };

  views.profileEdit = function () {
    var ctrl = createController('edit');
    return {
      title: 'ویرایش پروفایل',
      nav: 'settings',
      html: '<div data-onboard-host></div>',
      onMount: function (root) { ctrl.mount(root); }
    };
  };
})(window, document);
