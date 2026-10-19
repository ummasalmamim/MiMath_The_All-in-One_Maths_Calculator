/* ---------- graph view ---------- */
(function (MB) {
  'use strict';
  if (!MB.core || !MB.ui || !MB.ui.Plot) return;
  const U = MB.ui, C = MB.core, el = U.el, $ = U.$;
  const MAXROWS = 6;
  const KINDS = [['fn', 'y = f(x)'], ['implicit', 'Equation in x and y'], ['polar', 'Polar r(θ)'], ['param', 'Parametric x(t), y(t)']];
  const EXAMPLES = [
    ['Parabola and line', [{ k: 'fn', a: 'x^2 - 4' }, { k: 'fn', a: 'x + 2' }]],
    ['Sine and cosine', [{ k: 'fn', a: 'sin(x)' }, { k: 'fn', a: 'cos(x)' }]],
    ['Cubic', [{ k: 'fn', a: 'x^3 - 3x' }]],
    ['Tangent', [{ k: 'fn', a: 'tan(x)' }]],
    ['e^x and ln x', [{ k: 'fn', a: 'e^x' }, { k: 'fn', a: 'ln(x)' }, { k: 'fn', a: 'x' }]],
    ['Rational', [{ k: 'fn', a: '(x^2 - 1)/(x - 2)' }]],
    ['Circle and line', [{ k: 'implicit', a: 'x^2 + y^2 = 25' }, { k: 'implicit', a: 'y = x + 1' }]],
    ['Ellipse', [{ k: 'implicit', a: 'x^2/9 + y^2/4 = 1' }]],
    ['Heart curve', [{ k: 'implicit', a: '(x^2 + y^2 - 1)^3 = x^2 y^3' }]],
    ['Rose (polar)', [{ k: 'polar', a: '2 cos(3 theta)' }]],
    ['Spiral (polar)', [{ k: 'polar', a: 'theta / 3', tmax: '12.57' }]],
    ['Lissajous', [{ k: 'param', a: 'sin(3t)', b: 'sin(2t)' }]]
  ];
  let rows = [], overlay = null, nextId = 1;
  const rowsBox = $('#grows');
  const plot = new U.Plot($('#g-wrap'), { coords: $('#g-coords'), onView: () => keys() });

  function freeSlot() { const used = rows.map(r => r.slot); for (let i = 0; i < MAXROWS; i++) if (used.indexOf(i) < 0) return i; return 0; }
  function mk(k, a, b, extra) { return Object.assign({ id: nextId++, k: k || 'fn', a: a || '', b: b || '', tmin: '0', tmax: '6.2832', visible: true, slot: 0 }, extra || {}); }
  function save() { U.store.set('graphRows', rows.map(r => ({ k: r.k, a: r.a, b: r.b, visible: r.visible, tmax: r.tmax }))); }

  /* ---------- text to plot items ---------- */
  const stripY = s => s.replace(/^\s*(y|f\s*\(\s*x\s*\)|r|r\s*\(\s*(theta|θ)\s*\))\s*=\s*/i, '');
  function toItem(r) {
    const a = r.a.trim(), b = r.b.trim();
    if (r.k === 'fn') { const e = C.userNorm(stripY(a)); return { type: 'fn', expr: e, label: 'y = ' + C.pretty(stripY(a)), vars: ['x'] }; }
    if (r.k === 'polar') { const e = C.userNorm(stripY(a)); return { type: 'polar', expr: e, label: 'r = ' + C.pretty(stripY(a)), tmin: 0, tmax: parseFloat(r.tmax) || 2 * Math.PI, vars: ['theta'] }; }
    if (r.k === 'param') { return { type: 'param', xe: C.userNorm(a), ye: C.userNorm(b), label: 'x = ' + C.pretty(a) + ', y = ' + C.pretty(b), tmin: parseFloat(r.tmin) || 0, tmax: parseFloat(r.tmax) || 2 * Math.PI, vars: ['t'] }; }
    let L = a, R = '0'; const parts = C.splitEq ? C.splitEq(C.userNorm(a)) : null;
    if (parts && parts[1] != null) { L = parts[0]; R = parts[1]; } else L = C.userNorm(a);
    return { type: 'implicit', expr: '(' + L + ')-(' + R + ')', label: C.pretty(a), vars: ['x', 'y'] };
  }
  function checkVars(it) {
    const texts = it.type === 'param' ? [it.xe, it.ye] : [it.expr];
    for (const t of texts) {
      const node = C.core.parse(C.norm(t));
      const vs = Array.from(C.nodeVars(node) || []);
      const bad = vs.filter(v => it.vars.indexOf(v) < 0);
      if (bad.length) return 'I do not know "' + bad[0] + '". This curve can use ' + it.vars.join(', ') + ', numbers and functions.';
    }
    return null;
  }

  /* ---------- sync rows to the plot ---------- */
  let syncT;
  function sync(refit) {
    clearTimeout(syncT);
    const items = [], map = [];
    rows.forEach((r, ri) => {
      r._err = null;
      if (!r.a.trim() || (r.k === 'param' && !r.b.trim())) return;
      try {
        const it = toItem(r); const bad = checkVars(it);
        if (bad) { r._err = bad; return; }
        it.visible = r.visible; it.slot = r.slot; it.row = ri; items.push(it); map.push(r);
      } catch (e) { r._err = C.friendlyError(e); }
    });
    const first = rows.find(r => r.visible && r.k === 'fn' && r.a.trim() && !r._err);
    if ($('#g-deriv').checked && first) {
      try {
        const e = C.userNorm(stripY(first.a)), d = C.core.derivative(C.norm(e), 'x').toString();
        items.push({ type: 'fn', expr: d, label: 'derivative: ' + C.pretty(d), dash: true, visible: true, slot: 6, vars: ['x'] });
      } catch (e) { /* no derivative for this function */ }
    }
    plot.setData({ items, points: overlay ? overlay.points : [], bands: overlay ? overlay.bands : [], shade: overlay ? overlay.shade : null });
    plot.items.forEach(it => { if (it._err && it.row != null) rows[it.row]._err = C.friendlyError(it._err); });
    paintErrors();
    U.legend($('#g-legend'), plot.items);
    if (refit) plot.fit();
    keys(); table();
  }
  const syncSoon = () => { overlay = null; clearTimeout(syncT); syncT = setTimeout(() => { sync(false); save(); }, 220); };

  function keys() {
    const box = $('#g-keylist');
    if (!$('#g-keys').checked) { plot.markers = []; box.replaceChildren(); plot.draw(); return; }
    const r = plot.range(), fns = plot.fnItems();
    let ks = [];
    try { ks = fns.length && plot.W ? U.keyPoints(fns, r.xmin, r.xmax) : []; } catch (e) { ks = []; }
    plot.markers = ks; plot.draw();
    box.replaceChildren();
    const names = { root: 'Zero', max: 'Peak', min: 'Valley', cross: 'Crossing', yint: 'y-intercept' };
    ks.slice(0, 12).forEach(k => box.appendChild(el('div', { class: 'stat' }, [el('dt', { text: names[k.type] }), el('dd', { text: '(' + C.fmt(k.x, 5) + ', ' + C.fmt(k.y, 5) + ')' })])));
    if (ks.length > 12) box.appendChild(el('p', { class: 'hint', text: ks.length - 12 + ' more in view. Zoom in to see them.' }));
  }

  /* ---------- table of values ---------- */
  function table() {
    const t = $('#t-data'); t.replaceChildren();
    const fns = plot.items.filter(i => i.type === 'fn' && i.visible && !i._err && i.row != null);
    const from = safe($('#t-from').value), to = safe($('#t-to').value), st = safe($('#t-step').value);
    if (!fns.length || !Number.isFinite(from) || !Number.isFinite(to) || !(st > 0)) { t.appendChild(el('tbody', null, [el('tr', null, [el('td', { text: fns.length ? 'Check the from, to and step values.' : 'Add a y = f(x) curve to see values.' })])])); return; }
    const head = el('tr', null, [el('th', { text: 'x' })].concat(fns.map(f => el('th', { text: 'y' + (fns.length > 1 ? ' (' + (f.row + 1) + ')' : '') }))));
    t.appendChild(el('thead', null, [head]));
    const body = el('tbody');
    const fo = fns.map(f => plot.fnOf(f));
    const n = Math.min(200, Math.floor((to - from) / st + 1e-9));
    for (let i = 0; i <= n; i++) {
      const x = from + i * st, xr = Math.round(x * 1e9) / 1e9;
      body.appendChild(el('tr', null, [el('td', { text: C.fmt(xr, 6) })].concat(fo.map(f => { const y = f(xr); return el('td', { text: Number.isFinite(y) ? C.fmt(y, 6) : 'undefined' }); }))));
    }
    t.appendChild(body);
  }
  function safe(s) { try { return C.num(C.calc.evaluate(C.userNorm(s))); } catch (e) { return NaN; } }

  /* ---------- row UI ---------- */
  function paintErrors() {
    rowsBox.querySelectorAll('.grow').forEach((g, i) => {
      const r = rows[i]; if (!r) return;
      let e = g.querySelector('.gerr');
      if (r._err) { if (!e) { e = el('div', { class: 'gerr' }); g.appendChild(e); } e.textContent = r._err; } else if (e) e.remove();
      g.querySelectorAll('input.in').forEach(x => x.classList.toggle('err', !!r._err));
    });
  }
  function paintRows() {
    rowsBox.replaceChildren();
    rows.forEach((r, i) => {
      const top = el('div', { class: 'gtop' });
      const sel = el('select', { class: 'in', 'aria-label': 'Curve type', onchange: () => { r.k = sel.value; paintRows(); sync(false); save(); } }, KINDS.map(k => el('option', { value: k[0], text: k[1] })));
      sel.value = r.k; top.appendChild(sel);
      const mkIn = (key, ph, lab) => {
        const inp = el('input', { class: 'in', type: 'text', value: r[key], placeholder: ph, spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-label': lab });
        inp.addEventListener('input', () => { r[key] = inp.value; syncSoon(); });
        return inp;
      };
      if (r.k === 'fn') top.appendChild(mkIn('a', 'y = x^2 - 4', 'Function of x'));
      else if (r.k === 'implicit') top.appendChild(mkIn('a', 'x^2 + y^2 = 25', 'Equation in x and y'));
      else if (r.k === 'polar') { top.appendChild(mkIn('a', 'r = 2cos(3 theta)', 'Radius as a function of theta')); }
      else { top.appendChild(mkIn('a', 'x(t) = sin(3t)', 'x as a function of t')); top.appendChild(mkIn('b', 'y(t) = sin(2t)', 'y as a function of t')); }
      const eye = el('button', { class: 'iconb', type: 'button', 'aria-pressed': r.visible ? 'true' : 'false', title: r.visible ? 'Hide this curve' : 'Show this curve', 'aria-label': 'Show or hide this curve', text: r.visible ? '◉' : '○', onclick: () => { r.visible = !r.visible; paintRows(); sync(false); save(); } });
      const del = el('button', { class: 'iconb', type: 'button', title: 'Remove this curve', 'aria-label': 'Remove this curve', text: '✕', onclick: () => { rows.splice(i, 1); if (!rows.length) rows.push(mk('fn', '', '', { slot: 0 })); paintRows(); sync(false); save(); } });
      const dot = el('span', { class: 'dot', style: 'background:' + U.series(r.slot) });
      rowsBox.appendChild(el('div', { class: 'grow' }, [dot, top, eye, del]));
    });
    $('#g-add').disabled = rows.length >= MAXROWS;
    paintErrors();
  }
  function setRows(list, refit) {
    rows = []; list.slice(0, MAXROWS).forEach(d => { const r = mk(d.k, d.a, d.b, { tmax: d.tmax || '6.2832', visible: d.visible !== false }); r.slot = freeSlot(); rows.push(r); });
    if (!rows.length) rows.push(mk('fn', '', '', { slot: 0 }));
    overlay = null; paintRows(); sync(refit); save();
  }
  $('#g-add').addEventListener('click', () => {
    if (rows.length >= MAXROWS) return;
    const r = mk('fn', '', ''); r.slot = freeSlot(); rows.push(r); paintRows(); save();
    const ins = rowsBox.querySelectorAll('.grow'); const last = ins[ins.length - 1]; const x = last && last.querySelector('input'); if (x) x.focus();
  });
  EXAMPLES.forEach(([name, list]) => $('#g-examples').appendChild(el('button', { class: 'chip', type: 'button', text: name, onclick: () => setRows(list, true) })));

  /* ---------- toolbar and options ---------- */
  $('#g-zin').addEventListener('click', () => plot.zoom(1.4));
  $('#g-zout').addEventListener('click', () => plot.zoom(1 / 1.4));
  $('#g-fit').addEventListener('click', () => plot.fit());
  $('#g-home').addEventListener('click', () => plot.home());
  $('#g-square').addEventListener('click', () => plot.square());
  $('#g-deriv').addEventListener('change', () => sync(false));
  $('#g-keys').addEventListener('change', () => keys());
  ['t-from', 't-to', 't-step'].forEach(id => $('#' + id).addEventListener('input', table));
  document.addEventListener('mb:show', e => { if (e.detail === 'graph') { plot.resize(); keys(); } });

  /* ---------- load from the Solve tab ---------- */
  const toUser = s => s.replace(/\blog10\(/g, '\u0001(').replace(/\blog\(/g, 'ln(').replace(/\u0001\(/g, 'log(');
  U.graphLoad = function (pd) {
    const list = [];
    (pd.items || []).forEach(it => {
      if (list.length >= MAXROWS) return;
      if (it.type === 'implicit') list.push({ k: 'implicit', a: toUser(it.expr) + ' = 0' });
      else if (it.type === 'fn') list.push({ k: 'fn', a: toUser(it.expr) });
    });
    rows = []; list.forEach(d => { const r = mk(d.k, d.a, ''); r.slot = freeSlot(); rows.push(r); });
    if (!rows.length) rows.push(mk('fn', '', '', { slot: 0 }));
    paintRows(); sync(false);
    overlay = { points: (pd.points || []).map(p => Object.assign({}, p)), bands: pd.bands || [], shade: pd.shade || null };
    plot.setData({ items: plot.items, points: overlay.points, bands: overlay.bands, shade: overlay.shade });
    plot.center = pd.center; plot.fit(); keys(); save();
  };

  /* ---------- start ---------- */
  const saved = U.store.get('graphRows', null);
  if (Array.isArray(saved) && saved.length && saved.some(r => r && r.a)) setRows(saved.filter(r => r && typeof r.a === 'string'), true);
  else setRows(EXAMPLES[0][1], true);
})(globalThis.MB = globalThis.MB || {});
