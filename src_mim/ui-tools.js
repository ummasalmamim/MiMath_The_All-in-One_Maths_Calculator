/* ---------- tools: number theory, geometry, statistics, finance, vectors and a function library ---------- */
(function (MB) {
  'use strict';
  if (!MB.core || !MB.ui) return;
  const U = MB.ui, C = MB.core, el = U.el, root = U.$('#v-tools');
  if (!root) return;
  const S = (t, m, n) => ({ t, m: [].concat(m || []), n: n || '' });
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹', sup = n => String(n).replace(/\d/g, d => SUP[d]);
  const f = x => C.fmt(x, 10).replace(/-/g, '−');
  const fx = x => String(x).replace(/-/g, '−');

  /* ----- input helpers ----- */
  function N(s, label) {
    const t = String(s == null ? '' : s).trim();
    if (!t) throw new Error('Enter ' + label + '.');
    let v; try { v = C.num(C.core.evaluate(C.userNorm(t))); } catch (e) { v = NaN; }
    if (!Number.isFinite(v)) throw new Error('"' + t + '" is not a number for ' + label + '.');
    return v;
  }
  function I(s, label, min, max) {
    const v = N(s, label);
    if (!Number.isInteger(v)) throw new Error(label + ' must be a whole number.');
    if (min != null && v < min) throw new Error(label + ' must be ' + min + ' or more.');
    if (max != null && v > max) throw new Error(label + ' must be ' + max + ' or less.');
    return v;
  }
  function L(s, label, min) {
    const parts = String(s || '').split(/[\s,;]+/).filter(Boolean);
    const a = parts.map(p => N(p, label));
    if (a.length < (min || 1)) throw new Error('Enter at least ' + (min || 1) + ' value' + ((min || 1) > 1 ? 's' : '') + ' for ' + label + '.');
    return a;
  }
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };
  const gcdB = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { [a, b] = [b, a % b]; } return a; };
  const bigShow = b => { const s = b.toString(); return s.length > 70 ? s.slice(0, 35) + '…' + s.slice(-10) + '  (' + s.length + ' digits)' : s; };
  function expStr(ps) { const m = new Map(); ps.forEach(p => m.set(p, (m.get(p) || 0) + 1)); return Array.from(m).map(([p, e]) => e > 1 ? p + sup(e) : String(p)).join(' × '); }
  function factorize(n) { const out = []; let m = n; for (let p = 2; p * p <= m; p += p === 2 ? 1 : 2) while (m % p === 0) { out.push(p); m /= p; } if (m > 1) out.push(m); return out; }
  function divisors(n) { const d = [], lo = []; for (let i = 1; i * i <= n; i++) if (n % i === 0) { lo.push(i); if (i * i !== n) d.push(n / i); } return lo.concat(d.reverse()); }
  const frac = (n, d) => { const g = gcd(n, d) || 1; n /= g; d /= g; if (d < 0) { n = -n; d = -d; } return [n, d]; };
  const fs = ([n, d]) => d === 1 ? fx(n) : fx(n) + '/' + d;
  const mixed = ([n, d]) => { if (d === 1 || Math.abs(n) < d) return fs([n, d]); const w = Math.trunc(n / d), r = Math.abs(n % d); return fx(w) + ' ' + r + '/' + d; };
  const erf = x => C.core.erf(x), Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
  const ang = r => r * 180 / Math.PI;

  /* ----- tool definitions ----- */
  const TOOLS = [];
  const T = (cat, id, name, fields, run, desc) => TOOLS.push({ cat, id, name, fields, run, desc });
  const SEL = (...o) => ({ opts: o.map(x => Array.isArray(x) ? x : [x, x]) });

  /* ===== Number theory ===== */
  T('Number theory', 'factor', 'Prime factors', [['n', 'Whole number', '360']], v => {
    const n = I(v.n, 'the number', 2, 1e14);
    const steps = [], ps = []; let m = n;
    for (let p = 2; p * p <= m; p += p === 2 ? 1 : 2) while (m % p === 0) { steps.push(m + ' ÷ ' + p + ' = ' + (m / p)); ps.push(p); m /= p; }
    if (m > 1) { if (m !== n) steps.push(m + ' is prime, so we stop.'); ps.push(m); }
    const prime = ps.length === 1, ds = divisors(n), sig = ds.reduce((a, b) => a + b, 0), phi = Array.from(new Set(ps)).reduce((a, p) => a * (1 - 1 / p), n);
    return { headline: prime ? n + ' is prime' : n + ' = ' + expStr(ps), rows: [['Prime?', prime ? 'Yes' : 'No, it is composite'], ['Number of divisors', String(ds.length)], ['Sum of divisors', String(sig)], ['Euler’s totient φ(n)', String(Math.round(phi))]],
      steps: prime ? [S('Test for divisors up to √n', 'No whole number from 2 to ' + Math.floor(Math.sqrt(n)) + ' divides ' + n + ', so it is prime.')] : [S('Divide by the smallest prime that fits, again and again', steps), S('Collect the primes', n + ' = ' + expStr(ps))] };
  }, 'Prime test and factorisation, with divisor count, divisor sum and Euler totient.');
  T('Number theory', 'gcd', 'GCD and LCM', [['list', 'Whole numbers (spaces or commas)', '48 180 84']], v => {
    const a = L(v.list, 'the numbers', 2); a.forEach(x => { if (!Number.isInteger(x) || x === 0 || Math.abs(x) > 9e15) throw new Error('Use non-zero whole numbers.'); });
    const lines = []; let g = Math.abs(a[0]);
    let x = Math.abs(a[0]), y = Math.abs(a[1]); const e = [];
    while (y) { e.push(x + ' = ' + Math.floor(x / y) + ' × ' + y + ' + ' + (x % y)); [x, y] = [y, x % y]; }
    a.forEach((n, i) => { if (i) { const g0 = g; g = gcd(g, n); lines.push('gcd(' + g0 + ', ' + Math.abs(n) + ') = ' + g); } });
    let l = BigInt(Math.abs(a[0])); a.forEach((n, i) => { if (i) { const b = BigInt(Math.abs(n)); l = l / gcdB(l, b) * b; } });
    return { headline: 'GCD = ' + g + ',  LCM = ' + l, rows: [['GCD (highest common factor)', String(g)], ['LCM (lowest common multiple)', l.toString()]],
      steps: [S('Euclid’s algorithm on the first two numbers', e.concat(['The last non-zero remainder is the GCD = ' + gcd(a[0], a[1])]), 'Replace the pair (a, b) by (b, a mod b) until the remainder is 0.')].concat(a.length > 2 ? [S('Continue with the rest', lines)] : []).concat([S('LCM from GCD', 'lcm(a, b) = a × b ÷ gcd(a, b)', 'LCM of all numbers = ' + l)]) };
  }, 'Euclid’s algorithm with steps, for two or more numbers.');
  T('Number theory', 'divisors', 'Divisors', [['n', 'Whole number', '360']], v => {
    const n = I(v.n, 'the number', 1, 1e12), ds = divisors(n), s = ds.reduce((a, b) => a + b, 0) - n;
    return { headline: n + ' has ' + ds.length + ' divisors', rows: [['Divisors', ds.length > 200 ? ds.slice(0, 200).join(', ') + ', …' : ds.join(', ')], ['Sum of proper divisors', String(s)], ['Type', n === 1 ? 'Neither' : s === n ? 'Perfect number' : s > n ? 'Abundant' : 'Deficient']], steps: [S('Check each number up to √n', 'Every divisor d below √' + n + ' pairs with n ÷ d above it.')] };
  });
  T('Number theory', 'primes', 'Primes up to n', [['n', 'Up to', '100']], v => {
    const n = I(v.n, 'n', 2, 2000000), sieve = new Uint8Array(n + 1), ps = [];
    for (let i = 2; i <= n; i++) { if (!sieve[i]) { ps.push(i); for (let j = i * i; j <= n; j += i) sieve[j] = 1; } }
    return { headline: ps.length + ' primes up to ' + n, rows: [['Primes', ps.length > 400 ? ps.slice(0, 400).join(', ') + ', … (first 400 shown)' : ps.join(', ')], ['Largest', String(ps[ps.length - 1])]], steps: [S('Sieve of Eratosthenes', ['List 2 to ' + n, 'Take the next unmarked number p. It is prime.', 'Cross out p², p² + p, p² + 2p, … up to ' + n, 'Repeat until p² is bigger than ' + n])] };
  });
  T('Number theory', 'modular', 'Modular arithmetic', [['a', 'a', '7'], ['b', 'b (exponent)', '128'], ['m', 'm (modulus)', '13']], v => {
    const a = BigInt(I(v.a, 'a')), b = BigInt(I(v.b, 'b', 0)), m = BigInt(I(v.m, 'm', 2));
    const mod = ((a % m) + m) % m; let r = 1n, base = mod, e = b; const steps = [];
    while (e > 0n) { if (e & 1n) { r = r * base % m; } steps.push('bit ' + (e & 1n) + ':  base = ' + base + ',  result so far = ' + r); base = base * base % m; e >>= 1n; if (steps.length > 70) break; }
    const rows = [['a mod m', mod.toString()], ['a^b mod m', r.toString()]];
    const g = gcdB(mod, m); let inv = null; const ex = [];
    if (g === 1n) { let [or, rr, os, ss] = [mod, m, 1n, 0n]; while (rr) { const q = or / rr; ex.push(or + ' = ' + q + ' × ' + rr + ' + ' + (or % rr)); [or, rr] = [rr, or - q * rr]; [os, ss] = [ss, os - q * ss]; } inv = ((os % m) + m) % m; rows.push(['Inverse of a mod m', inv.toString()]); } else rows.push(['Inverse of a mod m', 'none, since gcd(a, m) = ' + g]);
    return { headline: a + '^' + b + ' mod ' + m + ' = ' + r, rows, steps: [S('Square and multiply, one bit of the exponent at a time', steps, 'Square the base each time. Multiply it into the result when the bit is 1. Reduce mod ' + m + ' after every step.')].concat(inv !== null ? [S('Inverse by the extended Euclidean algorithm', ex.concat(['The inverse is ' + inv + ', because ' + mod + ' × ' + inv + ' ≡ 1 (mod ' + m + ').']))] : []) };
  });
  T('Number theory', 'fib', 'Fibonacci and Lucas', [['n', 'n (0 to 2000)', '50']], v => {
    const n = I(v.n, 'n', 0, 2000); let a = 0n, b = 1n; const list = [];
    for (let i = 0; i <= n; i++) { if (i < 25) list.push(a.toString()); if (i < n) [a, b] = [b, a + b]; }
    let la = 2n, lb = 1n; for (let i = 0; i < n; i++) [la, lb] = [lb, la + lb];
    return { headline: 'F(' + n + ') = ' + bigShow(a), rows: [['Fibonacci F(n)', bigShow(a)], ['Lucas L(n)', bigShow(la)], ['First terms', list.join(', ') + (n >= 25 ? ', …' : '')], ['Ratio F(n+1)/F(n)', n ? f(Number(b) / Number(a)) : '—', 'It approaches the golden ratio 1.6180339887']], steps: [S('Each term is the sum of the two before it', 'F(0) = 0,  F(1) = 1,  F(n) = F(n−1) + F(n−2)')] };
  });
  T('Number theory', 'counting', 'Factorial, nCr and nPr', [['n', 'n', '10'], ['r', 'r', '3']], v => {
    const n = I(v.n, 'n', 0, 2000), r = I(v.r, 'r', 0, n);
    const fact = k => { let x = 1n; for (let i = 2n; i <= BigInt(k); i++) x *= i; return x; };
    let p = 1n; for (let i = 0; i < r; i++) p *= BigInt(n - i);
    const c = p / fact(r);
    return { headline: n + '! = ' + bigShow(fact(n)), rows: [[n + '!', bigShow(fact(n))], ['nPr = n!/(n−r)!', bigShow(p)], ['nCr = n!/(r!(n−r)!)', bigShow(c)], ['Arrangements with repeats, nʳ', bigShow(BigInt(n) ** BigInt(r))]], steps: [S('Permutations (order matters)', 'nPr = ' + Array.from({ length: Math.min(r, 8) }, (_, i) => n - i).join(' × ') + (r > 8 ? ' × …' : '') + ' = ' + bigShow(p)), S('Combinations (order does not matter)', 'nCr = nPr ÷ r! = ' + bigShow(p) + ' ÷ ' + bigShow(fact(r)) + ' = ' + bigShow(c))] };
  });
  T('Number theory', 'collatz', 'Collatz sequence', [['n', 'Start with', '27']], v => {
    let n = I(v.n, 'the start', 1, 1e12), seq = [n], mx = n;
    while (n !== 1 && seq.length < 2000) { n = n % 2 ? 3 * n + 1 : n / 2; seq.push(n); mx = Math.max(mx, n); }
    return { headline: (seq.length - 1) + ' steps to reach 1', rows: [['Highest value', String(mx)], ['Sequence', seq.length > 120 ? seq.slice(0, 120).join(' → ') + ' → …' : seq.join(' → ')]], steps: [S('The rule', 'If n is even: n → n ÷ 2.  If n is odd: n → 3n + 1.', 'Nobody has proved that every start reaches 1, but none has failed.')] };
  });
  T('Number theory', 'props', 'Number properties', [['n', 'Whole number', '153']], v => {
    const n = I(v.n, 'the number', 0, 1e15), sn = String(n), digs = sn.split('').map(Number), ds = n > 0 ? divisors(n).reduce((a, b) => a + b, 0) - n : 0;
    const isP = n > 1 && factorize(n).length === 1, sq = Math.round(Math.sqrt(n)), cb = Math.round(Math.cbrt(n)), tri = (Math.sqrt(8 * n + 1) % 1) === 0;
    const arm = digs.reduce((a, d) => a + Math.pow(d, digs.length), 0) === n;
    let dr = n; while (dr > 9) dr = String(dr).split('').reduce((a, d) => a + +d, 0);
    const yn = b => b ? 'Yes' : 'No';
    return { headline: n + ' in short', rows: [['Even or odd', n % 2 ? 'Odd' : 'Even'], ['Prime', yn(isP)], ['Perfect square', yn(sq * sq === n)], ['Perfect cube', yn(cb * cb * cb === n)], ['Perfect number', yn(n > 1 && ds === n)], ['Palindrome', yn(sn === sn.split('').reverse().join(''))], ['Armstrong number', yn(arm)], ['Triangular number', yn(tri)], ['Digits', String(digs.length)], ['Digit sum', String(digs.reduce((a, b) => a + b, 0))], ['Digital root', String(dr)], ['Binary', n.toString(2)], ['Hexadecimal', n.toString(16).toUpperCase()]], steps: [] };
  });

  /* ===== Percent, ratio and fractions ===== */
  T('Percent and fractions', 'percent', 'Percentages', [['x', 'x', '15'], ['y', 'y', '80']], v => {
    const x = N(v.x, 'x'), y = N(v.y, 'y');
    const a = x / 100 * y, b = y === 0 ? NaN : x / y * 100, c = x === 0 ? NaN : (y - x) / Math.abs(x) * 100;
    return { headline: x + '% of ' + y + ' = ' + f(a), rows: [[x + '% of ' + y, f(a)], [x + ' is what % of ' + y, Number.isFinite(b) ? f(b) + '%' : 'undefined'], ['% change from ' + x + ' to ' + y, Number.isFinite(c) ? (c >= 0 ? '+' : '') + f(c) + '%' : 'undefined'], [y + ' increased by ' + x + '%', f(y * (1 + x / 100))], [y + ' decreased by ' + x + '%', f(y * (1 - x / 100))]],
      steps: [S('x% of y', 'x ÷ 100 × y = ' + f(x) + ' ÷ 100 × ' + f(y) + ' = ' + f(a)), S('x as a percentage of y', 'x ÷ y × 100 = ' + f(x) + ' ÷ ' + f(y) + ' × 100 = ' + (Number.isFinite(b) ? f(b) + '%' : 'undefined')), S('Percentage change from x to y', '(y − x) ÷ |x| × 100 = (' + f(y) + ' − ' + f(x) + ') ÷ ' + f(Math.abs(x)) + ' × 100 = ' + (Number.isFinite(c) ? f(c) + '%' : 'undefined'))] };
  });
  T('Percent and fractions', 'ratio', 'Ratio and proportion', [['a', 'a', '12'], ['b', 'b', '18'], ['c', 'c (optional, solves a : b = c : x)', '10']], v => {
    const a = N(v.a, 'a'), b = N(v.b, 'b');
    let k = 1; while (k < 1e6 && (!Number.isInteger(a * k) || !Number.isInteger(b * k))) k *= 10;
    const A = Math.round(a * k), B = Math.round(b * k), g = gcd(A, B) || 1;
    const rows = [['Simplest ratio', (A / g) + ' : ' + (B / g)], ['a ÷ b', b ? f(a / b) : 'undefined']];
    const steps = [S('Divide both by their GCD', A + ' : ' + B + '  →  ÷ ' + g + '  →  ' + (A / g) + ' : ' + (B / g))];
    let head = a + ' : ' + b + ' = ' + (A / g) + ' : ' + (B / g);
    if (String(v.c).trim()) { const c = N(v.c, 'c'); if (a === 0) throw new Error('a cannot be 0 in a proportion.'); const x = b * c / a; rows.push(['x in a : b = c : x', f(x)]); steps.push(S('Cross-multiply', 'a × x = b × c,  so  x = ' + f(b) + ' × ' + f(c) + ' ÷ ' + f(a) + ' = ' + f(x))); head += ',   x = ' + f(x); }
    return { headline: head, rows, steps };
  });
  T('Percent and fractions', 'fraction', 'Fraction calculator', [['p', 'First fraction (like 3/4 or 2 1/2)', '3/4'], ['op', 'Operation', '+', SEL('+', '−', '×', '÷')], ['q', 'Second fraction', '5/6']], v => {
    const parse = (s, lab) => {
      const t = String(s).trim().replace(/−/g, '-'); let m;
      if ((m = /^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(t))) { const w = +m[1], d = +m[3]; if (!d) throw new Error('The bottom of ' + lab + ' cannot be 0.'); return frac((Math.abs(w) * d + +m[2]) * (w < 0 || /^-/.test(t) ? -1 : 1), d); }
      if ((m = /^(-?\d+)\s*\/\s*(-?\d+)$/.exec(t))) { if (+m[2] === 0) throw new Error('The bottom of ' + lab + ' cannot be 0.'); return frac(+m[1], +m[2]); }
      if (/^-?\d*\.?\d+$/.test(t)) { const d = t.indexOf('.') < 0 ? 1 : Math.pow(10, t.length - t.indexOf('.') - 1); return frac(Math.round(parseFloat(t) * d), d); }
      throw new Error('Write ' + lab + ' like 3/4, 2 1/2 or 0.75.');
    };
    const [a, b] = parse(v.p, 'the first fraction'), [c, d] = parse(v.q, 'the second fraction'), op = v.op;
    let r, steps = [];
    if (op === '+' || op === '−') {
      const l = b / gcd(b, d) * d, na = a * (l / b), nc = c * (l / d), top = op === '+' ? na + nc : na - nc; r = frac(top, l);
      steps = [S('Find a common denominator', 'lcm(' + b + ', ' + d + ') = ' + l), S('Rewrite both fractions', fs([a, b]) + ' = ' + na + '/' + l + '    ' + fs([c, d]) + ' = ' + nc + '/' + l), S(op === '+' ? 'Add the tops' : 'Subtract the tops', na + ' ' + op + ' ' + fx(nc) + ' = ' + top + ',  so  ' + top + '/' + l), S('Simplify by the GCD', top + '/' + l + ' = ' + fs(r))];
    } else if (op === '×') { r = frac(a * c, b * d); steps = [S('Multiply the tops and the bottoms', fs([a, b]) + ' × ' + fs([c, d]) + ' = ' + (a * c) + '/' + (b * d)), S('Simplify', fs(r))]; }
    else { if (c === 0) throw new Error('You cannot divide by 0.'); r = frac(a * d, b * c); steps = [S('Flip the second fraction and multiply', fs([a, b]) + ' ÷ ' + fs([c, d]) + ' = ' + fs([a, b]) + ' × ' + fs([d, c])), S('Multiply and simplify', (a * d) + '/' + (b * c) + ' = ' + fs(r))]; }
    return { headline: fs([a, b]) + ' ' + op + ' ' + fs([c, d]) + ' = ' + fs(r), rows: [['Fraction', fs(r)], ['Mixed number', mixed(r)], ['Decimal', f(r[0] / r[1])], ['Percent', f(r[0] / r[1] * 100) + '%']], steps };
  });
  T('Percent and fractions', 'round', 'Rounding and scientific notation', [['x', 'Number', '12345.6789'], ['dp', 'Decimal places', '2'], ['sf', 'Significant figures', '3']], v => {
    const x = N(v.x, 'the number'), dp = I(v.dp, 'decimal places', 0, 15), sf = I(v.sf, 'significant figures', 1, 15);
    const sci = x === 0 ? '0' : (() => { const e = Math.floor(Math.log10(Math.abs(x))); return f(x / Math.pow(10, e)) + ' × 10' + (e < 0 ? '⁻' : '') + sup(Math.abs(e)); })();
    const eng = x === 0 ? '0' : (() => { const e = Math.floor(Math.floor(Math.log10(Math.abs(x))) / 3) * 3; return f(x / Math.pow(10, e)) + ' × 10' + (e < 0 ? '⁻' : '') + sup(Math.abs(e)); })();
    return { headline: x + ' rounded to ' + dp + ' decimal places is ' + x.toFixed(dp), rows: [[dp + ' decimal places', x.toFixed(dp)], [sf + ' significant figures', String(Number(x.toPrecision(sf)))], ['Nearest whole number', String(Math.round(x))], ['Round down (floor)', String(Math.floor(x))], ['Round up (ceiling)', String(Math.ceil(x))], ['Cut off decimals (truncate)', String(Math.trunc(x))], ['Scientific notation', sci], ['Engineering notation', eng]], steps: [S('How rounding works', 'Look at the first digit you are dropping. If it is 5 or more, round up. Otherwise keep the digit.')] };
  });

  /* ===== Geometry ===== */
  const geo = (id, name, fields, fn) => T('Geometry', id, name, fields, fn);
  geo('circle', 'Circle and sphere', [['r', 'Radius', '5']], v => { const r = N(v.r, 'the radius'); if (r < 0) throw new Error('The radius must be 0 or more.'); const P = Math.PI;
    return { headline: 'Circle area = ' + f(P * r * r), rows: [['Circle area πr²', f(P * r * r)], ['Circumference 2πr', f(2 * P * r)], ['Diameter 2r', f(2 * r)], ['Sphere volume (4/3)πr³', f(4 / 3 * P * r ** 3)], ['Sphere surface area 4πr²', f(4 * P * r * r)]], steps: [S('Area', 'A = πr² = π × ' + f(r) + '² = ' + f(P * r * r)), S('Circumference', 'C = 2πr = 2 × π × ' + f(r) + ' = ' + f(2 * P * r)), S('Sphere', ['V = (4/3)πr³ = ' + f(4 / 3 * P * r ** 3), 'S = 4πr² = ' + f(4 * P * r * r)])] }; });
  geo('rect', 'Rectangle and box', [['w', 'Width', '6'], ['h', 'Height', '4'], ['d', 'Depth (for a box)', '3']], v => { const w = N(v.w, 'the width'), h = N(v.h, 'the height'), d = N(v.d, 'the depth');
    return { headline: 'Rectangle area = ' + f(w * h), rows: [['Area w × h', f(w * h)], ['Perimeter 2(w + h)', f(2 * (w + h))], ['Diagonal √(w² + h²)', f(Math.hypot(w, h))], ['Box volume w × h × d', f(w * h * d)], ['Box surface 2(wh + wd + hd)', f(2 * (w * h + w * d + h * d))], ['Box diagonal', f(Math.hypot(w, h, d))]], steps: [S('Rectangle', ['A = w × h = ' + f(w * h), 'P = 2(w + h) = ' + f(2 * (w + h))]), S('Box', ['V = w × h × d = ' + f(w * h * d), 'S = 2(wh + wd + hd) = ' + f(2 * (w * h + w * d + h * d))])] }; });
  geo('triangle', 'Triangle from 3 sides', [['a', 'Side a', '3'], ['b', 'Side b', '4'], ['c', 'Side c', '5']], v => { const a = N(v.a, 'side a'), b = N(v.b, 'side b'), c = N(v.c, 'side c');
    if (a <= 0 || b <= 0 || c <= 0) throw new Error('Sides must be more than 0.'); if (a + b <= c || a + c <= b || b + c <= a) throw new Error('These sides cannot form a triangle. Any two sides must add up to more than the third.');
    const s = (a + b + c) / 2, A = Math.sqrt(s * (s - a) * (s - b) * (s - c)), ca = Math.acos((b * b + c * c - a * a) / (2 * b * c)), cb = Math.acos((a * a + c * c - b * b) / (2 * a * c)), cc = Math.PI - ca - cb;
    const type = [a, b, c].every(x => Math.abs(x - a) < 1e-9) ? 'Equilateral' : (Math.abs(a - b) < 1e-9 || Math.abs(b - c) < 1e-9 || Math.abs(a - c) < 1e-9) ? 'Isosceles' : 'Scalene';
    const mx = Math.max(ca, cb, cc), kind = Math.abs(mx - Math.PI / 2) < 1e-9 ? 'right-angled' : mx > Math.PI / 2 ? 'obtuse' : 'acute';
    return { headline: 'Area = ' + f(A), rows: [['Area (Heron)', f(A)], ['Perimeter', f(a + b + c)], ['Angle A', f(ang(ca)) + '°'], ['Angle B', f(ang(cb)) + '°'], ['Angle C', f(ang(cc)) + '°'], ['Type', type + ', ' + kind], ['Inradius', f(A / s)], ['Circumradius', f(a * b * c / (4 * A))]], steps: [S('Half the perimeter', 's = (a + b + c) ÷ 2 = ' + f(s)), S('Heron’s formula', 'A = √(s(s−a)(s−b)(s−c)) = √(' + f(s) + ' × ' + f(s - a) + ' × ' + f(s - b) + ' × ' + f(s - c) + ') = ' + f(A)), S('Angles by the law of cosines', 'cos A = (b² + c² − a²) ÷ 2bc  →  A = ' + f(ang(ca)) + '°')] }; });
  geo('trap', 'Trapezoid and parallelogram', [['a', 'Parallel side a', '8'], ['b', 'Parallel side b', '5'], ['h', 'Height', '4']], v => { const a = N(v.a, 'side a'), b = N(v.b, 'side b'), h = N(v.h, 'the height');
    return { headline: 'Trapezoid area = ' + f((a + b) / 2 * h), rows: [['Trapezoid area ½(a + b)h', f((a + b) / 2 * h)], ['Median (mid-segment)', f((a + b) / 2)], ['Parallelogram area (base a)', f(a * h)]], steps: [S('Trapezoid', 'A = ½(a + b) × h = ½(' + f(a) + ' + ' + f(b) + ') × ' + f(h) + ' = ' + f((a + b) / 2 * h))] }; });
  geo('polygon', 'Regular polygon', [['n', 'Number of sides', '6'], ['s', 'Side length', '4']], v => { const n = I(v.n, 'the number of sides', 3, 1000), s = N(v.s, 'the side length'); const ap = s / (2 * Math.tan(Math.PI / n)), R = s / (2 * Math.sin(Math.PI / n));
    return { headline: 'Area = ' + f(n * s * ap / 2), rows: [['Area ½ × perimeter × apothem', f(n * s * ap / 2)], ['Perimeter n × s', f(n * s)], ['Interior angle (n−2)×180°/n', f((n - 2) * 180 / n) + '°'], ['Exterior angle 360°/n', f(360 / n) + '°'], ['Apothem', f(ap)], ['Circumradius', f(R)], ['Diagonals n(n−3)/2', String(n * (n - 3) / 2)], ['Sum of interior angles', f((n - 2) * 180) + '°']], steps: [S('Apothem', 'a = s ÷ (2 tan(π/n)) = ' + f(ap)), S('Area', 'A = ½ × (n × s) × a = ' + f(n * s * ap / 2))] }; });
  geo('cylcone', 'Cylinder and cone', [['r', 'Radius', '3'], ['h', 'Height', '7']], v => { const r = N(v.r, 'the radius'), h = N(v.h, 'the height'), l = Math.hypot(r, h), P = Math.PI;
    return { headline: 'Cylinder volume = ' + f(P * r * r * h), rows: [['Cylinder volume πr²h', f(P * r * r * h)], ['Cylinder curved area 2πrh', f(2 * P * r * h)], ['Cylinder total area 2πr(r + h)', f(2 * P * r * (r + h))], ['Cone slant height √(r² + h²)', f(l)], ['Cone volume ⅓πr²h', f(P * r * r * h / 3)], ['Cone curved area πrl', f(P * r * l)], ['Cone total area πr(r + l)', f(P * r * (r + l))]], steps: [S('Cylinder', 'V = πr²h = π × ' + f(r) + '² × ' + f(h) + ' = ' + f(P * r * r * h)), S('Cone', ['l = √(r² + h²) = ' + f(l), 'V = ⅓πr²h = ' + f(P * r * r * h / 3)])] }; });
  geo('ellipse', 'Ellipse', [['a', 'Semi-axis a', '5'], ['b', 'Semi-axis b', '3']], v => { const a = N(v.a, 'a'), b = N(v.b, 'b'), h = ((a - b) / (a + b)) ** 2, p = Math.PI * (a + b) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h))), e = Math.sqrt(1 - Math.min(a, b) ** 2 / Math.max(a, b) ** 2);
    return { headline: 'Area = ' + f(Math.PI * a * b), rows: [['Area πab', f(Math.PI * a * b)], ['Perimeter (Ramanujan estimate)', f(p)], ['Eccentricity', f(e)]], steps: [S('Area', 'A = π × a × b = ' + f(Math.PI * a * b)), S('Perimeter', 'There is no exact simple formula. Ramanujan’s estimate is very accurate: ' + f(p))] }; });
  geo('coord', 'Two points: distance and line', [['x1', 'x₁', '1'], ['y1', 'y₁', '2'], ['x2', 'x₂', '7'], ['y2', 'y₂', '10']], v => { const x1 = N(v.x1, 'x₁'), y1 = N(v.y1, 'y₁'), x2 = N(v.x2, 'x₂'), y2 = N(v.y2, 'y₂'), dx = x2 - x1, dy = y2 - y1;
    const m = dx === 0 ? null : dy / dx, bb = m === null ? null : y1 - m * x1;
    return { headline: 'Distance = ' + f(Math.hypot(dx, dy)), rows: [['Distance', f(Math.hypot(dx, dy))], ['Midpoint', '(' + f((x1 + x2) / 2) + ', ' + f((y1 + y2) / 2) + ')'], ['Slope', m === null ? 'undefined (vertical line)' : f(m)], ['Line equation', m === null ? 'x = ' + f(x1) : 'y = ' + f(m) + 'x ' + (bb < 0 ? '− ' : '+ ') + f(Math.abs(bb))], ['Angle with the x-axis', f(ang(Math.atan2(dy, dx))) + '°']], steps: [S('Distance formula', 'd = √((x₂−x₁)² + (y₂−y₁)²) = √(' + f(dx) + '² + ' + f(dy) + '²) = ' + f(Math.hypot(dx, dy))), S('Slope', 'm = (y₂−y₁) ÷ (x₂−x₁) = ' + f(dy) + ' ÷ ' + f(dx) + (m === null ? ', which is undefined' : ' = ' + f(m)))] }; });
  geo('pyth', 'Right triangle (Pythagoras)', [['a', 'Leg a (blank if unknown)', '3'], ['b', 'Leg b (blank if unknown)', '4'], ['c', 'Hypotenuse c (blank if unknown)', '']], v => {
    const has = k => String(v[k]).trim() !== '', cnt = ['a', 'b', 'c'].filter(has).length; if (cnt !== 2) throw new Error('Fill in exactly two of the three sides and leave one blank.');
    let a = has('a') ? N(v.a, 'a') : null, b = has('b') ? N(v.b, 'b') : null, c = has('c') ? N(v.c, 'c') : null, st;
    if ([a, b, c].some(x => x !== null && x <= 0)) throw new Error('Sides must be more than 0.');
    if (c === null) { c = Math.hypot(a, b); st = 'c = √(a² + b²) = √(' + f(a) + '² + ' + f(b) + '²) = ' + f(c); }
    else { const o = a === null ? b : a; if (c <= o) throw new Error('The hypotenuse must be the longest side.'); const m = Math.sqrt(c * c - o * o); if (a === null) a = m; else b = m; st = (a === m ? 'a' : 'b') + ' = √(c² − ' + (a === m ? 'b' : 'a') + '²) = ' + f(m); }
    return { headline: 'a = ' + f(a) + ',  b = ' + f(b) + ',  c = ' + f(c), rows: [['Leg a', f(a)], ['Leg b', f(b)], ['Hypotenuse c', f(c)], ['Angle A', f(ang(Math.atan2(a, b))) + '°'], ['Angle B', f(ang(Math.atan2(b, a))) + '°'], ['Area', f(a * b / 2)], ['Perimeter', f(a + b + c)]], steps: [S('Pythagoras: a² + b² = c²', st), S('Angles from tan', 'A = atan(a ÷ b) = ' + f(ang(Math.atan2(a, b))) + '°,  B = 90° − A')] };
  });

  /* ===== Statistics ===== */
  T('Statistics', 'stats', 'Descriptive statistics', [['list', 'Data (spaces or commas)', '4 8 15 16 23 42 8']], v => {
    const a = L(v.list, 'the data'), s = C.describe(a);
    const dev = a.slice(0, 8).map(x => '(' + f(x) + ' − ' + f(s.mean) + ')² = ' + f((x - s.mean) ** 2));
    return { headline: 'Mean = ' + f(s.mean) + ',  median = ' + f(s.median), rows: [['Count n', String(s.n)], ['Sum', f(s.sum)], ['Mean', f(s.mean)], ['Median', f(s.median)], ['Mode', s.modes.length === a.length ? 'none' : s.modes.map(f).join(', ')], ['Minimum', f(s.min)], ['Maximum', f(s.max)], ['Range', f(s.range)], ['Q1 and Q3', f(s.q1) + ' and ' + f(s.q3)], ['Interquartile range', f(s.q3 - s.q1)], ['Variance (population)', f(s.varP)], ['Variance (sample)', a.length > 1 ? f(s.varS) : 'n/a'], ['Standard deviation (population)', f(s.sdP)], ['Standard deviation (sample)', a.length > 1 ? f(s.sdS) : 'n/a']],
      steps: [S('Mean = sum ÷ count', f(s.sum) + ' ÷ ' + s.n + ' = ' + f(s.mean)), S('Median: sort, then take the middle', s.sorted.slice(0, 30).map(f).join(', ') + (s.n > 30 ? ', …' : ''), s.n % 2 ? 'There are an odd number of values, so the median is the middle one.' : 'There are an even number of values, so the median is the average of the middle two.'), S('Squared distances from the mean', dev.concat(a.length > 8 ? ['…'] : []).concat(['Sum of squares = ' + f(s.ss)])), S('Variance and standard deviation', ['Population: σ² = ' + f(s.ss) + ' ÷ ' + s.n + ' = ' + f(s.varP) + ',  σ = ' + f(s.sdP), a.length > 1 ? 'Sample: s² = ' + f(s.ss) + ' ÷ ' + (s.n - 1) + ' = ' + f(s.varS) + ',  s = ' + f(s.sdS) : ''])] };
  });
  T('Statistics', 'regress', 'Linear regression', [['pts', 'Points, one “x, y” per line', '1, 2\n2, 4.1\n3, 5.9\n4, 8.2\n5, 9.8', { area: true }], ['x0', 'Predict y at x =', '6']], v => {
    const rows = String(v.pts).split(/\n+/).map(s => s.trim()).filter(Boolean).map(s => s.split(/[\s,;]+/).map(t => N(t, 'a point'))); if (rows.length < 2 || rows.some(r => r.length !== 2)) throw new Error('Enter at least two points, one “x, y” pair per line.');
    const n = rows.length, xs = rows.map(r => r[0]), ys = rows.map(r => r[1]), mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0), syy = ys.reduce((a, y) => a + (y - my) ** 2, 0), sxy = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
    if (sxx === 0) throw new Error('All x values are the same, so no line can be fitted.');
    const m = sxy / sxx, b = my - m * mx, r = syy === 0 ? 1 : sxy / Math.sqrt(sxx * syy), x0 = String(v.x0).trim() ? N(v.x0, 'x') : null;
    const rowsOut = [['Slope m', f(m)], ['Intercept b', f(b)], ['Equation', 'y = ' + f(m) + 'x ' + (b < 0 ? '− ' : '+ ') + f(Math.abs(b))], ['Correlation r', f(r)], ['R²', f(r * r)]];
    if (x0 !== null) rowsOut.push(['Prediction at x = ' + f(x0), f(m * x0 + b)]);
    return { headline: 'y = ' + f(m) + 'x ' + (b < 0 ? '− ' : '+ ') + f(Math.abs(b)) + ',  r = ' + f(r), rows: rowsOut, steps: [S('Means', 'x̄ = ' + f(mx) + ',  ȳ = ' + f(my)), S('Sums of squares and products', ['Sxx = Σ(x − x̄)² = ' + f(sxx), 'Syy = Σ(y − ȳ)² = ' + f(syy), 'Sxy = Σ(x − x̄)(y − ȳ) = ' + f(sxy)]), S('Slope and intercept', ['m = Sxy ÷ Sxx = ' + f(m), 'b = ȳ − m x̄ = ' + f(b)]), S('Correlation', 'r = Sxy ÷ √(Sxx Syy) = ' + f(r), 'R² = ' + f(r * r) + ' means ' + f(r * r * 100) + '% of the variation in y is explained by the line.')] };
  });
  T('Statistics', 'normal', 'Normal distribution', [['mu', 'Mean μ', '100'], ['sd', 'Standard deviation σ', '15'], ['x1', 'x (or lower bound)', '115'], ['x2', 'Upper bound (optional)', '130']], v => {
    const mu = N(v.mu, 'μ'), sd = N(v.sd, 'σ'), x1 = N(v.x1, 'x'); if (sd <= 0) throw new Error('σ must be more than 0.');
    const z1 = (x1 - mu) / sd, rows = [['z-score of x', f(z1)], ['P(X < x)', f(Phi(z1))], ['P(X > x)', f(1 - Phi(z1))]]; const steps = [S('z-score', 'z = (x − μ) ÷ σ = (' + f(x1) + ' − ' + f(mu) + ') ÷ ' + f(sd) + ' = ' + f(z1)), S('Look up the area to the left of z', 'P(X < x) = Φ(z) = ' + f(Phi(z1)), 'Φ is computed from the error function: Φ(z) = ½(1 + erf(z ÷ √2)).')];
    if (String(v.x2).trim()) { const x2 = N(v.x2, 'the upper bound'), z2 = (x2 - mu) / sd, p = Math.abs(Phi(z2) - Phi(z1)); rows.push(['z-score of upper bound', f(z2)], ['P(between)', f(p)]); steps.push(S('Between the two values', 'P = Φ(' + f(z2) + ') − Φ(' + f(z1) + ') = ' + f(p))); }
    return { headline: 'P(X < ' + f(x1) + ') = ' + f(Phi(z1)), rows, steps };
  });
  T('Statistics', 'binom', 'Binomial probability', [['n', 'Trials n', '10'], ['p', 'Chance of success p', '0.5'], ['k', 'Successes k', '3']], v => {
    const n = I(v.n, 'n', 1, 1000), p = N(v.p, 'p'), k = I(v.k, 'k', 0, n); if (p < 0 || p > 1) throw new Error('p must be between 0 and 1.');
    const pm = j => C.core.combinations(n, j) * Math.pow(p, j) * Math.pow(1 - p, n - j); let cdf = 0; for (let j = 0; j <= k; j++) cdf += pm(j);
    return { headline: 'P(X = ' + k + ') = ' + f(pm(k)), rows: [['P(X = k)', f(pm(k))], ['P(X ≤ k)', f(Math.min(1, cdf))], ['P(X ≥ k)', f(Math.max(0, 1 - cdf + pm(k)))], ['Mean np', f(n * p)], ['Variance np(1−p)', f(n * p * (1 - p))], ['Standard deviation', f(Math.sqrt(n * p * (1 - p)))]], steps: [S('Binomial formula', 'P(X = k) = nCk × pᵏ × (1−p)ⁿ⁻ᵏ'), S('Put the numbers in', C.core.combinations(n, k) + ' × ' + f(p) + sup(k) + ' × ' + f(1 - p) + sup(n - k) + ' = ' + f(pm(k)))] };
  });
  T('Statistics', 'means', 'Types of average', [['list', 'Positive numbers', '2 4 8 16']], v => {
    const a = L(v.list, 'the numbers'), n = a.length, am = a.reduce((x, y) => x + y, 0) / n, qm = Math.sqrt(a.reduce((x, y) => x + y * y, 0) / n), s = C.describe(a);
    const rows = [['Arithmetic mean', f(am)], ['Quadratic mean (RMS)', f(qm)], ['Median', f(s.median)]];
    if (a.every(x => x > 0)) rows.splice(1, 0, ['Geometric mean', f(Math.exp(a.reduce((x, y) => x + Math.log(y), 0) / n))], ['Harmonic mean', f(n / a.reduce((x, y) => x + 1 / y, 0))]);
    return { headline: 'Arithmetic mean = ' + f(am), rows, steps: [S('Arithmetic mean', 'sum ÷ n'), S('Geometric mean', 'ⁿ√(product of the numbers), good for growth rates'), S('Harmonic mean', 'n ÷ (1/x₁ + 1/x₂ + …), good for averaging rates such as speed'), S('Quadratic mean', '√((x₁² + x₂² + …) ÷ n)')] };
  });

  /* ===== Finance ===== */
  T('Finance', 'interest', 'Simple and compound interest', [['P', 'Principal', '1000'], ['r', 'Yearly rate (%)', '5'], ['t', 'Years', '10'], ['n', 'Times compounded per year', '12']], v => {
    const P = N(v.P, 'the principal'), r = N(v.r, 'the rate') / 100, t = N(v.t, 'the years'), n = I(v.n, 'the compounds per year', 1, 3650);
    const si = P * r * t, A = P * Math.pow(1 + r / n, n * t), eff = Math.pow(1 + r / n, n) - 1;
    return { headline: 'After ' + f(t) + ' years: ' + f(A), rows: [['Simple interest P r t', f(si)], ['Simple amount', f(P + si)], ['Compound amount', f(A)], ['Compound interest earned', f(A - P)], ['Effective yearly rate', f(eff * 100) + '%'], ['Continuous compounding Pe^(rt)', f(P * Math.exp(r * t))]], steps: [S('Simple interest', 'I = P × r × t = ' + f(P) + ' × ' + f(r) + ' × ' + f(t) + ' = ' + f(si)), S('Compound interest', 'A = P(1 + r/n)^(nt) = ' + f(P) + ' × (1 + ' + f(r) + '/' + n + ')^(' + n + ' × ' + f(t) + ') = ' + f(A))] };
  });
  T('Finance', 'loan', 'Loan payment (EMI)', [['P', 'Loan amount', '200000'], ['r', 'Yearly rate (%)', '6.5'], ['y', 'Years', '20']], v => {
    const P = N(v.P, 'the loan amount'), r = N(v.r, 'the rate') / 1200, nn = Math.round(N(v.y, 'the years') * 12); if (nn < 1) throw new Error('Use at least one month.');
    const pay = r === 0 ? P / nn : P * r * Math.pow(1 + r, nn) / (Math.pow(1 + r, nn) - 1);
    return { headline: 'Monthly payment = ' + f(pay), rows: [['Monthly payment', f(pay)], ['Total paid', f(pay * nn)], ['Total interest', f(pay * nn - P)], ['Number of payments', String(nn)]], steps: [S('Monthly rate and number of payments', 'i = ' + f(r) + ',  n = ' + nn), S('EMI formula', 'EMI = P × i × (1 + i)ⁿ ÷ ((1 + i)ⁿ − 1) = ' + f(pay))] };
  });

  /* ===== Sequences and vectors ===== */
  T('Sequences and vectors', 'arith', 'Arithmetic sequence', [['a', 'First term a₁', '3'], ['d', 'Common difference d', '4'], ['n', 'Term number n', '20']], v => {
    const a = N(v.a, 'a₁'), d = N(v.d, 'd'), n = I(v.n, 'n', 1, 1e9), an = a + (n - 1) * d, sn = n * (a + an) / 2;
    return { headline: 'a' + n + ' = ' + f(an) + ',  S' + n + ' = ' + f(sn), rows: [['nth term', f(an)], ['Sum of n terms', f(sn)], ['First terms', Array.from({ length: Math.min(n, 10) }, (_, i) => f(a + i * d)).join(', ') + (n > 10 ? ', …' : '')]], steps: [S('nth term: aₙ = a₁ + (n − 1)d', f(a) + ' + ' + (n - 1) + ' × ' + f(d) + ' = ' + f(an)), S('Sum: Sₙ = n(a₁ + aₙ) ÷ 2', n + ' × (' + f(a) + ' + ' + f(an) + ') ÷ 2 = ' + f(sn))] };
  });
  T('Sequences and vectors', 'geom', 'Geometric sequence', [['a', 'First term a₁', '2'], ['r', 'Common ratio r', '3'], ['n', 'Term number n', '10']], v => {
    const a = N(v.a, 'a₁'), r = N(v.r, 'r'), n = I(v.n, 'n', 1, 5000), an = a * Math.pow(r, n - 1), sn = r === 1 ? a * n : a * (1 - Math.pow(r, n)) / (1 - r);
    const rows = [['nth term', f(an)], ['Sum of n terms', f(sn)], ['First terms', Array.from({ length: Math.min(n, 8) }, (_, i) => f(a * Math.pow(r, i))).join(', ') + (n > 8 ? ', …' : '')]];
    if (Math.abs(r) < 1) rows.push(['Sum to infinity a₁ ÷ (1 − r)', f(a / (1 - r))]);
    return { headline: 'a' + n + ' = ' + f(an) + ',  S' + n + ' = ' + f(sn), rows, steps: [S('nth term: aₙ = a₁ rⁿ⁻¹', f(a) + ' × ' + f(r) + sup(n - 1) + ' = ' + f(an)), S('Sum: Sₙ = a₁(1 − rⁿ) ÷ (1 − r)', f(sn))] };
  });
  T('Sequences and vectors', 'vectors', 'Vectors (2D and 3D)', [['u', 'Vector u', '1, 2, 3'], ['w', 'Vector v', '4, 5, 6']], v => {
    const u = L(v.u, 'u'), w = L(v.w, 'v'); if (u.length !== w.length || u.length < 2 || u.length > 3) throw new Error('Enter two vectors with the same size, either 2 or 3 numbers each.');
    const dot = u.reduce((s, x, i) => s + x * w[i], 0), mu = Math.hypot.apply(null, u), mw = Math.hypot.apply(null, w), vs = a => '(' + a.map(f).join(', ') + ')';
    const rows = [['u + v', vs(u.map((x, i) => x + w[i]))], ['u − v', vs(u.map((x, i) => x - w[i]))], ['Dot product u · v', f(dot)], ['Length |u|', f(mu)], ['Length |v|', f(mw)]];
    const steps = [S('Dot product', u.map((x, i) => '(' + f(x) + ')(' + f(w[i]) + ')').join(' + ') + ' = ' + f(dot))];
    if (mu && mw) { const c = Math.max(-1, Math.min(1, dot / (mu * mw))); rows.push(['Angle between them', f(ang(Math.acos(c))) + '°'], ['Unit vector of u', vs(u.map(x => x / mu))], ['Projection of u onto v', vs(w.map(x => x * dot / (mw * mw)))]); steps.push(S('Angle', 'cos θ = u·v ÷ (|u||v|) = ' + f(c) + ',  θ = ' + f(ang(Math.acos(c))) + '°')); }
    if (u.length === 3) { const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; rows.push(['Cross product u × v', vs(cr)], ['Area of parallelogram', f(Math.hypot.apply(null, cr))]); steps.push(S('Cross product', '(u₂v₃ − u₃v₂, u₃v₁ − u₁v₃, u₁v₂ − u₂v₁) = ' + vs(cr))); }
    return { headline: 'u · v = ' + f(dot), rows, steps };
  });

  /* ===== Elementary functions ===== */
  T('Functions of x', 'elem', 'All elementary functions of x', [['x', 'x', '0.5'], ['mode', 'Angles in', 'radians', SEL('radians', 'degrees')]], v => {
    const x = N(v.x, 'x'), deg = v.mode === 'degrees', t = deg ? x * Math.PI / 180 : x, M = Math, rows = [];
    const add = (n, val) => rows.push([n, Number.isFinite(val) && Math.abs(val) < 1e15 ? f(val) : (Number.isNaN(val) ? 'not a real number' : String(val).replace('Infinity', '∞'))]);
    add('sin x', M.sin(t)); add('cos x', M.cos(t)); add('tan x', M.tan(t)); add('sec x', 1 / M.cos(t)); add('csc x', 1 / M.sin(t)); add('cot x', 1 / M.tan(t));
    const back = r => deg ? ang(r) : r; add('sin⁻¹ x' + (deg ? ' (in degrees)' : ''), back(M.asin(x))); add('cos⁻¹ x', back(M.acos(x))); add('tan⁻¹ x', back(M.atan(x)));
    add('sinh x', M.sinh(x)); add('cosh x', M.cosh(x)); add('tanh x', M.tanh(x)); add('sinh⁻¹ x', M.asinh(x)); add('cosh⁻¹ x', M.acosh(x)); add('tanh⁻¹ x', M.atanh(x));
    add('eˣ', M.exp(x)); add('2ˣ', M.pow(2, x)); add('10ˣ', M.pow(10, x)); add('ln x', M.log(x)); add('log₁₀ x', M.log10(x)); add('log₂ x', M.log2(x));
    add('√x', M.sqrt(x)); add('∛x', M.cbrt(x)); add('x²', x * x); add('x³', x ** 3); add('1 ÷ x', 1 / x); add('|x|', M.abs(x)); add('sign of x', M.sign(x));
    add('floor', M.floor(x)); add('ceiling', M.ceil(x)); add('round', M.round(x)); add('fractional part', x - M.trunc(x));
    try { add('erf x', erf(x)); add('Γ(x) gamma', C.core.gamma(x)); if (Number.isInteger(x) && x >= 0 && x <= 170) add('x!', C.core.factorial(x)); } catch (e) { /* skip special functions that do not apply */ }
    return { headline: 'Values of every function at x = ' + f(x) + (deg ? '°' : ' rad'), rows, steps: [] };
  });

  /* =========================================================
     Tool UI
     ========================================================= */
  const CATEGORIES = Array.from(new Set(TOOLS.map(t => t.cat))).concat(['Function library']);
  let cat = U.store.get('toolCat', CATEGORIES[0]), tool = null;
  if (CATEGORIES.indexOf(cat) < 0) cat = CATEGORIES[0];
  const catBox = el('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Tool category' });
  const toolBox = el('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Tool' });
  const formBox = el('div'), outBox = el('div', { 'aria-live': 'polite' }), libBox = el('div', { class: 'stack' });
  CATEGORIES.forEach(c => catBox.appendChild(el('button', { class: 'chip', type: 'button', role: 'radio', 'data-id': c, 'aria-checked': 'false', text: c, onclick: () => { cat = c; U.store.set('toolCat', c); tool = null; paint(); } })));
  root.appendChild(el('div', { class: 'stack' }, [el('div', { class: 'card solve-input' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'Maths tools' }), el('span', { class: 'hint', text: TOOLS.length + ' calculators with steps, plus a library of every function' })]), catBox, toolBox]), formBox, outBox, libBox]));

  function paint() {
    catBox.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-checked', b.dataset.id === cat ? 'true' : 'false'));
    toolBox.replaceChildren(); formBox.replaceChildren(); outBox.replaceChildren(); libBox.replaceChildren();
    if (cat === 'Function library') { toolBox.hidden = true; buildLib(); return; }
    toolBox.hidden = false;
    const list = TOOLS.filter(t => t.cat === cat);
    if (!tool || tool.cat !== cat) tool = list[0];
    list.forEach(t => toolBox.appendChild(el('button', { class: 'chip', type: 'button', role: 'radio', 'aria-checked': t.id === tool.id ? 'true' : 'false', text: t.name, onclick: () => { tool = t; paint(); } })));
    buildForm();
  }
  function buildForm() {
    const inputs = {}, fields = el('div', { class: 'fields' });
    tool.fields.forEach(([id, label, def, o]) => {
      let inp;
      if (o && o.opts) { inp = el('select', { class: 'in', id: 'tl-' + id }, o.opts.map(x => el('option', { value: x[0], text: x[1] }))); inp.value = def; }
      else if (o && o.area) { inp = el('textarea', { class: 'in', id: 'tl-' + id, rows: 5, spellcheck: 'false' }); inp.value = def; }
      else { inp = el('input', { class: 'in', id: 'tl-' + id, value: def, spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off' }); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } }); }
      inputs[id] = inp; fields.appendChild(el('div', { class: 'field' + (o && o.area ? ' wide' : '') }, [el('label', { for: 'tl-' + id, text: label }), inp]));
    });
    function go() {
      outBox.replaceChildren();
      const vals = {}; for (const k in inputs) vals[k] = inputs[k].value;
      let r;
      try { r = tool.run(vals); } catch (e) { outBox.appendChild(el('div', { class: 'card err-card' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'Check the input' })]), el('p', { text: C.friendlyError(e) })])); return; }
      const col = el('div', { class: 'stack', style: 'margin-top:14px' });
      col.appendChild(U.renderAnswers({ headline: r.headline, answers: r.rows.map(x => ({ lhs: x[0], exact: x[1], approx: null, note: x[2] || '' })) }));
      if (r.steps && r.steps.length) col.appendChild(el('div', { class: 'card' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'How it works' })]), U.renderSteps(r.steps)]));
      outBox.appendChild(col);
    }
    formBox.appendChild(el('div', { class: 'card solve-input', style: 'margin-top:14px' }, [el('div', { class: 'card-h' }, [el('h3', { text: tool.name })]), tool.desc ? el('p', { class: 'hint', text: tool.desc }) : null, fields, el('div', { class: 'act-row' }, [el('button', { class: 'btn primary', type: 'button', text: 'Calculate', onclick: go })])]));
    go();
  }

  /* ----- function library built from math.js's own documentation ----- */
  let libItems = null;
  function loadLib() {
    if (libItems) return libItems;
    libItems = [];
    Object.keys(C.core).forEach(k => {
      if (typeof C.core[k] !== 'function' || !/^[a-z]/i.test(k)) return;
      let d; try { d = C.core.help(k).doc; } catch (e) { d = null; }
      if (d && d.description && d.category) { d = Object.assign({}, d, { description: [].concat(d.description).join(' '), category: String(d.category), syntax: [].concat(d.syntax || []), examples: [].concat(d.examples || []), seealso: [].concat(d.seealso || []) }); libItems.push(d); }
    });
    libItems.sort((a, b) => a.name.localeCompare(b.name));
    return libItems;
  }
  function buildLib() {
    const items = loadLib(), cats = Array.from(new Set(items.map(i => i.category))).sort();
    let fc = 'All', q = '', shown = 60, cur = null;
    const search = el('input', { class: 'in', type: 'search', placeholder: 'Search ' + items.length + ' functions, e.g. gcd, sine, matrix, median', 'aria-label': 'Search functions', spellcheck: 'false', autocomplete: 'off' });
    const chips = el('div', { class: 'chips' }), list = el('div', { class: 'fnlist' }), detail = el('div', { class: 'card', hidden: true });
    function chipsPaint() { chips.replaceChildren(); ['All'].concat(cats).forEach(c => chips.appendChild(el('button', { class: 'chip', type: 'button', 'aria-pressed': c === fc ? 'true' : 'false', text: c === 'All' ? 'All (' + items.length + ')' : c + ' (' + items.filter(i => i.category === c).length + ')', onclick: () => { fc = c; shown = 60; chipsPaint(); listPaint(); } }))); }
    function listPaint() {
      list.replaceChildren();
      const ql = q.toLowerCase(), m = items.filter(i => (fc === 'All' || i.category === fc) && (!ql || i.name.toLowerCase().indexOf(ql) >= 0 || i.description.toLowerCase().indexOf(ql) >= 0));
      m.slice(0, shown).forEach(i => list.appendChild(el('button', { class: 'fnitem', type: 'button', 'aria-current': cur === i ? 'true' : 'false', onclick: () => { cur = i; showDetail(i); listPaint(); } }, [el('b', { text: i.name }), el('span', { text: i.description })])));
      if (m.length > shown) list.appendChild(el('button', { class: 'btn', type: 'button', text: 'Show more (' + (m.length - shown) + ' left)', onclick: () => { shown += 80; listPaint(); } }));
      if (!m.length) list.appendChild(el('p', { class: 'empty', text: 'No function matches that search.' }));
    }
    function forCalc(ex) { return ex.replace(/\blog\(([^()]*,[^()]*)\)/g, 'logb($1)').replace(/\blog\(/g, 'ln('); }
    function showDetail(d) {
      detail.hidden = false; detail.replaceChildren(el('div', { class: 'card-h' }, [el('h3', { text: d.name }), el('span', { class: 'eyebrow', text: d.category })]), el('p', { text: d.description }));
      if (d.name === 'log') detail.appendChild(el('p', { class: 'snote', text: 'In this library log(x) is the natural logarithm. On the Calculator keypad, log is base 10 and ln is natural.' }));
      if (d.syntax && d.syntax.length) { detail.appendChild(el('div', { class: 'group-h', style: 'margin-top:12px', text: 'How to write it' })); d.syntax.forEach(s => detail.appendChild(el('div', { class: 'mline', text: s }))); }
      if (d.examples && d.examples.length) {
        detail.appendChild(el('div', { class: 'group-h', style: 'margin-top:12px', text: 'Examples (angles in radians here)' }));
        d.examples.forEach(ex => {
          let res = ''; try { const r = C.core.evaluate(ex); res = C.core.format(r, { precision: 10 }); } catch (e) { res = ''; }
          detail.appendChild(el('div', { class: 'exrow' }, [el('code', { text: ex }), res ? el('span', { class: 'exr', text: '→ ' + res.replace(/\s+/g, ' ').slice(0, 160) }) : null, el('button', { class: 'btn small', type: 'button', text: 'Use in calculator', onclick: () => { U.showTab('calc'); if (U.calcRun) U.calcRun(forCalc(ex)); } })]));
        });
      }
      if (d.seealso && d.seealso.length) detail.appendChild(el('p', { class: 'hint', style: 'margin-top:12px', text: 'See also: ' + d.seealso.join(', ') }));
    }
    search.addEventListener('input', () => { q = search.value.trim(); shown = 60; listPaint(); });
    libBox.appendChild(el('div', { class: 'card solve-input', style: 'margin-top:14px' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'Function library' }), el('span', { class: 'hint', text: 'Every function the calculator understands' })]), search, chips, list]));
    libBox.appendChild(detail);
    chipsPaint(); listPaint();
    if (items.length) { cur = items.find(i => i.name === 'gcd') || items[0]; showDetail(cur); listPaint(); }
  }
  paint();
})(globalThis.MB = globalThis.MB || {});
