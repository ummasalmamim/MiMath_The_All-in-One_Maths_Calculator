/* ---------- shared UI helpers ---------- */
(function (MB) {
  'use strict';
  const U = MB.ui = {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  U.$ = $; U.$$ = $$;
  U.el = function (tag, attrs, kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(c => { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  };
  const el = U.el;
  U.store = {
    get(k, d) { try { const v = localStorage.getItem('mb.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('mb.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  let toastTimer;
  U.toast = function (msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 1600);
  };
  U.copy = async function (text, okMsg) {
    try { await navigator.clipboard.writeText(text); U.toast(okMsg || 'Copied'); }
    catch (e) {
      const ta = el('textarea', { 'aria-hidden': 'true', style: 'position:fixed;left:-9999px' }); ta.value = text; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { /* ignore */ }
      ta.remove(); U.toast(ok ? (okMsg || 'Copied') : 'Copy is blocked here. Select the text and copy it.');
    }
  };
  U.cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  U.series = i => U.cssVar('--s' + ((i % 8) + 1));

  /* ---------- theme ---------- */
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
  }
  U.isDark = () => {
    const t = document.documentElement.getAttribute('data-theme');
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  };
  U.themeChanged = () => document.dispatchEvent(new CustomEvent('mb:theme'));
  applyTheme(U.store.get('theme', null));
  $('#theme-btn').addEventListener('click', () => {
    const next = U.isDark() ? 'light' : 'dark';
    applyTheme(next); U.store.set('theme', next); U.themeChanged();
  });
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => U.themeChanged()); } catch (e) { /* old browser */ }

  /* ---------- tabs ---------- */
  const TABS = ['calc', 'solve', 'graph', 'charts', 'complex', 'bases', 'convert', 'tools'];
  U.showTab = function (name, noHash) {
    if (TABS.indexOf(name) < 0) name = 'calc';
    TABS.forEach(t => {
      const on = t === name;
      $('#v-' + t).hidden = !on;
      const b = $('#tab-' + t); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
    });
    if (!noHash) { try { history.replaceState(null, '', '#' + name); } catch (e) { /* sandboxed */ } }
    U.store.set('tab', name);
    document.dispatchEvent(new CustomEvent('mb:show', { detail: name }));
  };
  $$('.tab').forEach(b => {
    b.addEventListener('click', () => U.showTab(b.dataset.tab));
    b.addEventListener('keydown', e => {
      const i = TABS.indexOf(b.dataset.tab);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
        U.showTab(n); $('#tab-' + n).focus(); e.preventDefault();
      }
    });
  });
  window.addEventListener('hashchange', () => { const h = location.hash.replace('#', ''); if (TABS.indexOf(h) >= 0) U.showTab(h, true); });

  /* ---------- library check ---------- */
  U.libsOk = typeof math !== 'undefined' && typeof nerdamer !== 'undefined';
  U.chartOk = typeof Chart !== 'undefined';
  if (!U.libsOk || !U.chartOk) $('#lib-banner').hidden = false;

  /* ---------- symbol bars ---------- */
  let lastInput = null;
  document.addEventListener('focusin', e => {
    const t = e.target;
    if (t && (t.matches('.in') || t.matches('.lcd-expr'))) lastInput = t;
  });
  const SYMS = {
    solve: [['x²', '^2'], ['xⁿ', '^'], ['√', 'sqrt('], ['π', 'pi'], ['e', 'e'], ['sin', 'sin('], ['cos', 'cos('], ['tan', 'tan('], ['ln', 'ln('], ['log', 'log('], ['|x|', 'abs('], ['(', '('], [')', ')'], ['≤', '<='], ['≥', '>='], ['∞', 'Infinity']],
    graph: [['x²', '^2'], ['xⁿ', '^'], ['√', 'sqrt('], ['π', 'pi'], ['e', 'e'], ['sin', 'sin('], ['cos', 'cos('], ['tan', 'tan('], ['ln', 'ln('], ['log', 'log('], ['|x|', 'abs('], ['θ', 'theta'], ['t', 't']],
    calc: [['i', 'i'], ['0b', '0b'], ['0x', '0x'], ['sinh', 'sinh('], ['cosh', 'cosh('], ['tanh', 'tanh('], ['exp', 'exp('], ['floor', 'floor('], ['ceil', 'ceil('], ['round', 'round('], ['gcd', 'gcd('], ['lcm', 'lcm('], ['gamma', 'gamma('], ['re', 're('], ['im', 'im('], ['conj', 'conj('], ['arg', 'arg('], ['rand', 'random()'], ['logb', 'logb(']],
    chart: [['x²', '^2'], ['√', 'sqrt('], ['π', 'pi'], ['sin', 'sin('], ['cos', 'cos('], ['ln', 'ln('], ['e^x', 'e^x']]
  };
  $$('[data-sym]').forEach(bar => {
    (SYMS[bar.dataset.sym] || []).forEach(([label, ins]) => {
      bar.appendChild(el('button', { class: 'chip mono', type: 'button', text: label, 'aria-label': 'Insert ' + label, onmousedown: e => e.preventDefault(), onclick: () => U.insertAt(lastInput, ins) }));
    });
  });
  U.insertAt = function (inp, text) {
    if (!inp || !document.body.contains(inp)) { U.toast('Tap a text box first'); return; }
    inp.focus();
    const s = inp.selectionStart == null ? inp.value.length : inp.selectionStart, e = inp.selectionEnd == null ? s : inp.selectionEnd;
    inp.value = inp.value.slice(0, s) + text + inp.value.slice(e);
    const p = s + text.length; try { inp.setSelectionRange(p, p); } catch (x) { /* ignore */ }
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  };

  /* ---------- steps and answers ---------- */
  function matrixEl(m) {
    const rows = m.matrix, cols = rows[0] ? rows[0].length : 0;
    let split = m.split != null ? m.split : (m.aug ? cols - 1 : null);
    const t = el('table', { class: 'mat' });
    if (m.aug && m.vars && m.vars.length === cols - 1) {
      const hr = el('tr'); m.vars.concat(['=']).forEach((v, j) => hr.appendChild(el('td', { text: v, class: j === split ? 'split' : '', style: 'color:var(--ink-3);font-size:12px' })));
      t.appendChild(hr);
    }
    rows.forEach(r => {
      const tr = el('tr'); r.forEach((c, j) => tr.appendChild(el('td', { text: c, class: split != null && j === split ? 'split' : '' }))); t.appendChild(tr);
    });
    const w = el('div', { class: 'mat-wrap' });
    if (m.label) w.appendChild(el('span', { class: 'mat-label', text: m.label + ' =' }));
    w.appendChild(t); return w;
  }
  U.renderSteps = function (steps) {
    const ol = el('ol', { class: 'steps' });
    steps.forEach(s => {
      const li = el('li', { class: 'step' });
      li.appendChild(el('h4', { text: s.t }));
      (s.m || []).forEach(line => {
        if (line && typeof line === 'object' && line.matrix) li.appendChild(matrixEl(line));
        else li.appendChild(el('div', { class: 'mline', text: String(line) }));
      });
      if (s.n) li.appendChild(el('p', { class: 'snote', text: s.n }));
      ol.appendChild(li);
    });
    return ol;
  };
  U.renderAnswers = function (res) {
    const card = el('div', { class: 'card ans-card' });
    card.appendChild(el('div', { class: 'card-h' }, [el('h3', { text: 'Answer' })]));
    if (res.headline) card.appendChild(el('div', { class: 'big', text: res.headline }));
    const list = el('div', { class: 'ans-list' });
    (res.answers || []).forEach(a => {
      const row = el('div', { class: 'ans-row' });
      if (a.lhs) row.appendChild(el('span', { class: 'lhs', text: a.lhs + (a.matrix || a.exact ? ' =' : '') }));
      if (a.matrix) row.appendChild(matrixEl({ matrix: a.matrix }));
      else if (a.exact) row.appendChild(el('span', { class: 'ex', text: a.exact }));
      if (a.approx) row.appendChild(el('span', { class: 'ap', text: /^\s*[-+−]?[\d.]+(e[-+]?\d+)?\s*$/i.test(a.approx) ? '≈ ' + a.approx : a.approx }));
      if (a.note) row.appendChild(el('span', { class: 'nt', text: a.note }));
      list.appendChild(row);
    });
    if ((res.answers || []).length) card.appendChild(list);
    return card;
  };
})(globalThis.MB = globalThis.MB || {});
