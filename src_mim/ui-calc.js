/* ---------- calculator view ---------- */
(function (MB) {
  'use strict';
  if (!MB.core || !MB.ui) return;
  const U = MB.ui, C = MB.core, el = U.el, $ = U.$;
  const calc = C.calc;
  const inp = $('#expr'), lcd = $('#lcd-res');
  let second = false, fresh = false, lastAns = 0, mem = U.store.get('mem', 0), lastMain = '';
  let hist = U.store.get('hist', []);
  if (!Array.isArray(hist)) hist = [];

  const KEYS = [
    [{ l: '2nd', k: 'second', c: 'alt-toggle' }, { l: 'sin', i: 'sin(', a: { l: 'sin⁻¹', i: 'asin(' } }, { l: 'cos', i: 'cos(', a: { l: 'cos⁻¹', i: 'acos(' } }, { l: 'tan', i: 'tan(', a: { l: 'tan⁻¹', i: 'atan(' } }, { l: 'π', i: 'π', kind: 'num' }],
    [{ l: 'x²', i: '^2', kind: 'op', a: { l: 'x³', i: '^3' } }, { l: '√', i: '√(', a: { l: '∛', i: 'cbrt(' } }, { l: 'xʸ', i: '^', kind: 'op', a: { l: 'ʸ√x', i: 'root(' } }, { l: 'log', i: 'log(', a: { l: '10ˣ', i: '10^' } }, { l: 'ln', i: 'ln(', a: { l: 'eˣ', i: 'e^' } }],
    [{ l: '(', i: '(' }, { l: ')', i: ')' }, { l: 'n!', i: '!', kind: 'op' }, { l: '1/x', i: '^(-1)', kind: 'op' }, { l: 'abs', i: 'abs(' }],
    [{ l: 'nCr', i: 'nCr(' }, { l: 'nPr', i: 'nPr(' }, { l: 'mod', i: ' mod ', kind: 'op' }, { l: '%', i: '%', kind: 'op' }, { l: 'e', i: 'e', kind: 'num' }],
    [{ l: '7', i: '7', c: 'num', kind: 'num' }, { l: '8', i: '8', c: 'num', kind: 'num' }, { l: '9', i: '9', c: 'num', kind: 'num' }, { l: 'DEL', k: 'del', c: 'clr' }, { l: 'AC', k: 'ac', c: 'clr' }],
    [{ l: '4', i: '4', c: 'num', kind: 'num' }, { l: '5', i: '5', c: 'num', kind: 'num' }, { l: '6', i: '6', c: 'num', kind: 'num' }, { l: '×', i: '×', c: 'op', kind: 'op' }, { l: '÷', i: '÷', c: 'op', kind: 'op' }],
    [{ l: '1', i: '1', c: 'num', kind: 'num' }, { l: '2', i: '2', c: 'num', kind: 'num' }, { l: '3', i: '3', c: 'num', kind: 'num' }, { l: '+', i: '+', c: 'op', kind: 'op' }, { l: '−', i: '−', c: 'op', kind: 'op' }],
    [{ l: '0', i: '0', c: 'num', kind: 'num' }, { l: '.', i: '.', c: 'num', kind: 'num' }, { l: '×10ˣ', i: '×10^', kind: 'op' }, { l: 'Ans', i: 'Ans', kind: 'num' }, { l: '=', k: 'eq', c: 'eq' }]
  ];

  const keyEls = [];
  const keysBox = $('#keys');
  KEYS.forEach(row => row.forEach(k => {
    const b = el('button', { class: 'key ' + (k.c || ''), type: 'button', text: k.l, 'aria-label': k.l, onmousedown: e => e.preventDefault() });
    b.addEventListener('click', () => press(k));
    keysBox.appendChild(b); keyEls.push([b, k]);
  }));

  function paintKeys() {
    keyEls.forEach(([b, k]) => {
      const alt = second && k.a;
      b.textContent = alt ? k.a.l : k.l;
      b.setAttribute('aria-label', alt ? k.a.l : k.l);
      b.classList.toggle('alt', !!alt || (k.k === 'second' && second));
    });
    $('#ind-2nd').textContent = second ? '2ND' : '';
  }

  /* ---------- evaluate ---------- */
  function autoClose(s) {
    let d = 0; for (const ch of s) { if (ch === '(') d++; else if (ch === ')') d--; }
    return d > 0 ? s + ')'.repeat(d) : s;
  }
  function prep(text) {
    let s = C.userNorm(text).replace(/\s+/g, ' ').trim();
    s = s.replace(/(\d+(?:\.\d+)?)%(?!\s*[\d(a-zA-Z])/g, '($1/100)');
    return autoClose(s);
  }
  function evaluate(text) {
    const src = prep(text);
    if (!src) return null;
    const val = calc.evaluate(src, { ans: lastAns });
    return { val, src };
  }
  function tidy(s) { return C.pretty(s).replace(/\s*\*\s*/g, '·').replace(/\s*\/\s*/g, ' ÷ ').replace(/\s+([+\-−])\s+/g, ' $1 '); }

  function showLive() {
    lcd.classList.remove('error');
    const t = inp.value;
    if (!t.trim()) { lcd.textContent = '0'; lcd.classList.add('dim'); return; }
    try {
      const r = evaluate(t);
      if (r && r.val !== undefined && !(r.val && r.val.isResultSet)) { lcd.textContent = C.describeResult(r.src, r.val, C.angle.mode).main; lcd.classList.add('dim'); return; }
    } catch (e) { /* unfinished input stays quiet while typing */ }
    lcd.textContent = ''; lcd.classList.add('dim');
  }

  function equals() {
    const t = inp.value;
    if (!t.trim()) return;
    let r;
    try { r = evaluate(t); }
    catch (e) {
      lcd.classList.remove('dim'); lcd.classList.add('error'); lcd.textContent = C.friendlyError(e);
      $('#res-main').textContent = 'No result'; $('#res-alts').textContent = '';
      $('#calc-steps').replaceChildren(el('p', { class: 'empty', text: 'Fix the expression and press = again.' }));
      return;
    }
    if (r.val === undefined || (r.val && r.val.isResultSet)) return;
    const d = C.describeResult(r.src, r.val, C.angle.mode);
    lcd.classList.remove('dim', 'error'); lcd.textContent = d.main;
    lastMain = d.main;
    if (typeof r.val === 'number' && isFinite(r.val)) lastAns = r.val; else if (r.val && typeof r.val.re === 'number') lastAns = r.val;
    fresh = true;
    paintResult(d, r);
    hist.unshift({ e: inp.value, r: d.main }); hist = hist.slice(0, 40); U.store.set('hist', hist); paintHist();
  }

  function sci(v) { const [m, e] = v.toExponential(8).split('e'); const sup = String(parseInt(e, 10)).replace(/-/g, '⁻').replace(/\d/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]); return m.replace(/\.?0+$/, '') + ' × 10' + sup; }
  function paintResult(d, r) {
    $('#res-main').textContent = C.pretty(d.main);
    const alts = $('#res-alts'); alts.replaceChildren();
    const add = (k, v) => alts.appendChild(el('span', { class: 'alt-pill' }, [el('b', { text: k }), v]));
    if (d.fraction) add('Fraction', d.fraction);
    if (d.exact) add('Exact', C.pretty(d.exact));
    if (typeof r.val === 'number' && isFinite(r.val) && r.val !== 0 && (Math.abs(r.val) >= 1e6 || Math.abs(r.val) < 1e-3)) add('Scientific', sci(r.val));
    if (typeof r.val === 'number' && Number.isInteger(r.val) && Math.abs(r.val) < 9007199254740992) {
      const bi = BigInt(r.val), neg = bi < 0n, a = neg ? -bi : bi, sg = neg ? '-' : '';
      add('Binary', sg + a.toString(2)); add('Octal', sg + a.toString(8)); add('Hex', sg + a.toString(16).toUpperCase());
    } else if (r.val && typeof r.val.re === 'number' && typeof r.val.im === 'number' && r.val.im !== 0) {
      const mod = Math.hypot(r.val.re, r.val.im), th = Math.atan2(r.val.im, r.val.re);
      add('Modulus', C.fmt(mod, 8)); add('Argument', C.fmt(th, 8) + ' rad = ' + C.fmt(th * 180 / Math.PI, 8) + '°');
    }
    const box = $('#calc-steps'); box.replaceChildren();
    let st = null;
    try { st = C.exprSteps(r.src, calc, { ans: lastAns }); } catch (e) { st = null; }
    if (st && st.steps && st.steps.length) {
      const steps = [{ t: 'Start with', m: [tidy(st.start)], n: '' }];
      st.steps.forEach(s => steps.push({ t: s.rule, m: [tidy(s.calc)], n: '' }));
      steps.push({ t: 'Answer', m: [C.pretty(d.main)], n: '' });
      box.appendChild(U.renderSteps(steps));
      const last = box.querySelector('.step:last-child .mline'); if (last) last.classList.add('ok');
    } else {
      box.appendChild(el('p', { class: 'empty', text: 'This is a single operation or function call, so there is nothing to break down. The answer is shown above.' }));
    }
  }

  function paintHist() {
    const ul = $('#history'); ul.replaceChildren();
    if (!hist.length) { ul.appendChild(el('li', { class: 'empty', text: 'Your calculations will appear here.' })); return; }
    hist.forEach(h => {
      const b = el('button', { type: 'button', title: 'Use this expression again' }, [el('span', { class: 'e', text: h.e }), el('span', { class: 'r', text: '= ' + h.r })]);
      b.addEventListener('click', () => { inp.value = h.e; fresh = false; showLive(); inp.focus(); });
      ul.appendChild(el('li', null, [b]));
    });
  }

  /* ---------- key handling ---------- */
  function press(k) {
    if (k.k === 'second') { second = !second; paintKeys(); return; }
    if (k.k === 'ac') { inp.value = ''; fresh = false; showLive(); $('#res-main').textContent = 'Enter an expression'; $('#res-alts').replaceChildren(); $('#calc-steps').replaceChildren(el('p', { class: 'empty', text: 'Press = to see the working, one operation at a time.' })); return; }
    if (k.k === 'del') {
      if (fresh) { inp.value = ''; fresh = false; } else {
        const s = inp.selectionStart == null ? inp.value.length : inp.selectionStart, e = inp.selectionEnd == null ? s : inp.selectionEnd;
        if (e > s) inp.value = inp.value.slice(0, s) + inp.value.slice(e);
        else if (s > 0) { const m = /(?:asin|acos|atan|sin|cos|tan|sqrt|cbrt|root|log|ln|abs|nCr|nPr|Ans|mod)\($|Ans$| mod $/.exec(inp.value.slice(0, s)); const cut = m ? m[0].length : 1; inp.value = inp.value.slice(0, s - cut) + inp.value.slice(s); try { inp.setSelectionRange(s - cut, s - cut); } catch (x) { /* ignore */ } }
      }
      showLive(); return;
    }
    if (k.k === 'eq') { equals(); return; }
    const use = second && k.a ? k.a : k;
    if (second) { second = false; paintKeys(); }
    if (fresh) {
      const op = k.kind === 'op';
      inp.value = op ? 'Ans' : '';
      fresh = false;
      try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (x) { /* ignore */ }
    }
    U.insertAt(inp, use.i);
  }

  inp.addEventListener('input', () => { fresh = false; showLive(); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); equals(); }
    else if (e.key === 'Escape') { inp.value = ''; showLive(); }
  });
  inp.addEventListener('focus', () => { inp.setAttribute('inputmode', 'text'); });
  inp.addEventListener('blur', () => { inp.setAttribute('inputmode', 'none'); });

  /* ---------- modes and memory ---------- */
  const angBtn = $('#m-angle');
  function paintAngle() {
    const deg = C.angle.mode === 'deg';
    angBtn.textContent = deg ? 'DEG' : 'RAD'; angBtn.setAttribute('aria-pressed', deg ? 'false' : 'true');
    $('#ind-angle').textContent = deg ? 'DEG' : 'RAD';
  }
  angBtn.addEventListener('click', () => { C.angle.mode = C.angle.mode === 'deg' ? 'rad' : 'deg'; U.store.set('angle', C.angle.mode); paintAngle(); showLive(); });
  C.angle.mode = U.store.get('angle', 'deg') === 'rad' ? 'rad' : 'deg';
  function paintMem() { $('#ind-mem').textContent = mem !== 0 ? 'M' : ''; }
  function currentValue() {
    try { const r = evaluate(inp.value); if (r && typeof r.val === 'number') return r.val; } catch (e) { /* fall through */ }
    return typeof lastAns === 'number' ? lastAns : 0;
  }
  U.$$('[data-mem]').forEach(b => b.addEventListener('click', () => {
    const m = b.dataset.mem;
    if (m === 'plus') { mem += currentValue(); U.toast('Added to memory'); }
    else if (m === 'minus') { mem -= currentValue(); U.toast('Subtracted from memory'); }
    else if (m === 'clear') { mem = 0; U.toast('Memory cleared'); }
    else if (m === 'recall') {
      if (fresh) { inp.value = ''; fresh = false; }
      U.insertAt(inp, mem < 0 ? '(' + C.fmt(mem) + ')' : C.fmt(mem));
    }
    U.store.set('mem', mem); paintMem();
  }));

  $('#copy-res').addEventListener('click', () => { if (lastMain) U.copy(lastMain, 'Result copied'); else U.toast('Nothing to copy yet'); });
  $('#clear-hist').addEventListener('click', () => { hist = []; U.store.set('hist', hist); paintHist(); });

  paintKeys(); paintAngle(); paintMem(); paintHist();
  U.calcRun = expr => { inp.value = expr; fresh = false; showLive(); equals(); };
  U.calcFocus = () => { try { inp.focus({ preventScroll: true }); } catch (e) { /* ignore */ } };
})(globalThis.MB = globalThis.MB || {});
