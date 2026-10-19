/* ---------- start-up ---------- */
(function (MB) {
  'use strict';
  const U = MB.ui; if (!U) return;
  const h = location.hash.replace('#', '');
  const t = ['calc', 'solve', 'graph', 'charts', 'complex', 'bases', 'convert', 'tools'].indexOf(h) >= 0 ? h : U.store.get('tab', 'calc');
  U.showTab(t, true);
  if (t === 'calc' && window.matchMedia && !window.matchMedia('(pointer: coarse)').matches && U.calcFocus) U.calcFocus();
})(globalThis.MB = globalThis.MB || {});
