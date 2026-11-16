/* ==========================================================================
   MEHRAZ — art system
   Every illustration is generated here as inline SVG. No external images, no
   icon fonts, no canvas. Deterministic: the same seed always draws the same
   artwork, so a subject keeps its identity across pages.
   ========================================================================== */
(function (window) {
  'use strict';

  var M = window.MEHRAZ;
  var art = (M.art = {});

  var ACCENTS = [
    { a: '#2F6BFF', b: '#7FA6FF', soft: '#EAF1FF' },
    { a: '#0F9D8A', b: '#6FD3C4', soft: '#E6F7F4' },
    { a: '#8A6BE0', b: '#BFA8F5', soft: '#F1ECFF' },
    { a: '#C0842A', b: '#E7BE7A', soft: '#FBF2E2' },
    { a: '#C25A74', b: '#E9A3B3', soft: '#FCEDF1' },
    { a: '#2C7FA8', b: '#84BFD8', soft: '#E9F4F9' }
  ];

  art.hash = function (str) {
    var h = 2166136261;
    var s = String(str || 'mehraz');
    for (var i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  };

  art.palette = function (seed) {
    return ACCENTS[art.hash(seed) % ACCENTS.length];
  };

  /* ---- subject monogram ------------------------------------------------
     Six geometric compositions. Each one is a small abstract emblem: two
     tints of one accent plus the page background, so subjects read as
     distinct without turning the grid into confetti. */
  art.monogram = function (seed, size, opts) {
    opts = opts || {};
    var p = art.palette(seed);
    var v = art.hash(seed + 'v') % 6;
    var s = size || 44;
    var id = 'mg' + (art.hash(seed) % 100000);
    var body = '';

    if (v === 0) {
      body =
        '<circle cx="24" cy="24" r="15" fill="none" stroke="' + p.a + '" stroke-width="2"/>' +
        '<path d="M24 9a15 15 0 0 1 0 30" fill="none" stroke="' + p.b + '" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="24" cy="24" r="4" fill="' + p.a + '"/>';
    } else if (v === 1) {
      body =
        '<path d="M9 33 24 12l15 21z" fill="none" stroke="' + p.a + '" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M15 33 24 20l9 13z" fill="' + p.b + '" opacity=".45"/>' +
        '<circle cx="24" cy="12" r="2.6" fill="' + p.a + '"/>';
    } else if (v === 2) {
      body =
        '<rect x="10" y="26" width="6" height="12" rx="2" fill="' + p.b + '" opacity=".65"/>' +
        '<rect x="21" y="18" width="6" height="20" rx="2" fill="' + p.a + '"/>' +
        '<rect x="32" y="11" width="6" height="27" rx="2" fill="' + p.b + '" opacity=".45"/>' +
        '<path d="M9 20 24 8l15 12" fill="none" stroke="' + p.a + '" stroke-width="1.4" opacity=".5"/>';
    } else if (v === 3) {
      body =
        '<circle cx="18" cy="24" r="9" fill="none" stroke="' + p.a + '" stroke-width="2"/>' +
        '<circle cx="30" cy="24" r="9" fill="none" stroke="' + p.b + '" stroke-width="2"/>' +
        '<path d="M24 15v18" stroke="' + p.a + '" stroke-width="1.2" opacity=".45"/>';
    } else if (v === 4) {
      body =
        '<path d="M24 8 38 16v16L24 40 10 32V16z" fill="none" stroke="' + p.a + '" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M24 8v16l14 8M24 24 10 32" fill="none" stroke="' + p.b + '" stroke-width="1.4" opacity=".7"/>' +
        '<circle cx="24" cy="24" r="2.4" fill="' + p.a + '"/>';
    } else {
      body =
        '<path d="M8 30c6-8 10-8 16 0s10 8 16 0" fill="none" stroke="' + p.a + '" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M8 21c6-8 10-8 16 0s10 8 16 0" fill="none" stroke="' + p.b + '" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>' +
        '<circle cx="24" cy="36" r="2.2" fill="' + p.a + '"/>';
    }

    return (
      '<svg class="mg" width="' + s + '" height="' + s + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
      '<rect width="48" height="48" rx="14" fill="' + p.soft + '"/>' +
      body +
      '</svg>'
    );
  };

  /* ---- progress ring --------------------------------------------------- */
  art.ring = function (pct, opts) {
    opts = opts || {};
    var size = opts.size || 96;
    var stroke = opts.stroke || 8;
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var v = Math.max(0, Math.min(100, Number(pct) || 0));
    var off = c - (v / 100) * c;
    var grad = 'rg' + (art.hash(String(pct) + size) % 9999);
    var from = opts.from || '#4D82FF';
    var to = opts.to || '#2F6BFF';
    var label = opts.label === false ? '' :
      '<span class="ring__label">' + (opts.text || M.util.fmtPct(v)) +
      (opts.caption ? '<small>' + M.util.esc(opts.caption) + '</small>' : '') + '</span>';

    return (
      '<div class="ring' + (opts.onDark ? ' ring--dark' : '') + '" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' +
      '<defs><linearGradient id="' + grad + '" x1="0" y1="1" x2="1" y2="0">' +
      '<stop offset="0" stop-color="' + from + '"/><stop offset="1" stop-color="' + to + '"/></linearGradient></defs>' +
      '<circle class="ring__track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '"/>' +
      '<circle class="ring__value" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="url(#' + grad + ')" ' +
      'stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + c.toFixed(1) + '" ' +
      'data-ring-value="' + off.toFixed(1) + '"/>' +
      '</svg>' + label + '</div>'
    );
  };

  /* ---- hero orbit ------------------------------------------------------
     Concentric orbits + progress arc + knowledge nodes. The arc is bound to real
     progress, so the illustration is information, not decoration. */
  art.orbit = function (opts) {
    opts = opts || {};
    var pct = Math.max(0, Math.min(100, Number(opts.pct) || 0));
    var r = 86;
    var c = 2 * Math.PI * r;
    var off = c - (pct / 100) * c;
    var glyphs = opts.glyphs || ['∑', 'π', '√', '△', '≡', '∫'];
    var nodes = [
      { x: 60, y: 58, g: glyphs[0] },
      { x: 232, y: 96, g: glyphs[1] },
      { x: 78, y: 196, g: glyphs[2] },
      { x: 214, y: 214, g: glyphs[3] }
    ];
    var nodeSvg = nodes.map(function (n, i) {
      return (
        '<g class="orbit__node" style="animation-delay:' + (i * 700) + 'ms">' +
        '<circle cx="' + n.x + '" cy="' + n.y + '" r="17" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.14)"/>' +
        '<text x="' + n.x + '" y="' + (n.y + 5) + '" text-anchor="middle" fill="rgba(255,255,255,.72)" ' +
        'font-family="Georgia,serif" font-size="14">' + n.g + '</text>' +
        '</g>'
      );
    }).join('');

    return (
      '<svg class="orbit" viewBox="0 0 300 300" role="img" aria-label="پیشرفت ' + M.util.fmtPct(pct) + '">' +
      '<defs>' +
      '<radialGradient id="obGlow" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0" stop-color="#4D82FF" stop-opacity=".35"/>' +
      '<stop offset="1" stop-color="#4D82FF" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<linearGradient id="obArc" x1="0" y1="1" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#7FA6FF"/><stop offset="1" stop-color="#FFFFFF"/>' +
      '</linearGradient>' +
      '</defs>' +
      '<circle cx="150" cy="150" r="140" fill="url(#obGlow)"/>' +
      '<circle class="orbit__ring orbit__ring--a" cx="150" cy="150" r="118" fill="none" stroke="rgba(255,255,255,.10)" stroke-dasharray="2 9"/>' +
      '<circle class="orbit__ring orbit__ring--b" cx="150" cy="150" r="60" fill="none" stroke="rgba(255,255,255,.08)" stroke-dasharray="1 6"/>' +
      '<circle cx="150" cy="150" r="' + r + '" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="10"/>' +
      '<circle class="orbit__arc" cx="150" cy="150" r="' + r + '" fill="none" stroke="url(#obArc)" stroke-width="10" ' +
      'stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + c.toFixed(1) + '" ' +
      'data-orbit-pct="' + pct + '" transform="rotate(-90 150 150)"/>' +
      '<g class="orbit__dash">' +
      '<circle cx="150" cy="150" r="' + r + '" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1" stroke-dasharray="1 26" opacity=".5"/>' +
      '</g>' +
      nodeSvg +
      '<circle cx="150" cy="150" r="5" fill="#fff" opacity=".9"/>' +
      '<circle cx="150" cy="150" r="14" fill="none" stroke="rgba(255,255,255,.25)"/>' +
      '</svg>'
    );
  };

  /* ---- area chart for weekly activity ---------------------------------- */
  art.areaChart = function (points, opts) {
    opts = opts || {};
    var w = 320;
    var h = opts.height || 118;
    var pad = 10;
    var n = points.length || 1;
    var max = Math.max.apply(null, points.concat([1]));
    var step = (w - pad * 2) / Math.max(1, n - 1);
    var coords = points.map(function (v, i) {
      return {
        x: pad + i * step,
        y: h - 22 - (v / max) * (h - 44),
        v: v
      };
    });
    var line = coords.map(function (p, i) {
      return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
    }).join(' ');
    var area = line + ' L' + coords[coords.length - 1].x.toFixed(1) + ' ' + (h - 22) + ' L' + coords[0].x.toFixed(1) + ' ' + (h - 22) + ' Z';
    var dots = coords.map(function (p, i) {
      if (!p.v) return '';
      return '<circle class="area__dot" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3.2" fill="#fff" stroke="#2F6BFF" stroke-width="2" style="animation-delay:' + (i * 60) + 'ms"/>';
    }).join('');
    var labels = (opts.labels || []).map(function (l, i) {
      if (i % 2 && n > 8) return '';
      return '<text x="' + coords[i].x.toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle">' + l + '</text>';
    }).join('');

    return (
      '<svg class="area" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' +
      '<defs><linearGradient id="arFill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#2F6BFF" stop-opacity=".22"/>' +
      '<stop offset="1" stop-color="#2F6BFF" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      '<line x1="' + pad + '" y1="' + (h - 22) + '" x2="' + (w - pad) + '" y2="' + (h - 22) + '" stroke="#E5EAF2" stroke-width="1"/>' +
      '<path class="area__fill" d="' + area + '" fill="url(#arFill)"/>' +
      '<path class="area__line" d="' + line + '" fill="none" stroke="#2F6BFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      dots + labels +
      '</svg>'
    );
  };

  /* ---- empty-state artwork --------------------------------------------- */
  art.empty = function (kind, size) {
    var s = size || 96;
    var p = art.palette(kind || 'empty');
    var common = 'fill="none" stroke="' + p.a + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
    var body = '';

    if (kind === 'library') {
      body =
        '<path d="M22 60V38l26-14 26 14v22" ' + common + '/>' +
        '<path d="M32 60V45l16-9 16 9v15" ' + common + ' opacity=".55"/>' +
        '<path d="M38 60V48h20v12" ' + common + ' opacity=".8"/>' +
        '<circle cx="48" cy="20" r="2.4" fill="' + p.a + '"/>';
    } else if (kind === 'lesson') {
      body =
        '<rect x="20" y="24" width="56" height="44" rx="7" ' + common + '/>' +
        '<path d="M32 38h32M32 46h32M32 54h18" ' + common + ' opacity=".55"/>' +
        '<path d="M60 59l5 5 9-11" ' + common + '/>';
    } else if (kind === 'exam') {
      body =
        '<rect x="24" y="26" width="48" height="44" rx="8" ' + common + '/>' +
        '<path d="M38 26v-4a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v4" ' + common + ' opacity=".6"/>' +
        '<path d="M35 44h26M35 53h18" ' + common + ' opacity=".5"/>' +
        '<circle cx="66" cy="62" r="9" fill="' + p.soft + '" stroke="' + p.a + '" stroke-width="1.4"/>' +
        '<path d="M62 62l3 3 5-6" ' + common + ' stroke-width="1.8"/>';
    } else if (kind === 'review') {
      body =
        '<path d="M30 40a20 20 0 1 1-3 14" ' + common + '/>' +
        '<path d="M30 28v12h12" ' + common + ' opacity=".7"/>' +
        '<circle cx="48" cy="48" r="4" fill="' + p.a + '" opacity=".8"/>';
    } else if (kind === 'progress') {
      body =
        '<path d="M24 64h14V44H24zM42 64h14V32H42zM60 64h14V22H60z" ' + common + ' opacity=".8"/>' +
        '<path d="M24 34l14-8 14 6 16-14" ' + common + ' opacity=".5" stroke-dasharray="3 4"/>';
    } else {
      body =
        '<circle cx="46" cy="42" r="16" ' + common + '/>' +
        '<path d="M58 54l12 12" ' + common + '/>' +
        '<path d="M39 42h14M46 35v14" ' + common + ' opacity=".45"/>';
    }

    return (
      '<svg width="' + s + '" height="' + s + '" viewBox="0 0 96 88" aria-hidden="true" focusable="false">' +
      '<circle cx="48" cy="44" r="34" fill="' + p.soft + '" opacity=".7"/>' +
      body +
      '</svg>'
    );
  };

  /* ---- decorative page wash -------------------------------------------- */
  art.mesh = function (id) {
    var p = art.palette(id || 'mesh');
    return (
      '<svg class="mesh" viewBox="0 0 600 300" aria-hidden="true" preserveAspectRatio="xMidYMid slice">' +
      '<defs><linearGradient id="m' + (art.hash(id) % 999) + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + p.a + '" stop-opacity=".10"/>' +
      '<stop offset="1" stop-color="' + p.a + '" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      '<path d="M0 240C120 180 180 260 300 200s180-90 300-40V300H0z" fill="url(#m' + (art.hash(id) % 999) + ')"/>' +
      '<g stroke="' + p.a + '" stroke-opacity=".12" fill="none">' +
      '<circle cx="470" cy="70" r="56"/><circle cx="470" cy="70" r="86"/>' +
      '</g></svg>'
    );
  };
})(window);
