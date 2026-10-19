/* ---------- solve view ---------- */
(function (MB) {
  'use strict';
  if (!MB.solve || !MB.ui) return;
  const U = MB.ui, el = U.el, $ = U.$;

  const OPT = (pairs) => pairs.map(p => ({ v: p[0], t: p[1] }));
  const MODES = [
    { id: 'auto', name: 'Any problem', hint: 'Type an equation, a system (one per line), an inequality, or an expression. The type is detected for you.',
      fields: [{ id: 'in', label: 'Problem', kind: 'area', def: '2x + 3 = 11', wide: true }],
      examples: [['2x + 3 = 11'], ['x^2 - 5x + 6 = 0'], ['x + y = 5\nx - y = 1'], ['x^2 - 4 > 0'], ['(x+1)^2 - (x-1)^2'], ['2sin(x) = 1']] },
    { id: 'equation', name: 'Equation', hint: 'Linear, quadratic, polynomial, rational, root, exponential, logarithmic, trigonometric and more.',
      fields: [{ id: 'in', label: 'Equation', kind: 'text', def: 'x^2 - 5x + 6 = 0', wide: true }, { id: 'variable', label: 'Solve for (optional)', kind: 'text', def: '', ph: 'x' }],
      examples: [['3x - 7 = 2x + 5'], ['x^2 + 2x - 8 = 0'], ['x^3 - 6x^2 + 11x - 6 = 0'], ['(x+1)/(x-1) = 3'], ['sqrt(2x+3) = 5'], ['e^x = 5'], ['ln(x) + 1 = 3'], ['2sin(x) + 1 = 0'], ['x^2 + 1 = 0'], ['abs(x - 2) = 3']] },
    { id: 'system', name: 'System', hint: 'Two or more equations, one per line. Linear systems use Gauss-Jordan row operations.',
      fields: [{ id: 'in', label: 'Equations (one per line)', kind: 'area', def: '2x + y = 7\nx - y = 2', wide: true }],
      examples: [['2x + y = 7\nx - y = 2'], ['x + y + z = 6\n2x - y + z = 3\nx + 2y - z = 2'], ['y = x^2\ny = 2x + 3'], ['x^2 + y^2 = 25\nx + y = 7']] },
    { id: 'inequality', name: 'Inequality', hint: 'Uses <, >, ≤ or ≥. The answer comes as an interval, with the working on a sign chart.',
      fields: [{ id: 'in', label: 'Inequality', kind: 'text', def: 'x^2 - 4 > 0', wide: true }],
      examples: [['2x - 3 <= 7'], ['x^2 - 4 > 0'], ['x^2 - 5x + 6 <= 0'], ['(x-1)/(x+2) >= 0']] },
    { id: 'derivative', name: 'Derivative', hint: 'Differentiate with the rule named at every step. Add a point to get the slope and tangent line.',
      fields: [{ id: 'in', label: 'f(x) =', kind: 'text', def: 'x^2 sin(x)' }, { id: 'variable', label: 'With respect to', kind: 'text', def: '', ph: 'x' }, { id: 'order', label: 'Order', kind: 'select', def: '1', opts: OPT([['1', '1st derivative'], ['2', '2nd derivative'], ['3', '3rd derivative'], ['4', '4th derivative']]) }, { id: 'point', label: 'At x = (optional)', kind: 'text', def: '', ph: '2' }],
      examples: [['x^2 sin(x)'], ['(x^2+1)/(x-3)', { point: '2' }], ['ln(x^2+1)'], ['e^(3x) cos(2x)'], ['sqrt(1-x^2)'], ['x^3 - 6x^2 + 5', { order: '2' }]] },
    { id: 'integral', name: 'Integral', hint: 'Leave the limits blank for an antiderivative. Fill both for a definite integral and the area.',
      fields: [{ id: 'in', label: 'f(x) =', kind: 'text', def: 'x^2 + 3x + 1' }, { id: 'variable', label: 'With respect to', kind: 'text', def: '', ph: 'x' }, { id: 'a', label: 'Lower limit (optional)', kind: 'text', def: '', ph: '0' }, { id: 'b', label: 'Upper limit (optional)', kind: 'text', def: '', ph: 'pi' }],
      examples: [['x^2 + 3x + 1'], ['x^2', { a: '0', b: '3' }], ['sin(x)', { a: '0', b: 'pi' }], ['x sin(x)'], ['1/(1+x^2)', { a: '0', b: '1' }], ['e^(2x)']] },
    { id: 'limit', name: 'Limit', hint: 'Direct substitution, then factoring, L’Hôpital’s rule or a numeric check.',
      fields: [{ id: 'in', label: 'f(x) =', kind: 'text', def: 'sin(x)/x' }, { id: 'variable', label: 'Variable', kind: 'text', def: '', ph: 'x' }, { id: 'to', label: 'As x approaches', kind: 'text', def: '0', ph: '0 or Infinity' }, { id: 'dir', label: 'From', kind: 'select', def: 'both', opts: OPT([['both', 'both sides'], ['left', 'the left'], ['right', 'the right']]) }],
      examples: [['sin(x)/x', { to: '0' }], ['(x^2-1)/(x-1)', { to: '1' }], ['(3x^2+2x)/(5x^2-1)', { to: 'Infinity' }], ['(1+1/x)^x', { to: 'Infinity' }], ['1/x', { to: '0', dir: 'right' }]] },
    { id: 'simplify', name: 'Algebra', hint: 'Simplify, expand, factor or split into partial fractions.',
      fields: [{ id: 'in', label: 'Expression', kind: 'text', def: '(x+1)^2 - (x-1)^2', wide: true }, { id: 'op', label: 'Operation', kind: 'select', def: 'simplify', opts: OPT([['simplify', 'Simplify'], ['expand', 'Expand'], ['factor', 'Factor'], ['partfrac', 'Partial fractions']]) }],
      examples: [['(x+1)^2 - (x-1)^2', { op: 'simplify' }], ['(x+2)(x-3)(x+1)', { op: 'expand' }], ['x^3 - 6x^2 + 11x - 6', { op: 'factor' }], ['1/(x^2-1)', { op: 'partfrac' }]] },
    { id: 'series', name: 'Series', hint: 'Taylor polynomial around a centre point, with the coefficients worked out.',
      fields: [{ id: 'in', label: 'f(x) =', kind: 'text', def: 'e^x' }, { id: 'order', label: 'Up to degree', kind: 'select', def: '4', opts: OPT([['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['8', '8']]) }, { id: 'center', label: 'Centre at x =', kind: 'text', def: '0' }],
      examples: [['e^x'], ['cos(x)', { order: '6' }], ['sin(x)', { order: '5' }], ['ln(1+x)'], ['e^x', { center: '1' }]] },
    { id: 'matrix', name: 'Matrix', hint: 'One row per line, entries separated by spaces or commas.',
      fields: [{ id: 'in', label: 'Matrix A', kind: 'area', def: '2 1\n1 3' }, { id: 'op', label: 'Operation', kind: 'select', def: 'det', opts: OPT([['det', 'Determinant'], ['inverse', 'Inverse'], ['transpose', 'Transpose'], ['trace', 'Trace'], ['rref', 'Row reduce (RREF)'], ['rank', 'Rank'], ['eigen', 'Eigenvalues'], ['power', 'Power Aⁿ'], ['multiply', 'A × B'], ['add', 'A + B'], ['subtract', 'A − B']]) }, { id: 'B', label: 'Matrix B', kind: 'area', def: '1 0\n0 1', only: ['multiply', 'add', 'subtract'] }, { id: 'power', label: 'Power n', kind: 'text', def: '3', only: ['power'] }],
      examples: [['2 1\n1 3', { op: 'det' }], ['4 7\n2 6', { op: 'inverse' }], ['2 1\n1 3', { op: 'eigen' }], ['1 2 3\n4 5 6\n7 8 10', { op: 'det' }], ['1 2\n3 4', { op: 'multiply', B: '0 1\n1 0' }]] }
  ];

  let cur = MODES[0];
  const modesBox = $('#solve-modes'), fieldsBox = $('#solve-fields'), exBox = $('#solve-examples'), out = $('#solve-out');
  const fieldEls = {};

  function setMode(id, vals) {
    cur = MODES.find(m => m.id === id) || MODES[0];
    U.store.set('solveMode', cur.id);
    modesBox.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-checked', c.dataset.id === cur.id ? 'true' : 'false'));
    fieldsBox.replaceChildren(); for (const k in fieldEls) delete fieldEls[k];
    cur.fields.forEach(f => {
      const wrap = el('div', { class: 'field' + (f.wide ? ' wide' : '') });
      const idn = 's-' + f.id;
      wrap.appendChild(el('label', { for: idn, text: f.label }));
      let inp;
      if (f.kind === 'select') {
        inp = el('select', { class: 'in', id: idn }, f.opts.map(o => el('option', { value: o.v, text: o.t })));
      } else if (f.kind === 'area') {
        inp = el('textarea', { class: 'in', id: idn, rows: f.id === 'in' && cur.id !== 'matrix' ? 3 : 4, spellcheck: 'false', autocomplete: 'off' });
      } else {
        inp = el('input', { class: 'in', id: idn, type: 'text', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', placeholder: f.ph || '' });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
      }
      if (f.kind === 'area') inp.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } });
      inp.value = vals && vals[f.id] != null ? vals[f.id] : f.def;
      wrap.appendChild(inp); fieldsBox.appendChild(wrap); fieldEls[f.id] = { inp, wrap, f };
    });
    if (fieldEls.op) fieldEls.op.inp.addEventListener('change', syncOnly);
    syncOnly();
    $('#solve-hint').textContent = cur.hint;
    exBox.replaceChildren();
    cur.examples.forEach(ex => {
      const label = ex[0].replace(/\n/g, ' ; ');
      exBox.appendChild(el('button', { class: 'chip mono', type: 'button', text: label.length > 34 ? label.slice(0, 33) + '…' : label, title: label, onclick: () => { setMode(cur.id, Object.assign({ in: ex[0] }, ex[1] || {})); run(); } }));
    });
  }
  function syncOnly() {
    const op = fieldEls.op ? fieldEls.op.inp.value : null;
    for (const k in fieldEls) { const f = fieldEls[k].f; if (f.only) fieldEls[k].wrap.hidden = f.only.indexOf(op) < 0; }
  }
  MODES.forEach(m => modesBox.appendChild(el('button', { class: 'chip', type: 'button', role: 'radio', 'data-id': m.id, 'aria-checked': 'false', text: m.name, onclick: () => { setMode(m.id); } })));

  function vals() {
    const o = {}; for (const k in fieldEls) { if (!fieldEls[k].wrap.hidden) o[k] = fieldEls[k].inp.value; } return o;
  }

  function card(title, kids, cls) { return el('div', { class: 'card ' + (cls || '') }, [el('div', { class: 'card-h' }, [el('h3', { text: title })])].concat(kids)); }

  function run() {
    if (!U.libsOk) { U.toast('The maths libraries did not load'); return; }
    const v = vals();
    const text = (v.in || '').trim();
    if (!text) { U.toast('Type a problem first'); return; }
    const opts = {};
    ['variable', 'order', 'point', 'a', 'b', 'to', 'dir', 'op', 'center', 'B', 'power'].forEach(k => { if (v[k] != null && String(v[k]).trim() !== '') opts[k] = v[k]; });
    if (opts.order) opts.order = parseInt(opts.order, 10);
    let res;
    try { res = MB.solve(cur.id, text, opts); } catch (e) { res = { error: String((e && e.message) || e) }; }
    U.plots.filter(q => q._solve).forEach(q => q.destroy());
    out.replaceChildren();
    const grid = el('div', { class: 'solve-out' });
    const left = el('div', { class: 'col' }), right = el('div', { class: 'col sticky' });
    grid.appendChild(left); grid.appendChild(right);
    if (res.error) {
      left.appendChild(el('div', { class: 'card err-card' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'I could not solve that' })]), el('p', { text: res.error }), el('p', { class: 'hint', style: 'margin-top:8px', text: 'Check the brackets, use * or a space for multiplication if needed, and make sure each equation has a single = sign.' })]));
      out.appendChild(grid); return;
    }
    // problem recap
    left.appendChild(U.renderAnswers(res));
    if (res.steps && res.steps.length) {
      const sc = el('div', { class: 'card' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'Worked solution' }), el('span', { class: 'hint', text: res.steps.length + ' steps' })])]);
      sc.appendChild(U.renderSteps(res.steps)); left.appendChild(sc);
    }
    if (res.plot && res.plot.items && res.plot.items.length && U.Plot) {
      const wrap = el('div', { class: 'plot-wrap short' }, [el('canvas', { 'aria-label': 'Graph of the problem' })]);
      const legend = el('div', { class: 'legend' });
      const pc = el('div', { class: 'card' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'Graph' }), el('button', { class: 'btn small', type: 'button', text: 'Open in Graph tab', onclick: () => { if (U.graphLoad) { U.graphLoad(res.plot); U.showTab('graph'); } } })]), wrap, legend,
        el('div', { class: 'plot-bar' }, [el('button', { class: 'btn small', type: 'button', text: 'Fit', onclick: () => p.fit() }), el('span', { class: 'coords', text: 'Drag to pan, scroll to zoom' })])]);
      right.appendChild(pc);
      out.appendChild(grid);
      var p = new U.Plot(wrap, { coords: pc.querySelector('.coords') });
      p.setData(res.plot);
      p.fit();
      p._solve = true;
      U.legend(legend, p.items);
    } else out.appendChild(grid);
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#solve-go').addEventListener('click', run);

  /* hand a typed problem over from elsewhere */
  U.solveLoad = function (modeId, text) { U.showTab('solve'); setMode(modeId, { in: text }); };
  setMode(U.store.get('solveMode', 'auto'));
})(globalThis.MB = globalThis.MB || {});
