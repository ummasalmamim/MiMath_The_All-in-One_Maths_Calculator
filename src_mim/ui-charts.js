/* ---------- charts view ---------- */
(function (MB) {
  'use strict';
  if (!MB.core || !MB.ui) return;
  const U = MB.ui, C = MB.core, el = U.el, $ = U.$;
  const TYPES = [
    ['line', 'Line'], ['area', 'Area'], ['step', 'Step'], ['bar', 'Bar'], ['hbar', 'Horizontal bar'], ['scatter', 'Scatter'],
    ['pie', 'Pie'], ['doughnut', 'Doughnut'], ['polar', 'Polar area'], ['radar', 'Radar'], ['bubble', 'Bubble'],
    ['hist', 'Histogram'], ['cum', 'Running total'], ['compare', 'f, f′ and ∫f']
  ];
  const SAMPLE = 'Maths, 72\nPhysics, 65\nChemistry, 80\nBiology, 58\nEnglish, 91\nHistory, 67';
  let src = U.store.get('chSrc', 'eq'), type = U.store.get('chType', 'line'), chart = null, last = null;

  const typesBox = $('#ch-types');
  TYPES.forEach(([id, name]) => typesBox.appendChild(el('button', { class: 'chip', type: 'button', role: 'radio', 'data-id': id, 'aria-checked': 'false', text: name, onclick: () => { type = id; U.store.set('chType', id); paintTypes(); draw(); } })));
  function paintTypes() {
    if (type === 'compare' && src !== 'eq') type = 'line';
    typesBox.querySelectorAll('.chip').forEach(b => {
      b.setAttribute('aria-checked', b.dataset.id === type ? 'true' : 'false');
      const off = b.dataset.id === 'compare' && src !== 'eq'; b.hidden = off;
    });
  }
  function paintSrc() {
    $('#src-eq').setAttribute('aria-pressed', src === 'eq' ? 'true' : 'false'); $('#src-data').setAttribute('aria-pressed', src === 'data' ? 'true' : 'false');
    $('#ch-eq-panel').hidden = src !== 'eq'; $('#ch-data-panel').hidden = src !== 'data';
    paintTypes();
  }
  $('#src-eq').addEventListener('click', () => { src = 'eq'; U.store.set('chSrc', src); paintSrc(); draw(); });
  $('#src-data').addEventListener('click', () => { src = 'data'; U.store.set('chSrc', src); paintSrc(); if (!$('#ch-data').value.trim()) $('#ch-data').value = SAMPLE; draw(); });
  $('#ch-sample').addEventListener('click', () => { $('#ch-data').value = SAMPLE; draw(); });
  $('#ch-go').addEventListener('click', draw);
  ['ch-expr', 'ch-a', 'ch-b', 'ch-n'].forEach(id => $('#' + id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); draw(); } }));

  const safe = s => { try { return C.num(C.calc.evaluate(C.userNorm(s))); } catch (e) { return NaN; } };
  const isNum = s => /^[-+−]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s.trim());
  const toN = s => parseFloat(s.trim().replace('−', '-'));
  const clip = (a, n) => a.length > n ? a.slice(0, n) : a;

  /* ---------- gather data ---------- */
  function fromEquation() {
    const text = $('#ch-expr').value.trim().replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=\s*/i, '');
    if (!text) throw new Error('Type a function of x, for example sin(x).');
    const code = C.compile(C.userNorm(text));
    const a = safe($('#ch-a').value), b = safe($('#ch-b').value);
    let n = parseInt($('#ch-n').value, 10);
    if (!Number.isFinite(a) || !Number.isFinite(b) || !(b > a)) throw new Error('Set "From x" smaller than "To x".');
    if (!Number.isFinite(n)) n = 12;
    const cap = type === 'pie' || type === 'doughnut' || type === 'polar' ? 8 : type === 'radar' ? 12 : 200;
    const nn = Math.max(2, Math.min(cap, n));
    const sc = { x: 0 }, f = x => { sc.x = x; try { return C.num(code.evaluate(sc)); } catch (e) { return NaN; } };
    const xs = [], ys = [];
    for (let i = 0; i < nn; i++) { const x = a + (b - a) * i / (nn - 1); xs.push(Math.round(x * 1e9) / 1e9); ys.push(f(xs[i])); }
    if (!ys.some(Number.isFinite)) throw new Error('That function has no real values on this range.');
    return { mode: 'eq', text, f, a, b, xs, ys, labels: xs.map(x => C.fmt(x, 4)), note: nn < n ? 'Limited to ' + nn + ' points for this chart type.' : '' };
  }
  function fromData() {
    const lines = $('#ch-data').value.split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) throw new Error('Type or paste some data first, one value per line.');
    const rows = lines.map((ln, i) => {
      const t = ln.split(/[,;\t]+/).map(s => s.trim()).filter(s => s !== '');
      if (t.length === 1) { const p = t[0].split(/\s+/); if (p.length >= 2 && isNum(p[p.length - 1])) { return { label: p.slice(0, -1).join(' '), nums: [toN(p[p.length - 1])] }; } }
      if (t.length === 1 && isNum(t[0])) return { label: String(i + 1), nums: [toN(t[0])], auto: true };
      if (t.length >= 2 && t.every(isNum)) return { label: t[0], nums: t.map(toN), pair: true };
      if (t.length >= 2 && isNum(t[t.length - 1])) return { label: t.slice(0, -1).join(' '), nums: [toN(t[t.length - 1])] };
      throw new Error('I could not read line ' + (i + 1) + ': "' + ln + '". Use "label, number" or just a number.');
    });
    const pairs = rows.every(r => r.pair);
    const xs = pairs ? rows.map(r => r.nums[0]) : rows.map((r, i) => i + 1);
    const ys = rows.map(r => pairs ? r.nums[1] : r.nums[0]);
    const zs = pairs && rows.every(r => r.nums.length >= 3) ? rows.map(r => r.nums[2]) : null;
    return { mode: 'data', pairs, xs, ys, zs, labels: rows.map(r => r.label), note: '' };
  }

  /* ---------- build the Chart.js config ---------- */
  function hexA(h, a) { return /^#[0-9a-f]{6}$/i.test(h) ? h + a : h; }
  function build(d) {
    const col = i => U.series(i), ink2 = U.cssVar('--ink-2'), ink3 = U.cssVar('--ink-3'), grid = U.cssVar('--grid'), axis = U.cssVar('--axis'), surf = U.cssVar('--surface');
    const eq = d.mode === 'eq', yName = eq ? 'f(x) = ' + C.pretty(d.text) : 'value';
    const round = v => Number.isFinite(v) ? v : null;
    const scaleXY = (xTitle, yTitle, xType) => ({
      x: { type: xType || 'category', title: { display: !!xTitle, text: xTitle, color: ink2 }, grid: { color: grid }, border: { color: axis }, ticks: { color: ink3, maxRotation: 0, autoSkip: true } },
      y: { title: { display: !!yTitle, text: yTitle, color: ink2 }, grid: { color: grid }, border: { color: axis }, ticks: { color: ink3 }, beginAtZero: false }
    });
    const base = { responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'nearest', intersect: false }, plugins: { legend: { display: false, labels: { color: ink2, usePointStyle: true, boxWidth: 9, boxHeight: 9 } }, tooltip: { backgroundColor: surf, titleColor: U.cssVar('--ink'), bodyColor: ink2, borderColor: U.cssVar('--line-2'), borderWidth: 1, padding: 10, displayColors: true } } };
    const cfg = { type: 'line', data: { labels: d.labels, datasets: [] }, options: base };
    const xT = eq ? 'x' : '', yT = eq ? 'y' : '';
    const ys = d.ys.map(round);
    if (type === 'line' || type === 'area' || type === 'step') {
      cfg.type = 'line';
      cfg.data.datasets = [{ label: yName, data: ys, borderColor: col(0), backgroundColor: type === 'area' ? hexA(col(0), '33') : col(0), fill: type === 'area' ? 'origin' : false, stepped: type === 'step' ? 'middle' : false, borderWidth: 2.25, tension: 0, pointRadius: ys.length > 40 ? 0 : 3.5, pointHoverRadius: 6, pointBackgroundColor: col(0), pointBorderColor: surf, pointBorderWidth: 1.5, spanGaps: false }];
      base.scales = scaleXY(xT, yT);
    } else if (type === 'bar' || type === 'hbar') {
      cfg.type = 'bar'; if (type === 'hbar') base.indexAxis = 'y';
      cfg.data.datasets = [{ label: yName, data: ys, backgroundColor: col(0), borderRadius: 4, maxBarThickness: 46, borderSkipped: false }];
      base.scales = scaleXY(type === 'hbar' ? yT : xT, type === 'hbar' ? xT : yT);
      if (type === 'hbar') { base.scales.x.type = 'linear'; base.scales.y.type = 'category'; base.scales.x.title = { display: !!yT, text: yT, color: ink2 }; base.scales.y.title = { display: !!xT, text: xT, color: ink2 }; }
      const bz = type === 'hbar' ? base.scales.x : base.scales.y; bz.beginAtZero = true;
    } else if (type === 'scatter') {
      cfg.type = 'scatter';
      cfg.data = { datasets: [{ label: yName, data: d.xs.map((x, i) => ({ x, y: ys[i] })).filter(p => p.y != null), backgroundColor: col(0), borderColor: surf, borderWidth: 1.5, pointRadius: 5.5, pointHoverRadius: 8 }] };
      base.scales = scaleXY(eq ? 'x' : (d.pairs ? 'x' : 'position'), eq ? 'y' : 'value', 'linear');
    } else if (type === 'bubble') {
      cfg.type = 'bubble';
      const zs = d.zs || ys.map(v => Math.abs(v || 0)), zmax = Math.max.apply(null, zs.concat([1e-12]));
      cfg.data = { datasets: [{ label: yName, data: d.xs.map((x, i) => ({ x, y: ys[i], r: 5 + 17 * Math.abs(zs[i] || 0) / zmax, v: zs[i] })).filter(p => p.y != null), backgroundColor: hexA(col(0), 'b3'), borderColor: col(0), borderWidth: 1.5 }] };
      base.scales = scaleXY(eq ? 'x' : 'x', eq ? 'y' : 'y', 'linear');
      base.plugins.tooltip.callbacks = { label: c => 'x = ' + C.fmt(c.raw.x, 5) + ', y = ' + C.fmt(c.raw.y, 5) + ', size ' + C.fmt(c.raw.v, 4) };
    } else if (type === 'pie' || type === 'doughnut' || type === 'polar') {
      let labels = d.labels.slice(), vals = ys.map(v => Math.abs(v || 0));
      if (labels.length > 8) { const idx = vals.map((v, i) => i).sort((a, b) => vals[b] - vals[a]); const keep = idx.slice(0, 7).sort((a, b) => a - b), rest = idx.slice(7); labels = keep.map(i => d.labels[i]).concat(['Other']); vals = keep.map(i => vals[i]).concat([rest.reduce((s, i) => s + vals[i], 0)]); d.note = 'More than 8 slices are hard to read, so the smallest were grouped as "Other".'; }
      cfg.type = type === 'polar' ? 'polarArea' : type; cfg.data = { labels, datasets: [{ data: vals, backgroundColor: labels.map((_, i) => labels[i] === 'Other' ? U.cssVar('--ink-3') : col(i)), borderColor: surf, borderWidth: 2 }] };
      base.plugins.legend.display = true; base.plugins.legend.position = 'bottom';
      if (type === 'doughnut') base.cutout = '58%';
      if (type === 'polar') base.scales = { r: { grid: { color: grid }, ticks: { color: ink3, backdropColor: 'transparent' }, angleLines: { color: grid } } };
      if (eq || ys.some(v => v < 0)) d.note = (d.note ? d.note + ' ' : '') + 'Slices show the size |value|, since a part of a whole cannot be negative.';
    } else if (type === 'radar') {
      cfg.type = 'radar'; cfg.data.datasets = [{ label: yName, data: ys, borderColor: col(0), backgroundColor: hexA(col(0), '33'), borderWidth: 2.25, pointBackgroundColor: col(0), pointBorderColor: surf, pointRadius: 3.5 }];
      base.scales = { r: { grid: { color: grid }, angleLines: { color: grid }, ticks: { color: ink3, backdropColor: 'transparent' }, pointLabels: { color: ink2 } } };
    } else if (type === 'hist') {
      const v = ys.filter(Number.isFinite), n = v.length, k = Math.max(3, Math.min(20, Math.ceil(Math.log2(n) + 1))), mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), w = (mx - mn) / k || 1;
      const counts = new Array(k).fill(0); v.forEach(x => { counts[Math.min(k - 1, Math.floor((x - mn) / w))]++; });
      cfg.type = 'bar'; cfg.data = { labels: counts.map((_, i) => C.fmt(mn + i * w, 3) + ' to ' + C.fmt(mn + (i + 1) * w, 3)), datasets: [{ label: 'Frequency', data: counts, backgroundColor: col(0), borderRadius: 3, categoryPercentage: 1, barPercentage: 0.96 }] };
      base.scales = scaleXY('value range', 'frequency'); base.scales.y.beginAtZero = true; base.scales.y.ticks.precision = 0; base.scales.x.ticks.autoSkip = true;
      d.note = k + ' equal-width bins from ' + C.fmt(mn, 4) + ' to ' + C.fmt(mx, 4) + '.';
    } else if (type === 'cum') {
      let s = 0; const run = ys.map(v => (s += (v || 0)));
      cfg.type = 'line'; cfg.data.datasets = [{ label: 'Running total', data: run, borderColor: col(0), backgroundColor: hexA(col(0), '26'), fill: 'origin', borderWidth: 2.25, tension: 0, stepped: false, pointRadius: run.length > 40 ? 0 : 3.5, pointBackgroundColor: col(0), pointBorderColor: surf }];
      base.scales = scaleXY(xT, 'total');
    } else if (type === 'compare') {
      const h = (d.b - d.a) / 2000 || 1e-4, f = d.f;
      const xs = d.xs.length < 60 ? Array.from({ length: 121 }, (_, i) => d.a + (d.b - d.a) * i / 120) : d.xs;
      const deriv = xs.map(x => { const v = (f(x + h) - f(x - h)) / (2 * h); return Number.isFinite(v) ? v : null; });
      let acc = 0; const integ = xs.map((x, i) => { if (i) { const a1 = f(xs[i - 1]), b1 = f(x); if (Number.isFinite(a1) && Number.isFinite(b1)) acc += (a1 + b1) / 2 * (x - xs[i - 1]); } return acc; });
      cfg.data.labels = xs.map(x => C.fmt(Math.round(x * 1e9) / 1e9, 4));
      const mkd = (label, data, i, dash) => ({ label, data, borderColor: col(i), backgroundColor: col(i), borderWidth: 2.25, tension: 0, pointRadius: 0, pointHoverRadius: 5, borderDash: dash || [] });
      cfg.data.datasets = [mkd('f(x)', xs.map(x => round(f(x))), 0), mkd('f′(x)', deriv, 1, [7, 5]), mkd('∫ f from ' + C.fmt(d.a, 4) + ' to x', integ, 2, [2, 4])];
      base.scales = scaleXY('x', ''); base.scales.x.ticks.maxTicksLimit = 9;
    }
    const multi = cfg.data.datasets.length > 1; if (multi) base.plugins.legend.display = true, base.plugins.legend.position = 'bottom';
    return cfg;
  }

  /* ---------- statistics and table ---------- */
  function stats(ys) {
    const v = ys.filter(Number.isFinite), box = $('#ch-stats'); box.replaceChildren();
    if (!v.length) return;
    const s = C.describe(v), f = x => C.fmt(x, 6);
    [['Count', s.n], ['Sum', f(s.sum)], ['Mean', f(s.mean)], ['Median', f(s.median)], ['Mode', s.modes && s.modes.length && s.modes.length < v.length ? s.modes.map(f).join(', ') : 'none'], ['Min', f(s.min)], ['Max', f(s.max)], ['Range', f(s.range)], ['Q1', f(s.q1)], ['Q3', f(s.q3)], ['Std dev (population)', f(s.sdP)], ['Std dev (sample)', v.length > 1 ? f(s.sdS) : 'n/a']]
      .forEach(([k, val]) => box.appendChild(el('div', { class: 'stat' }, [el('dt', { text: k }), el('dd', { text: String(val) })])));
  }
  function table(d) {
    const t = $('#ch-table'); t.replaceChildren();
    t.appendChild(el('thead', null, [el('tr', null, [el('th', { text: d.mode === 'eq' ? 'x' : (d.pairs ? 'x' : 'label') }), el('th', { text: d.mode === 'eq' ? 'f(x)' : 'value' })].concat(d.zs ? [el('th', { text: 'size' })] : []))]));
    const b = el('tbody');
    d.ys.forEach((y, i) => b.appendChild(el('tr', null, [el('td', { text: d.mode === 'eq' || d.pairs ? C.fmt(d.xs[i], 6) : d.labels[i] }), el('td', { text: Number.isFinite(y) ? C.fmt(y, 6) : 'undefined' })].concat(d.zs ? [el('td', { text: C.fmt(d.zs[i], 6) })] : []))));
    t.appendChild(b);
  }

  /* ---------- draw ---------- */
  function draw() {
    const msg = $('#ch-msg'); msg.textContent = ''; msg.style.color = '';
    if (typeof Chart === 'undefined') { msg.textContent = 'The chart library did not load.'; msg.style.color = 'var(--bad)'; return; }
    let d;
    try { d = src === 'eq' ? fromEquation() : fromData(); }
    catch (e) { msg.textContent = C.friendlyError(e); msg.style.color = 'var(--bad)'; return; }
    last = d;
    if (chart) { chart.destroy(); chart = null; }
    let cfg;
    try { cfg = build(d); } catch (e) { msg.textContent = 'This chart type does not suit that data. ' + C.friendlyError(e); msg.style.color = 'var(--bad)'; return; }
    try { chart = new Chart($('#ch-canvas'), cfg); }
    catch (e) { chart = null; msg.textContent = 'The chart could not be drawn: ' + C.friendlyError(e); msg.style.color = 'var(--bad)'; return; }
    const name = TYPES.find(t => t[0] === type)[1];
    $('#ch-title').textContent = name + ' chart';
    const cap = name + ' chart of ' + (d.mode === 'eq' ? 'f(x) = ' + C.pretty(d.text) + ' from x = ' + C.fmt(d.a, 4) + ' to ' + C.fmt(d.b, 4) + ' (' + d.xs.length + ' points).' : d.ys.length + ' values from your data.') + (d.note ? ' ' + d.note : '');
    $('#ch-cap').textContent = cap; $('#ch-canvas').setAttribute('aria-label', cap);
    stats(d.ys); table(d);
  }
  $('#ch-copy').addEventListener('click', () => {
    if (!last) { U.toast('Draw a chart first'); return; }
    const head = last.mode === 'eq' ? 'x,f(x)' : (last.pairs ? 'x,y' : 'label,value');
    const lines = last.ys.map((y, i) => (last.mode === 'eq' || last.pairs ? last.xs[i] : '"' + String(last.labels[i]).replace(/"/g, '""') + '"') + ',' + y);
    U.copy([head].concat(lines).join('\n'), 'CSV copied');
  });
  document.addEventListener('mb:theme', () => { if (chart) draw(); });
  document.addEventListener('mb:show', e => { if (e.detail === 'charts') { if (!chart) draw(); else chart.resize(); } });

  if (src === 'data') $('#ch-data').value = SAMPLE;
  paintSrc();
})(globalThis.MB = globalThis.MB || {});
