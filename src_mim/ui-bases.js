/* ---------- number systems, bitwise operations, text and floating point ---------- */
(function (MB) {
  'use strict';
  if (!MB.ui) return;
  const U = MB.ui, el = U.el, root = U.$('#v-bases');
  if (!root) return;
  const DIG = '0123456789abcdefghijklmnopqrstuvwxyz';
  const SUB = '₀₁₂₃₄₅₆₇₈₉', SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sub = n => String(n).replace(/\d/g, d => SUB[d]), sup = n => String(n).replace(/\d/g, d => SUP[d]);
  const S = (t, m, n) => ({ t, m: [].concat(m || []), n: n || '' });

  function parseBig(str, base) {
    let s = String(str).trim().replace(/[\s_,]/g, '').toLowerCase(), neg = false;
    if (!s) throw new Error('Type a number first.');
    if (s[0] === '-') { neg = true; s = s.slice(1); } else if (s[0] === '+') s = s.slice(1);
    const pre = /^0([xbo])/.exec(s);
    if (pre && ((pre[1] === 'x' && base === 16) || (pre[1] === 'b' && base === 2) || (pre[1] === 'o' && base === 8))) s = s.slice(2);
    if (!s) throw new Error('Type the digits after the prefix.');
    let v = 0n; const B = BigInt(base);
    for (const ch of s) {
      const d = DIG.indexOf(ch);
      if (d < 0 || d >= base) throw new Error('"' + ch.toUpperCase() + '" is not a digit in base ' + base + '. Digits allowed here: ' + DIG.slice(0, base).toUpperCase().split('').join(' ') + '.');
      v = v * B + BigInt(d);
    }
    return neg ? -v : v;
  }
  const abs = v => v < 0n ? -v : v;
  const toB = (v, b) => (v < 0n ? '-' : '') + abs(v).toString(b).toUpperCase();
  function group(s, n) { const neg = s[0] === '-'; if (neg) s = s.slice(1); let o = ''; for (let i = s.length; i > 0; i -= n) o = s.slice(Math.max(0, i - n), i) + (o ? ' ' + o : ''); return (neg ? '-' : '') + o; }
  const padBin = (v, bits) => v.toString(2).padStart(bits, '0');

  /* ---------- shared bits of UI ---------- */
  function copyBtn(text) { return el('button', { class: 'btn small ghost', type: 'button', text: 'Copy', onclick: () => U.copy(text.replace(/ /g, ''), 'Copied') }); }
  function rowEl(name, value, raw) { return el('div', { class: 'base-row' }, [el('span', { class: 'bn', text: name }), el('span', { class: 'bv', text: value }), copyBtn(raw == null ? value : raw)]); }
  function errCard(msg) { return el('div', { class: 'card err-card' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'Check the input' })]), el('p', { text: msg })]); }
  function sel(id, opts, def) { const s = el('select', { class: 'in', id }, opts.map(o => el('option', { value: o[0], text: o[1] }))); s.value = def; return s; }
  function field(label, input, cls) { return el('div', { class: 'field ' + (cls || '') }, [el('label', { for: input.id, text: label }), input]); }
  const textIn = (id, v, ph) => el('input', { class: 'in', id, value: v, placeholder: ph || '', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off' });

  /* =========================================================
     1. Number systems
     ========================================================= */
  const nIn = textIn('bs-in', '202'), baseSel = sel('bs-base', [['10', 'Decimal (10)'], ['2', 'Binary (2)'], ['8', 'Octal (8)'], ['16', 'Hexadecimal (16)'], ['x', 'Other base…']], '10');
  const customIn = textIn('bs-custom', '5'); customIn.setAttribute('inputmode', 'numeric');
  const customF = field('Base (2 to 36)', customIn); customF.hidden = true;
  const bitsSel = sel('bs-bits', [['8', '8 bits'], ['16', '16 bits'], ['32', '32 bits'], ['64', '64 bits']], '8');
  const signedBox = el('input', { type: 'checkbox', id: 'bs-signed' });
  const targetIn = textIn('bs-target', '32'); targetIn.setAttribute('inputmode', 'numeric');
  const out1 = el('div', { 'aria-live': 'polite', class: 'stack' });
  let curVal = 202n;

  function curBase() { return baseSel.value === 'x' ? parseInt(customIn.value, 10) : parseInt(baseSel.value, 10); }
  function fracToBase(x, b, digits) {
    let ip = Math.floor(x), fp = x - ip, s = ip.toString(b).toUpperCase() + '.', lines = [], n = 0;
    while (fp > 1e-12 && n < digits) { const m = fp * b; const d = Math.floor(m + 1e-12); lines.push(fp.toPrecision(10).replace(/\.?0+$/, '') + ' × ' + b + ' = ' + (m).toPrecision(10).replace(/\.?0+$/, '') + '  →  digit ' + d.toString(b).toUpperCase()); s += d.toString(b).toUpperCase(); fp = m - d; n++; }
    return { s: s.replace(/\.$/, ''), lines, exact: fp <= 1e-12 };
  }

  function render1() {
    out1.replaceChildren();
    customF.hidden = baseSel.value !== 'x';
    const base = curBase(), bits = parseInt(bitsSel.value, 10), signed = signedBox.checked;
    if (!Number.isInteger(base) || base < 2 || base > 36) { out1.appendChild(errCard('Choose a base between 2 and 36.')); return; }
    const txt = nIn.value.trim();
    /* decimal fractions */
    if (base === 10 && /^-?\d*\.\d+$/.test(txt.replace(/\s/g, ''))) {
      const x = parseFloat(txt);
      const card = el('div', { class: 'card' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'Decimal fraction ' + txt })]), el('div', { class: 'base-rows' })]);
      const rows = card.querySelector('.base-rows'), steps = [];
      [[2, 'Binary'], [8, 'Octal'], [16, 'Hexadecimal']].forEach(([b, name]) => {
        const r = fracToBase(Math.abs(x), b, 24); rows.appendChild(rowEl(name, (x < 0 ? '-' : '') + r.s + (r.exact ? '' : ' …'), (x < 0 ? '-' : '') + r.s));
        steps.push(S('To base ' + b + ': whole part by division, fraction by repeated multiplication', ['Whole part ' + Math.floor(Math.abs(x)) + ' → ' + Math.floor(Math.abs(x)).toString(b).toUpperCase()].concat(r.lines.slice(0, 14)), r.exact ? 'The fraction ends, so this is exact.' : 'The fraction does not end. It is cut after 24 digits.'));
      });
      out1.appendChild(card);
      out1.appendChild(el('div', { class: 'card' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'Working' })]), U.renderSteps(steps)]));
      return;
    }
    let v;
    try { v = parseBig(txt, base); } catch (e) { out1.appendChild(errCard(e.message)); return; }
    curVal = v;
    const mask = (1n << BigInt(bits)) - 1n, pat = BigInt.asUintN(bits, v);
    const lo = signed ? -(1n << BigInt(bits - 1)) : 0n, hi = signed ? (1n << BigInt(bits - 1)) - 1n : mask, fits = v >= lo && v <= hi;
    const card = el('div', { class: 'card' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'The same number in other systems' })]), el('div', { class: 'base-rows' })]);
    const rows = card.querySelector('.base-rows');
    rows.appendChild(rowEl('Binary', group(toB(v, 2), 4), toB(v, 2)));
    rows.appendChild(rowEl('Octal', group(toB(v, 8), 3), toB(v, 8)));
    rows.appendChild(rowEl('Decimal', abs(v) > 99999n ? group(toB(v, 10), 3) : toB(v, 10), toB(v, 10)));
    rows.appendChild(rowEl('Hexadecimal', group(toB(v, 16), 4), toB(v, 16)));
    const tb = parseInt(targetIn.value, 10);
    if (Number.isInteger(tb) && tb >= 2 && tb <= 36) rows.appendChild(rowEl('Base ' + tb, toB(v, tb), toB(v, tb)));
    rows.appendChild(el('div', { class: 'group-h', text: bits + '-bit view' + (signed ? ' (two’s complement)' : ' (unsigned)') }));
    if (!fits) rows.appendChild(el('p', { class: 'snote', style: 'color:var(--bad)', text: toB(v, 10) + ' does not fit in ' + bits + ' bits as a ' + (signed ? 'signed' : 'unsigned') + ' number (range ' + lo + ' to ' + hi + '). The pattern below is what is left after wrapping.' }));
    rows.appendChild(rowEl('Bit pattern', group(padBin(pat, bits), 4), padBin(pat, bits)));
    rows.appendChild(rowEl('Hex pattern', '0x' + pat.toString(16).toUpperCase().padStart(bits / 4, '0'), pat.toString(16).toUpperCase().padStart(bits / 4, '0')));
    rows.appendChild(rowEl('Unsigned value', pat.toString(10)));
    rows.appendChild(rowEl('Signed value', BigInt.asIntN(bits, pat).toString(10)));
    rows.appendChild(rowEl('One’s complement', group(padBin(pat ^ mask, bits), 4), padBin(pat ^ mask, bits)));
    rows.appendChild(rowEl('Gray code', group(padBin(pat ^ (pat >> 1n), bits), 4), padBin(pat ^ (pat >> 1n), bits)));
    if (v >= 0n && v < 10n ** 20n) rows.appendChild(rowEl('BCD', toB(v, 10).split('').map(d => padBin(BigInt(d), 4)).join(' '), toB(v, 10).split('').map(d => padBin(BigInt(d), 4)).join('')));
    if (pat >= 32n && pat <= 126n) rows.appendChild(rowEl('ASCII character', String.fromCharCode(Number(pat))));
    out1.appendChild(card);

    /* bit grid */
    const grid = el('div', { class: 'bitgrid', role: 'group', 'aria-label': 'Bits. Tap a bit to flip it.' });
    for (let i = bits - 1; i >= 0; i--) {
      const on = ((pat >> BigInt(i)) & 1n) === 1n;
      grid.appendChild(el('button', { class: 'bit', type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': 'Bit ' + i + ' is ' + (on ? 1 : 0), onclick: () => {
        const np = pat ^ (1n << BigInt(i)), nv = signed ? BigInt.asIntN(bits, np) : np;
        if (base === 10 && /\./.test(nIn.value)) baseSel.value = '10';
        nIn.value = toB(nv, base).toLowerCase(); render1();
      } }, [el('span', { text: on ? '1' : '0' }), el('small', { text: String(i) })]));
    }
    out1.appendChild(el('div', { class: 'card' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'Bits' }), el('span', { class: 'hint', text: 'Tap a bit to flip it' })]), grid]));

    /* working */
    const steps = [], a = abs(v), sg = v < 0n ? '-' : '';
    if (base !== 10) {
      const digs = toB(a, base).length, s = a === 0n ? '0' : txt.replace(/[\s_,]/g, '').replace(/^[-+]/, '').replace(/^0[xbo]/i, '').toUpperCase();
      const terms = s.split('').map((ch, i) => { const d = DIG.indexOf(ch.toLowerCase()), p = s.length - 1 - i; return { d, p }; });
      const show = terms.length > 10 ? terms.slice(0, 10) : terms;
      const t1 = show.map(t => t.d + ' × ' + base + sup(t.p)).join(' + ') + (terms.length > 10 ? ' + …' : '');
      const t2 = show.map(t => (BigInt(t.d) * BigInt(base) ** BigInt(t.p)).toString()).join(' + ') + (terms.length > 10 ? ' + …' : '');
      steps.push(S('Base ' + base + ' to decimal: multiply each digit by a power of ' + base, [s + sub(base) + '  (' + digs + ' digits)', t1, t2, '= ' + sg + a.toString(10)], 'The rightmost digit has power 0. Letters stand for 10, 11, 12 and so on (A = 10, B = 11 …).'));
    }
    if (a > 0n && a < 2n ** 64n) {
      [[2, 'binary'], [8, 'octal'], [16, 'hexadecimal']].forEach(([b, name]) => {
        if (b === base && base !== 10) return;
        const lines = []; let q = a, digitsOut = [];
        while (q > 0n && lines.length < 70) { const r = q % BigInt(b), nq = q / BigInt(b); lines.push(q + ' ÷ ' + b + ' = ' + nq + '  remainder ' + r.toString(b).toUpperCase() + (r > 9n ? ' (' + r + ')' : '')); digitsOut.push(r.toString(b).toUpperCase()); q = nq; }
        steps.push(S('Decimal to ' + name + ': divide by ' + b + ' and keep the remainders', lines.concat(['Read the remainders from bottom to top:', '= ' + sg + digitsOut.reverse().join('') + sub(b)]), b === 2 ? 'Each division by 2 peels off one bit, starting from the rightmost bit.' : ''));
      });
      const bn = a.toString(2), g4 = group(bn, 4).split(' ');
      steps.push(S('Shortcut: binary ↔ hex by grouping', [group(bn, 4), g4.map(g => parseInt(g, 2).toString(16).toUpperCase()).join('    ')], 'Four bits make one hex digit and three bits make one octal digit, so no division is needed.'));
    }
    if (signed && v < 0n) {
      steps.push(S('Negative numbers: two’s complement in ' + bits + ' bits', ['Write |n| in binary: ' + group(padBin(abs(v) & mask, bits), 4), 'Flip every bit: ' + group(padBin(~abs(v) & mask, bits), 4), 'Add 1: ' + group(padBin(pat, bits), 4)], 'The leftmost bit is the sign bit. 1 means negative.'));
    }
    if (steps.length) out1.appendChild(el('div', { class: 'card' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'Working' })]), U.renderSteps(steps)]));
  }
  [nIn, customIn, targetIn].forEach(i => i.addEventListener('input', render1));
  [baseSel, bitsSel, signedBox].forEach(i => i.addEventListener('change', () => { if (i === baseSel) { try { /* keep value when the base changes */ const b = curBase(); if (Number.isInteger(b) && b >= 2 && b <= 36) nIn.value = toB(curVal, b).toLowerCase(); } catch (e) { /* ignore */ } } render1(); }));
  const exs1 = el('div', { class: 'chips' });
  [['202', '10'], ['11111111', '2'], ['FF', '16'], ['755', '8'], ['-42', '10'], ['0.625', '10'], ['101101', '2']].forEach(([v, b]) => exs1.appendChild(el('button', { class: 'chip mono', type: 'button', text: v + ' (base ' + b + ')', onclick: () => { baseSel.value = b; nIn.value = v; if (v[0] === '-') signedBox.checked = true; render1(); } })));

  root.appendChild(el('div', { class: 'stack' }, [
    el('div', { class: 'card solve-input' }, [
      el('div', { class: 'card-h' }, [el('h3', { text: 'Number systems' }), el('span', { class: 'hint', text: 'Binary, octal, decimal, hex and any base to 36' })]),
      el('div', { class: 'fields' }, [field('Number', nIn), field('Number is written in', baseSel), customF, field('Word size', bitsSel), field('Also show in base', targetIn)]),
      el('label', { style: 'display:flex;gap:8px;align-items:center;cursor:pointer' }, [signedBox, 'Signed numbers (two’s complement)']),
      el('div', null, [el('div', { class: 'eyebrow', style: 'margin-bottom:6px', text: 'Try an example' }), exs1])
    ]),
    out1
  ]));

  /* =========================================================
     2. Arithmetic and bitwise operations
     ========================================================= */
  const aIn = textIn('bo-a', '202'), bIn = textIn('bo-b', '58');
  const opSel = sel('bo-op', [['and', 'AND'], ['or', 'OR'], ['xor', 'XOR'], ['nand', 'NAND'], ['nor', 'NOR'], ['xnor', 'XNOR'], ['not', 'NOT A'], ['shl', 'Shift A left by B'], ['shr', 'Shift A right by B'], ['rol', 'Rotate A left by B'], ['ror', 'Rotate A right by B'], ['add', 'A + B'], ['sub', 'A − B'], ['mul', 'A × B'], ['div', 'A ÷ B (whole number)'], ['mod', 'A mod B'], ['pow', 'A to the power B']], 'and');
  const out2 = el('div', { 'aria-live': 'polite' });
  function run2() {
    out2.replaceChildren();
    const base = curBase(), bits = parseInt(bitsSel.value, 10), signed = signedBox.checked;
    if (!Number.isInteger(base) || base < 2 || base > 36) { out2.appendChild(errCard('Choose a valid base above.')); return; }
    let A, B = 0n; const op = opSel.value;
    try { A = parseBig(aIn.value, base); if (op !== 'not') B = parseBig(bIn.value, base); } catch (e) { out2.appendChild(errCard(e.message)); return; }
    const mask = (1n << BigInt(bits)) - 1n, pa = BigInt.asUintN(bits, A), pb = BigInt.asUintN(bits, B);
    const interp = p => signed ? BigInt.asIntN(bits, p) : p;
    const lines = [], rows = [];
    const bitwise = ['and', 'or', 'xor', 'nand', 'nor', 'xnor', 'not', 'shl', 'shr', 'rol', 'ror'].indexOf(op) >= 0;
    try {
      if (bitwise) {
        let r, sym, n = Number(pb % BigInt(bits)), bn = Number(B < 0n ? 0n : (B > 9999n ? 9999n : B));
        if (op === 'and') { r = pa & pb; sym = 'AND'; } else if (op === 'or') { r = pa | pb; sym = 'OR'; } else if (op === 'xor') { r = pa ^ pb; sym = 'XOR'; }
        else if (op === 'nand') { r = ~(pa & pb) & mask; sym = 'NAND'; } else if (op === 'nor') { r = ~(pa | pb) & mask; sym = 'NOR'; } else if (op === 'xnor') { r = ~(pa ^ pb) & mask; sym = 'XNOR'; }
        else if (op === 'not') { r = ~pa & mask; sym = 'NOT'; }
        else if (op === 'shl') { r = (pa << BigInt(bn)) & mask; sym = '<<'; }
        else if (op === 'shr') { r = signed ? BigInt.asUintN(bits, BigInt.asIntN(bits, pa) >> BigInt(bn)) : (pa >> BigInt(bn)); sym = '>>'; }
        else if (op === 'rol') { r = ((pa << BigInt(n)) | (pa >> BigInt(bits - n))) & mask; sym = 'ROL'; }
        else { r = ((pa >> BigInt(n)) | (pa << BigInt(bits - n))) & mask; sym = 'ROR'; }
        const w = x => group(padBin(x, bits), 4);
        if (op === 'not') { lines.push('A      = ' + w(pa), 'NOT A  = ' + w(r)); }
        else if (['shl', 'shr', 'rol', 'ror'].indexOf(op) >= 0) { lines.push('A      = ' + w(pa), 'A ' + sym + ' ' + (op.length === 3 && op[0] === 'r' ? n : bn) + ' = ' + w(r)); }
        else { lines.push('A      = ' + w(pa), 'B      = ' + w(pb), '-'.repeat(8 + w(pa).length), 'A ' + sym.padEnd(4) + ' = ' + w(r)); }
        const val = interp(r);
        rows.push(rowEl('Binary', w(r), padBin(r, bits)), rowEl('Hex', '0x' + r.toString(16).toUpperCase().padStart(bits / 4, '0'), r.toString(16).toUpperCase()), rowEl('Decimal', val.toString(), val.toString()), rowEl('In base ' + base, toB(val, base), toB(val, base)));
        const note = { and: 'Each result bit is 1 only when both bits are 1.', or: 'Each result bit is 1 when at least one bit is 1.', xor: 'Each result bit is 1 when the two bits differ.', nand: 'NAND is NOT (A AND B).', nor: 'NOR is NOT (A OR B).', xnor: 'XNOR is 1 when the two bits are equal.', not: 'Every bit is flipped.', shl: 'Shifting left by n multiplies by 2ⁿ (bits that fall off the left are lost).', shr: signed ? 'Arithmetic shift: the sign bit is copied in on the left, so it divides by 2ⁿ and rounds down.' : 'Logical shift: zeros come in on the left, so it divides by 2ⁿ and rounds down.', rol: 'Bits that fall off the left come back in on the right.', ror: 'Bits that fall off the right come back in on the left.' }[op];
        out2.appendChild(el('div', { class: 'card' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'Result' })]), el('div', { class: 'base-rows' }, rows), el('div', { class: 'mline', style: 'margin-top:10px', text: lines.join('\n') }), el('p', { class: 'snote', text: note + ' Shown in ' + bits + ' bits.' })]));
      } else {
        let r, q = null, desc;
        if (op === 'add') { r = A + B; desc = 'A + B'; } else if (op === 'sub') { r = A - B; desc = 'A − B'; } else if (op === 'mul') { r = A * B; desc = 'A × B'; }
        else if (op === 'div') { if (B === 0n) throw new Error('Division by zero.'); r = A / B; q = A % B; desc = 'A ÷ B'; }
        else if (op === 'mod') { if (B === 0n) throw new Error('Division by zero.'); r = ((A % B) + B) % B; desc = 'A mod B'; }
        else { if (B < 0n) throw new Error('Use a power that is 0 or more.'); if (B > 4000n) throw new Error('That power is too large. Try B up to 4000.'); r = A ** B; desc = 'A ^ B'; }
        rows.push(rowEl('Decimal', r.toString(), r.toString()), rowEl('In base ' + base, group(toB(r, base), base === 2 ? 4 : base === 16 ? 4 : 3), toB(r, base)), rowEl('Binary', group(toB(r, 2), 4), toB(r, 2)), rowEl('Hexadecimal', group(toB(r, 16), 4), toB(r, 16)));
        if (q !== null) rows.push(rowEl('Remainder', q.toString()));
        const fit = r >= (signed ? -(1n << BigInt(bits - 1)) : 0n) && r <= (signed ? (1n << BigInt(bits - 1)) - 1n : mask);
        out2.appendChild(el('div', { class: 'card' }, [el('div', { class: 'card-h' }, [el('h3', { text: desc + ' = ' + (r.toString().length > 40 ? r.toString().slice(0, 40) + '…' : r.toString()) })]), el('div', { class: 'base-rows' }, rows), el('p', { class: 'snote', text: 'Calculated exactly with no size limit. ' + (fit ? 'It fits in ' + bits + ' bits.' : 'It would overflow ' + bits + ' bits.') })]));
      }
    } catch (e) { out2.replaceChildren(errCard(e.message)); }
  }
  [aIn, bIn].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run2(); } }));
  root.appendChild(el('div', { class: 'stack', style: 'margin-top:14px' }, [
    el('div', { class: 'card solve-input' }, [
      el('div', { class: 'card-h' }, [el('h3', { text: 'Arithmetic and bitwise operations' }), el('span', { class: 'hint', text: 'Uses the base and word size chosen above' })]),
      el('div', { class: 'fields' }, [field('A', aIn), field('B', bIn), field('Operation', opSel)]),
      el('div', { class: 'act-row' }, [el('button', { class: 'btn primary', type: 'button', text: 'Calculate', onclick: run2 })])
    ]), out2
  ]));

  /* =========================================================
     3. Text and bytes
     ========================================================= */
  const txtIn = el('textarea', { class: 'in', id: 'tx-in', rows: 2, spellcheck: 'false' }); txtIn.value = 'Hi 👋';
  const out3 = el('div', { class: 'base-rows' });
  const codeIn = el('textarea', { class: 'in', id: 'tx-code', rows: 2, spellcheck: 'false' }); codeIn.value = '48 69 20 F0 9F 91 8B';
  const fmtSel = sel('tx-fmt', [['16', 'Hex'], ['2', 'Binary'], ['10', 'Decimal']], '16');
  const out3b = el('div', { class: 'base-rows' });
  function run3() {
    out3.replaceChildren();
    const bytes = Array.from(new TextEncoder().encode(txtIn.value));
    if (!bytes.length) return;
    out3.appendChild(rowEl('Hex', bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')));
    out3.appendChild(rowEl('Binary', bytes.map(b => padBin(BigInt(b), 8)).join(' ')));
    out3.appendChild(rowEl('Decimal', bytes.join(' ')));
    out3.appendChild(rowEl('Unicode', Array.from(txtIn.value).map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ')));
    try { out3.appendChild(rowEl('Base64', btoa(String.fromCharCode.apply(null, bytes)))); } catch (e) { /* too long */ }
  }
  function run3b() {
    out3b.replaceChildren();
    const base = parseInt(fmtSel.value, 10);
    const parts = codeIn.value.trim().split(/[\s,]+/).filter(Boolean);
    if (!parts.length) return;
    try {
      const bytes = parts.map(p => { const v = parseBig(p, base); if (v < 0n || v > 255n) throw new Error('"' + p + '" is not a byte (0 to 255).'); return Number(v); });
      out3b.appendChild(rowEl('Text', new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes))));
    } catch (e) { out3b.appendChild(el('p', { class: 'snote', style: 'color:var(--bad)', text: e.message })); }
  }
  txtIn.addEventListener('input', run3); codeIn.addEventListener('input', run3b); fmtSel.addEventListener('change', run3b);
  root.appendChild(el('div', { class: 'card solve-input', style: 'margin-top:14px' }, [
    el('div', { class: 'card-h' }, [el('h3', { text: 'Text and bytes' }), el('span', { class: 'hint', text: 'Characters to hex, binary, decimal and back' })]),
    el('div', { class: 'fields' }, [field('Text', txtIn), el('div', { class: 'field' }, [el('label', { text: 'Codes (spaces between bytes)', for: 'tx-code' }), codeIn]), field('Codes are in', fmtSel)]),
    el('div', { class: 'group-h', text: 'Text to codes' }), out3, el('div', { class: 'group-h', text: 'Codes to text' }), out3b
  ]));

  /* =========================================================
     4. IEEE 754 floating point
     ========================================================= */
  const flIn = textIn('fl-in', '-6.25'), out4 = el('div', { 'aria-live': 'polite', class: 'base-rows' });
  const hexIn = textIn('fl-hex', '40490FDB');
  const out4b = el('div', { class: 'base-rows' });
  function parts(bitsStr, eb) { return bitsStr[0] + ' | ' + bitsStr.slice(1, 1 + eb) + ' | ' + bitsStr.slice(1 + eb); }
  function run4() {
    out4.replaceChildren();
    const x = Number(flIn.value.trim().replace(/−/g, '-'));
    if (flIn.value.trim() === '' || Number.isNaN(x) && !/nan/i.test(flIn.value)) { out4.appendChild(el('p', { class: 'snote', style: 'color:var(--bad)', text: 'Enter a decimal number such as -6.25.' })); return; }
    const d32 = new DataView(new ArrayBuffer(4)), d64 = new DataView(new ArrayBuffer(8));
    d32.setFloat32(0, x); d64.setFloat64(0, x);
    const b32 = padBin(BigInt(d32.getUint32(0)), 32), b64 = padBin(d64.getBigUint64(0), 64);
    out4.appendChild(rowEl('32-bit bits', parts(b32, 8), b32));
    out4.appendChild(rowEl('32-bit hex', '0x' + parseInt(b32, 2).toString(16).toUpperCase().padStart(8, '0')));
    out4.appendChild(rowEl('32-bit value', String(d32.getFloat32(0))));
    out4.appendChild(rowEl('64-bit bits', parts(b64, 11), b64));
    out4.appendChild(rowEl('64-bit hex', '0x' + BigInt('0b' + b64).toString(16).toUpperCase().padStart(16, '0')));
    out4.appendChild(rowEl('64-bit value', String(d64.getFloat64(0))));
    out4.appendChild(el('p', { class: 'snote', text: 'Layout: sign | exponent | fraction. 32-bit has 1 + 8 + 23 bits and 64-bit has 1 + 11 + 52 bits. The exponent is stored with a bias of 127 (32-bit) or 1023 (64-bit).' }));
  }
  function run4b() {
    out4b.replaceChildren();
    const t = hexIn.value.trim().replace(/^0x/i, '').replace(/\s/g, '');
    if (!/^[0-9a-f]+$/i.test(t) || (t.length !== 8 && t.length !== 16)) { out4b.appendChild(el('p', { class: 'snote', text: 'Type 8 hex digits for a 32-bit float or 16 for a 64-bit float.' })); return; }
    const dv = new DataView(new ArrayBuffer(8));
    if (t.length === 8) { dv.setUint32(0, parseInt(t, 16)); out4b.appendChild(rowEl('32-bit value', String(dv.getFloat32(0)))); }
    else { dv.setBigUint64(0, BigInt('0x' + t)); out4b.appendChild(rowEl('64-bit value', String(dv.getFloat64(0)))); }
  }
  flIn.addEventListener('input', run4); hexIn.addEventListener('input', run4b);
  root.appendChild(el('div', { class: 'card solve-input', style: 'margin-top:14px' }, [
    el('div', { class: 'card-h' }, [el('h3', { text: 'Floating point (IEEE 754)' }), el('span', { class: 'hint', text: 'How computers store decimals' })]),
    el('div', { class: 'fields' }, [field('Decimal number', flIn), field('Or a hex pattern to decode', hexIn)]),
    out4, out4b
  ]));

  [render1, run2, run3, run3b, run4, run4b].forEach(fn => { try { fn(); } catch (e) { /* one section failing must not stop the others */ } });
})(globalThis.MB = globalThis.MB || {});
