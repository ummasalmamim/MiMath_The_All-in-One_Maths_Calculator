/* ---------- complex numbers ---------- */
(function (MB) {
  'use strict';
  if (!MB.core || !MB.ui || !MB.ui.Plot) return;
  const U = MB.ui, C = MB.core, el = U.el, root = U.$('#v-complex');
  const TAU = 2 * Math.PI;

  /* ----- formatting ----- */
  const neg = s => s.replace(/-/g, '−');
  function f(x) {
    if (!Number.isFinite(x)) return String(x);
    if (Math.abs(x) < 1e-12) return '0';
    const fr = C.bestFraction(x, 1000, 1e-11);
    if (fr && fr.d > 1) return neg(fr.n + '/' + fr.d);
    return neg(C.fmt(x, 8));
  }
  function imag(a) { const t = f(a); return t === '1' ? 'i' : (t.indexOf('/') > 0 ? '(' + t + ')i' : t + 'i'); }
  function zs(z) {
    const re = Math.abs(z.re) < 1e-12 ? 0 : z.re, im = Math.abs(z.im) < 1e-12 ? 0 : z.im;
    if (im === 0) return f(re);
    if (re === 0) return (im < 0 ? '−' : '') + imag(Math.abs(im));
    return f(re) + (im < 0 ? ' − ' : ' + ') + imag(Math.abs(im));
  }
  const par = z => { const t = zs(z); return (t[0] === '−' || /\s[+−]\s/.test(t)) ? '(' + t + ')' : t; };
  const dec = z => { const t = x => neg(C.fmt(Math.abs(x) < 1e-12 ? 0 : x, 8)); return t(z.re) + (z.im < 0 ? ' − ' : ' + ') + t(Math.abs(z.im)).replace(/^1$/, '1') + 'i'; };
  const abs = z => Math.hypot(z.re, z.im), arg = z => Math.atan2(z.im, z.re);
  const polar = z => { const r = abs(z), t = arg(z); return C.fmt(r, 8) + ' ∠ ' + C.fmt(t * 180 / Math.PI, 8) + '°'; };

  /* ----- arithmetic ----- */
  const add = (a, b) => ({ re: a.re + b.re, im: a.im + b.im }), sub = (a, b) => ({ re: a.re - b.re, im: a.im - b.im });
  const mul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
  const div = (a, b) => { const d = b.re * b.re + b.im * b.im; return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }; };
  const cexp = a => ({ re: Math.exp(a.re) * Math.cos(a.im), im: Math.exp(a.re) * Math.sin(a.im) });
  const cln = a => ({ re: Math.log(abs(a)), im: arg(a) });
  const fromPolar = (r, t) => ({ re: r * Math.cos(t), im: r * Math.sin(t) });

  function toC(v) {
    if (typeof v === 'number') return { re: v, im: 0 };
    if (v && typeof v.re === 'number' && typeof v.im === 'number') return { re: v.re, im: v.im };
    if (v && v.isFraction) return { re: v.valueOf(), im: 0 };
    throw new Error('Enter a number or a complex number such as 3+4i.');
  }
  function parse(txt, what) {
    const t = String(txt || '').trim();
    if (!t) throw new Error('Enter ' + what + '.');
    const s = C.userNorm(t.replace(/(\d|\))\s*j\b/g, '$1i'));
    let v; try { v = C.core.evaluate(s); } catch (e) { throw new Error('I could not read "' + t + '" as a complex number. Write it like 3+4i or 2-i.'); }
    return toC(v);
  }
  const S = (t, m, n) => ({ t, m: [].concat(m || []), n: n || '' });
  const sgn = x => x < 0 ? ' − ' : ' + ';
  const ab = x => f(Math.abs(x));

  /* ----- operations: each returns { steps, res: [complex], label } ----- */
  const OPS = [
    { id: 'add', name: 'z + w', w: 1, run(z, w) { const r = add(z, w); return { label: 'z + w', res: [r], steps: [S('Add the real parts, then the imaginary parts', ['(a + bi) + (c + di) = (a + c) + (b + d)i', '= (' + f(z.re) + ' + ' + par({ re: w.re, im: 0 }) + ') + (' + f(z.im) + ' + ' + par({ re: w.im, im: 0 }) + ')i', '= ' + zs(r)])] }; } },
    { id: 'sub', name: 'z − w', w: 1, run(z, w) { const r = sub(z, w); return { label: 'z − w', res: [r], steps: [S('Subtract the real parts, then the imaginary parts', ['(a + bi) − (c + di) = (a − c) + (b − d)i', '= (' + f(z.re) + ' − ' + par({ re: w.re, im: 0 }) + ') + (' + f(z.im) + ' − ' + par({ re: w.im, im: 0 }) + ')i', '= ' + zs(r)])] }; } },
    { id: 'mul', name: 'z × w', w: 1, run(z, w) {
      const r = mul(z, w), p = x => x < 0 ? '(' + f(x) + ')' : f(x);
      return { label: 'z × w', res: [r], steps: [
        S('Multiply every part by every part', '(a + bi)(c + di) = ac + adi + bci + bdi²'),
        S('Replace i² with −1', ['= (ac − bd) + (ad + bc)i', '= (' + p(z.re) + '·' + p(w.re) + ' − ' + p(z.im) + '·' + p(w.im) + ') + (' + p(z.re) + '·' + p(w.im) + ' + ' + p(z.im) + '·' + p(w.re) + ')i', '= ' + zs(r)])] };
    } },
    { id: 'div', name: 'z ÷ w', w: 1, run(z, w) {
      const d = w.re * w.re + w.im * w.im; if (d === 0) throw new Error('Division by zero. w must not be 0.');
      const r = div(z, w), nre = z.re * w.re + z.im * w.im, nim = z.im * w.re - z.re * w.im;
      return { label: 'z ÷ w', res: [r], steps: [
        S('Multiply top and bottom by the conjugate of the bottom', '(a + bi)/(c + di) × (c − di)/(c − di)', 'The conjugate of ' + zs(w) + ' is ' + zs({ re: w.re, im: -w.im }) + '. This makes the bottom a real number.'),
        S('Bottom: (c + di)(c − di) = c² + d²', 'c² + d² = ' + f(w.re) + '² + ' + f(w.im) + '² = ' + f(d)),
        S('Top: (a + bi)(c − di) = (ac + bd) + (bc − ad)i', '= ' + f(nre) + ' + ' + par({ re: nim, im: 0 }) + 'i'),
        S('Divide each part by ' + f(d), '= ' + f(nre) + '/' + f(d) + sgn(nim) + ab(nim) + '/' + f(d) + ' i', '= ' + zs(r))] };
    } },
    { id: 'pow', name: 'z ^ w', w: 1, run(z, w) {
      if (z.re === 0 && z.im === 0) throw new Error('0 to a power is not defined here. Use a non-zero z.');
      const l = cln(z), r = cexp(mul(w, l));
      return { label: 'z^w', res: [r], steps: [
        S('Write z^w as e^(w·ln z)', 'z^w = e^(w ln z)', 'This gives the principal value. Other values exist because ln has many branches.'),
        S('Find ln z = ln|z| + i·arg z', 'ln z = ln(' + C.fmt(abs(z), 6) + ') + ' + C.fmt(arg(z), 6) + 'i = ' + dec(l)),
        S('Multiply by w', 'w·ln z = ' + dec(mul(w, l))),
        S('Apply e^(x + iy) = e^x (cos y + i sin y)', '= ' + dec(r))] };
    } },
    { id: 'conj', name: 'Conjugate', run(z) { const r = { re: z.re, im: -z.im }; return { label: 'conjugate of z', res: [r], steps: [S('Change the sign of the imaginary part', ['conj(a + bi) = a − bi', 'conj(' + zs(z) + ') = ' + zs(r)], 'Geometrically this reflects z in the real axis.')] }; } },
    { id: 'abs', name: 'Modulus |z|', run(z) { const q = z.re * z.re + z.im * z.im, r = Math.sqrt(q); return { label: '|z|', res: [{ re: r, im: 0 }], steps: [S('Use Pythagoras: |z| = √(a² + b²)', ['|z| = √(' + f(z.re) + '² + ' + f(z.im) + '²)', '= √' + f(q) + ' = ' + (Number.isInteger(r) ? r : C.fmt(r, 8))], 'The modulus is the distance from z to the origin.')] }; } },
    { id: 'arg', name: 'Argument arg z', run(z) {
      if (!z.re && !z.im) throw new Error('The argument of 0 is not defined.');
      const t = arg(z), q = z.re > 0 && z.im >= 0 ? 'quadrant I' : z.re <= 0 && z.im > 0 ? 'quadrant II' : z.re < 0 && z.im <= 0 ? 'quadrant III' : 'quadrant IV';
      return { label: 'arg z', res: [{ re: t, im: 0 }], steps: [S('Use θ = atan2(b, a)', ['θ = atan2(' + f(z.im) + ', ' + f(z.re) + ')', '= ' + C.fmt(t, 8) + ' rad = ' + C.fmt(t * 180 / Math.PI, 8) + '°'], 'z lies in ' + q + ', and atan2 picks the right angle for that quadrant. The principal argument is between −π and π.')] };
    } },
    { id: 'polar', name: 'Polar form', run(z) {
      if (!z.re && !z.im) throw new Error('0 has no polar angle. Use a non-zero z.');
      const r = abs(z), t = arg(z);
      return { label: 'polar form of z', res: [z], extra: ['Polar: ' + C.fmt(r, 8) + '(cos ' + C.fmt(t, 6) + ' + i sin ' + C.fmt(t, 6) + ')', 'Exponential: ' + C.fmt(r, 8) + ' e^(' + C.fmt(t, 6) + 'i)'], steps: [
        S('Find the modulus r', 'r = √(' + f(z.re) + '² + ' + f(z.im) + '²) = ' + C.fmt(r, 8)),
        S('Find the argument θ', 'θ = atan2(' + f(z.im) + ', ' + f(z.re) + ') = ' + C.fmt(t, 8) + ' rad = ' + C.fmt(t * 180 / Math.PI, 8) + '°'),
        S('Write z = r(cos θ + i sin θ) = r e^(iθ)', ['z = ' + C.fmt(r, 8) + '(cos ' + C.fmt(t, 6) + ' + i sin ' + C.fmt(t, 6) + ')', 'z = ' + C.fmt(r, 8) + ' e^(' + C.fmt(t, 6) + 'i)'])] };
    } },
    { id: 'recip', name: '1 ÷ z', run(z) {
      const d = z.re * z.re + z.im * z.im; if (!d) throw new Error('Division by zero. z must not be 0.');
      const r = div({ re: 1, im: 0 }, z);
      return { label: '1/z', res: [r], steps: [S('Multiply top and bottom by the conjugate', ['1/(a + bi) = (a − bi)/(a² + b²)', '= (' + f(z.re) + ' − ' + par({ re: z.im, im: 0 }) + 'i)/' + f(d), '= ' + zs(r)])] };
    } },
    { id: 'sqrt', name: 'Square root', run(z) { return rootsOf(z, 2); } },
    { id: 'npow', name: 'z to the power n', n: 1, run(z, w, n) {
      if (!Number.isInteger(n)) throw new Error('n must be a whole number for De Moivre. Use z ^ w for other powers.');
      if (!z.re && !z.im) return { label: 'z^n', res: [{ re: 0, im: 0 }], steps: [S('Zero to a positive power is zero', '0^n = 0')] };
      const r = abs(z), t = arg(z), res = fromPolar(Math.pow(r, n), n * t);
      return { label: 'z^' + n, res: [res], steps: [
        S('Write z in polar form', 'r = ' + C.fmt(r, 8) + ',  θ = ' + C.fmt(t, 8) + ' rad'),
        S('Apply De Moivre: zⁿ = rⁿ (cos nθ + i sin nθ)', ['r^' + n + ' = ' + C.fmt(Math.pow(r, n), 8), 'nθ = ' + C.fmt(n * t, 8) + ' rad']),
        S('Convert back to a + bi', ['= ' + C.fmt(Math.pow(r, n), 8) + '(cos ' + C.fmt(n * t, 6) + ' + i sin ' + C.fmt(n * t, 6) + ')', '= ' + zs(res)])] };
    } },
    { id: 'roots', name: 'nth roots', n: 1, run(z, w, n) { if (!Number.isInteger(n) || n < 1 || n > 12) throw new Error('Choose a whole number n from 1 to 12.'); return rootsOf(z, n); } },
    { id: 'exp', name: 'e ^ z', run(z) { const r = cexp(z); return { label: 'e^z', res: [r], steps: [S('Use Euler: e^(a + bi) = e^a (cos b + i sin b)', ['e^' + f(z.re) + ' = ' + C.fmt(Math.exp(z.re), 8), 'cos ' + f(z.im) + ' = ' + C.fmt(Math.cos(z.im), 8) + ',  sin ' + f(z.im) + ' = ' + C.fmt(Math.sin(z.im), 8), '= ' + dec(r)])] }; } },
    { id: 'ln', name: 'ln z', run(z) {
      if (!z.re && !z.im) throw new Error('ln 0 is not defined.');
      const r = cln(z);
      return { label: 'ln z (principal value)', res: [r], steps: [S('Use ln z = ln|z| + i·arg z', ['ln|z| = ln(' + C.fmt(abs(z), 8) + ') = ' + C.fmt(r.re, 8), 'arg z = ' + C.fmt(r.im, 8), '= ' + dec(r)], 'Every other value is this plus 2πk·i for a whole number k.')] };
    } },
    { id: 'sin', name: 'sin z', run(z) { const r = { re: Math.sin(z.re) * Math.cosh(z.im), im: Math.cos(z.re) * Math.sinh(z.im) }; return { label: 'sin z', res: [r], steps: [S('Use sin(a + bi) = sin a cosh b + i cos a sinh b', '= ' + dec(r))] }; } },
    { id: 'cos', name: 'cos z', run(z) { const r = { re: Math.cos(z.re) * Math.cosh(z.im), im: -Math.sin(z.re) * Math.sinh(z.im) }; return { label: 'cos z', res: [r], steps: [S('Use cos(a + bi) = cos a cosh b − i sin a sinh b', '= ' + dec(r))] }; } }
  ];
  function rootsOf(z, n) {
    if (!z.re && !z.im) return { label: 'roots of 0', res: [{ re: 0, im: 0 }], steps: [S('Zero has only one root', '0')] };
    const r = abs(z), t = arg(z), rn = Math.pow(r, 1 / n), res = [], lines = [];
    for (let k = 0; k < n; k++) { const th = (t + TAU * k) / n, w = fromPolar(rn, th); res.push(w); lines.push('k = ' + k + ':  θ = ' + C.fmt(th, 6) + ' rad  →  ' + dec(w)); }
    return { label: n === 2 ? 'square roots of z' : n + 'th roots of z', res, steps: [
      S('Write z in polar form', 'r = ' + C.fmt(r, 8) + ',  θ = ' + C.fmt(t, 8) + ' rad'),
      S('Use the root formula', ['ⁿ√z = r^(1/n) [cos((θ + 2πk)/n) + i sin((θ + 2πk)/n)],  k = 0 … n − 1', 'r^(1/' + n + ') = ' + C.fmt(rn, 8)], 'There are exactly ' + n + ' roots, evenly spread around a circle.'),
      S('Work out each root', lines)] };
  }

  /* ----- UI ----- */
  const state = { op: 'mul' };
  const zIn = el('input', { class: 'in', id: 'cx-z', value: '3 + 4i', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off' });
  const wIn = el('input', { class: 'in', id: 'cx-w', value: '1 - 2i', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off' });
  const nIn = el('input', { class: 'in', id: 'cx-n', value: '3', inputmode: 'numeric' });
  const wF = el('div', { class: 'field' }, [el('label', { for: 'cx-w', text: 'w =' }), wIn]);
  const nF = el('div', { class: 'field' }, [el('label', { for: 'cx-n', text: 'n =' }), nIn]);
  const opsBox = el('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Operation' });
  OPS.forEach(o => opsBox.appendChild(el('button', { class: 'chip', type: 'button', role: 'radio', 'data-id': o.id, 'aria-checked': 'false', text: o.name, onclick: () => { state.op = o.id; paintOps(); run(); } })));
  function paintOps() {
    const o = OPS.find(x => x.id === state.op);
    opsBox.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-checked', b.dataset.id === state.op ? 'true' : 'false'));
    wF.hidden = !o.w; nF.hidden = !o.n;
  }
  const exprIn = el('input', { class: 'in', id: 'cx-expr', value: '(2+3i)^2 / (1-i) + sqrt(-9)', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off' });
  const exprOut = el('div', { class: 'hint', style: 'margin-top:8px' });
  const out = el('div', { 'aria-live': 'polite' });
  const exBox = el('div', { class: 'chips' });
  [['3+4i', '1-2i', 'mul'], ['2+3i', '4-i', 'add'], ['5+12i', '', 'sqrt'], ['1+i', '', 'npow', '8'], ['-8', '', 'roots', '3'], ['1+i', '', 'polar'], ['6+8i', '2+i', 'div'], ['i', '', 'exp']].forEach(([z, w, op, n]) => {
    const o = OPS.find(x => x.id === op);
    exBox.appendChild(el('button', { class: 'chip mono', type: 'button', text: o.name + ':  ' + z + (w ? ',  ' + w : '') + (n ? ',  n=' + n : ''), onclick: () => { zIn.value = z; if (w) wIn.value = w; if (n) nIn.value = n; state.op = op; paintOps(); run(); } }));
  });
  const calcBtn = el('button', { class: 'btn primary', type: 'button', text: 'Work it out', onclick: () => run() });
  const exprBtn = el('button', { class: 'btn', type: 'button', text: 'Evaluate', onclick: () => evalExpr() });
  [zIn, wIn, nIn].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run(); } }));
  exprIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); evalExpr(); } });

  root.appendChild(el('div', { class: 'stack' }, [
    el('div', { class: 'card solve-input' }, [
      el('div', { class: 'card-h' }, [el('h3', { text: 'Complex number operations' }), el('span', { class: 'hint', text: 'Write numbers like 3+4i, 2i or -1.5+0.5i' })]),
      el('div', { class: 'fields' }, [el('div', { class: 'field' }, [el('label', { for: 'cx-z', text: 'z =' }), zIn]), wF, nF]),
      el('div', { class: 'symbar', 'data-sym': 'complex' }),
      opsBox,
      el('div', { class: 'act-row' }, [calcBtn, el('span', { class: 'hint', text: 'i is the imaginary unit, with i² = −1.' })]),
      el('div', null, [el('div', { class: 'eyebrow', style: 'margin-bottom:6px', text: 'Try an example' }), exBox])
    ]),
    el('div', { class: 'card' }, [
      el('div', { class: 'card-h' }, [el('h3', { text: 'Any complex expression' })]),
      el('div', { class: 'field' }, [el('label', { for: 'cx-expr', text: 'Expression' }), exprIn]),
      el('div', { class: 'act-row', style: 'margin-top:10px' }, [exprBtn]), exprOut
    ]),
    out
  ]));
  const sb = root.querySelector('[data-sym]');
  [['i', 'i'], ['(', '('], [')', ')'], ['+', '+'], ['−', '-'], ['×', '*'], ['÷', '/'], ['^', '^'], ['π', 'pi'], ['e', 'e'], ['√', 'sqrt(']].forEach(([l, ins]) => sb.appendChild(el('button', { class: 'chip mono', type: 'button', text: l, onmousedown: e => e.preventDefault(), onclick: () => U.insertAt(document.activeElement && document.activeElement.classList.contains('in') ? document.activeElement : zIn, ins) })));

  function evalExpr() {
    exprOut.textContent = ''; exprOut.style.color = '';
    try {
      const z = parse(exprIn.value, 'an expression');
      exprOut.replaceChildren(el('div', null, ['Rectangular:  ', el('b', { class: 'mono', text: zs(z) })]), el('div', null, ['Polar:  ', el('b', { class: 'mono', text: z.re || z.im ? polar(z) : '0' })]), el('div', { class: 'mono', style: 'color:var(--ink-2)', text: dec(z) }));
    } catch (e) { exprOut.textContent = C.friendlyError(e); exprOut.style.color = 'var(--bad)'; }
  }

  function run() {
    U.plots.filter(q => q._cx).forEach(q => q.destroy());
    out.replaceChildren();
    const o = OPS.find(x => x.id === state.op);
    let z, w = null, n = null, r;
    try {
      z = parse(zIn.value, 'z');
      if (o.w) w = parse(wIn.value, 'w');
      if (o.n) { n = parseFloat(nIn.value); if (!Number.isFinite(n)) throw new Error('Enter n as a number.'); }
      r = o.run(z, w, n);
    } catch (e) {
      out.appendChild(el('div', { class: 'card err-card' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'I could not do that' })]), el('p', { text: C.friendlyError(e) })])); return;
    }
    const start = [S('Write the numbers', ['z = ' + zs(z) + '   (a = ' + f(z.re) + ', b = ' + f(z.im) + ')'].concat(w ? ['w = ' + zs(w) + '   (c = ' + f(w.re) + ', d = ' + f(w.im) + ')'] : []).concat(n != null && o.n ? ['n = ' + f(n)] : []))];
    const answers = r.res.map((q, i) => ({ lhs: r.res.length > 1 ? 'root ' + (i + 1) : r.label, exact: zs(q), approx: dec(q) === zs(q) ? null : dec(q), note: q.re || q.im ? 'Polar: ' + polar(q) : '' }));
    if (r.extra) r.extra.forEach(t => answers.push({ lhs: '', exact: t, approx: null, note: '' }));
    const left = el('div', { class: 'col' }), right = el('div', { class: 'col sticky' });
    left.appendChild(U.renderAnswers({ headline: r.res.length === 1 ? r.label + ' = ' + zs(r.res[0]) : r.res.length + ' roots', answers }));
    left.appendChild(el('div', { class: 'card' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'Worked solution' })]), U.renderSteps(start.concat(r.steps))]));
    /* Argand diagram */
    const items = [], pts = [{ x: 0, y: 0, hollow: true }];
    const vec = (c, label, slot) => {
      items.push({ type: 'param', xe: '(' + c.re.toPrecision(12) + ')*t', ye: '(' + c.im.toPrecision(12) + ')*t', tmin: 0, tmax: 1, label, slot });
      pts.push({ x: c.re, y: c.im, label: zs(c), slot });
    };
    vec(z, 'z', 0); if (w) vec(w, 'w', 1);
    if (o.id !== 'abs' && o.id !== 'arg') r.res.slice(0, 12).forEach((q, i) => vec(q, r.res.length > 1 ? 'root ' + (i + 1) : 'result', 2));
    if (o.id === 'roots' || o.id === 'sqrt') {
      const rr = abs(r.res[0]); items.push({ type: 'param', xe: rr.toPrecision(12) + '*cos(t)', ye: rr.toPrecision(12) + '*sin(t)', tmin: 0, tmax: TAU, label: 'circle of radius ' + C.fmt(rr, 5), slot: 3, dash: true });
    }
    const wrap = el('div', { class: 'plot-wrap short' }, [el('canvas', { 'aria-label': 'Argand diagram' })]);
    const legend = el('div', { class: 'legend' });
    const card = el('div', { class: 'card' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'Argand diagram' })]), wrap, legend, el('p', { class: 'hint', style: 'margin-top:8px', text: 'Horizontal axis: real part. Vertical axis: imaginary part. Each arrow runs from 0 to the number.' }), el('div', { class: 'plot-bar' }, [el('span', { class: 'coords', text: 'Drag to pan, scroll to zoom' })])]);
    right.appendChild(card);
    out.appendChild(el('div', { class: 'solve-out' }, [left, right]));
    const p = new U.Plot(wrap, { coords: card.querySelector('.coords') }); p._cx = true;
    p.setData({ items, points: pts }); p.fit(); U.legend(legend, p.items);
  }

  paintOps(); run(); evalExpr();
})(globalThis.MB = globalThis.MB || {});
