/* ==========================================================================
   MEHRAZ — activity registry
   Content describes an activity as data. Only components registered here can
   run, and every component is bundled code reviewed with the application.
   Nothing in the content catalogue is ever evaluated as script.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var M = window.MEHRAZ;
  var util = M.util;
  var esc = util.esc;

  var registry = {};
  var activities = (M.activities = {
    registry: registry,

    register: function (name, factory) {
      registry[name] = factory;
    },

    render: function (activity) {
      if (!activity || !registry[activity.component]) return '';
      var config = activity.config || {};
      return (
        '<div class="activity card card--pad" data-activity data-component="' +
        esc(activity.component) +
        '" data-config="' +
        esc(JSON.stringify(config)) +
        '">' +
        '<div class="activity__head">' +
        '<span class="card__icon">' +
        M.icon(activity.kind === 'game' ? 'target' : activity.kind === 'experiment' ? 'play' : 'sparkles', 18) +
        '</span>' +
        '<div><div class="card__title">' +
        esc(activity.title || '') +
        '</div>' +
        (activity.instructions ? '<div class="card__text">' + esc(activity.instructions) + '</div>' : '') +
        '</div></div>' +
        '<div class="activity__stage" data-activity-stage></div>' +
        '<p class="activity__status hint" data-activity-status aria-live="polite"></p>' +
        '</div>'
      );
    },

    mount: function (root) {
      util.$$('[data-activity]', root).forEach(function (host) {
        var name = host.getAttribute('data-component');
        var factory = registry[name];
        var stage = util.$('[data-activity-stage]', host);
        var status = util.$('[data-activity-status]', host);
        if (!factory || !stage) return;
        var config;
        try {
          config = JSON.parse(host.getAttribute('data-config') || '{}');
        } catch (err) {
          M.diag.record('note', 'activity config rejected: ' + err.message);
          return;
        }
        try {
          factory(stage, config, function (msg, ok) {
            if (!status) return;
            status.textContent = msg;
            status.className = 'activity__status hint' + (ok === false ? ' is-wrong' : ok === true ? ' is-ok' : '');
          });
        } catch (err) {
          M.diag.record('error', 'activity failed: ' + err.message, { component: name });
        }
      });
    }
  });

  /* ---- shared helpers ---------------------------------------------------- */
  function shuffle(list, seed) {
    var out = list.slice();
    var s = seed || 7;
    for (var i = out.length - 1; i > 0; i -= 1) {
      s = (s * 9301 + 49297) % 233280;
      var j = Math.floor((s / 233280) * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function button(label, cls) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'activity__item ' + (cls || '');
    b.textContent = label;
    return b;
  }

  /* ---- match: pair two columns ------------------------------------------ */
  activities.register('match', function (stage, config, report) {
    var pairs = Array.isArray(config.pairs) ? config.pairs : [];
    if (pairs.length < 2) return;

    var left = document.createElement('div');
    left.className = 'activity__col';
    var right = document.createElement('div');
    right.className = 'activity__col';

    var rights = shuffle(pairs.map(function (p, i) { return { text: p.right, i: i }; }), 11);
    var selected = null;
    var solved = 0;

    function update() {
      if (solved === pairs.length) report('همهٔ جفت‌ها درست شد. عالی بود.', true);
    }

    pairs.forEach(function (p, i) {
      var b = button(p.left);
      b.setAttribute('data-side', 'left');
      b.setAttribute('data-i', String(i));
      b.addEventListener('click', function () {
        util.$$('.activity__item.is-selected', stage).forEach(function (el) {
          el.classList.remove('is-selected');
        });
        b.classList.add('is-selected');
        selected = { i: i, el: b };
      });
      left.appendChild(b);
    });

    rights.forEach(function (r) {
      var b = button(r.text);
      b.setAttribute('data-side', 'right');
      b.setAttribute('data-i', String(r.i));
      b.addEventListener('click', function () {
        if (!selected) {
          report('اول یک مورد از ستون راست را انتخاب کنید.', null);
          return;
        }
        if (selected.i === r.i) {
          selected.el.classList.add('is-done');
          selected.el.disabled = true;
          b.classList.add('is-done');
          b.disabled = true;
          selected.el.classList.remove('is-selected');
          selected = null;
          solved += 1;
          report('درست بود.', true);
          update();
        } else {
          b.classList.add('is-wrong');
          window.setTimeout(function () { b.classList.remove('is-wrong'); }, 700);
          report('این جفت درست نیست؛ دوباره نگاه کنید.', false);
        }
      });
      right.appendChild(b);
    });

    stage.appendChild(left);
    stage.appendChild(right);
  });

  /* ---- classify: put each item in the right bucket ---------------------- */
  activities.register('classify', function (stage, config, report) {
    var buckets = Array.isArray(config.buckets) ? config.buckets : [];
    var items = Array.isArray(config.items) ? config.items : [];
    if (!buckets.length || !items.length) return;

    var pool = document.createElement('div');
    pool.className = 'activity__pool';
    var board = document.createElement('div');
    board.className = 'activity__buckets';
    var pending = null;
    var solved = 0;

    var bucketEls = {};
    buckets.forEach(function (bk) {
      var col = document.createElement('div');
      col.className = 'activity__bucket';
      var title = document.createElement('div');
      title.className = 'activity__bucket-title';
      title.textContent = bk.label;
      var body = document.createElement('div');
      body.className = 'activity__bucket-body';
      col.appendChild(title);
      col.appendChild(body);
      col.addEventListener('click', function () {
        if (!pending) {
          report('اول یک مورد را از فهرست بالا انتخاب کنید.', null);
          return;
        }
        if (pending.bucket === bk.id) {
          pending.el.classList.add('is-done');
          pending.el.disabled = true;
          body.appendChild(pending.el);
          solved += 1;
          pending = null;
          report('درست بود.', true);
          if (solved === items.length) report('همهٔ موارد دسته‌بندی شدند.', true);
        } else {
          col.classList.add('is-wrong');
          window.setTimeout(function () { col.classList.remove('is-wrong'); }, 700);
          report('این مورد به این دسته تعلق ندارد.', false);
        }
      });
      bucketEls[bk.id] = body;
      board.appendChild(col);
    });

    items.forEach(function (it) {
      var b = button(it.text);
      b.addEventListener('click', function () {
        util.$$('.activity__item.is-selected', stage).forEach(function (el) {
          el.classList.remove('is-selected');
        });
        b.classList.add('is-selected');
        pending = { el: b, bucket: it.bucket };
      });
      pool.appendChild(b);
    });

    stage.appendChild(pool);
    stage.appendChild(board);
  });
})(window, document);
