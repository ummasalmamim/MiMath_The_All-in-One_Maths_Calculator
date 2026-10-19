/* MiMath engine: equation, system and inequality solvers with worked steps */
(function (MB) {
  'use strict';
  var C = MB.core, core = C.core, norm = C.norm, toNerd = C.toNerd, fmt = C.fmt, pretty = C.pretty, fnAt = C.fnAt,
    nodeVars = C.nodeVars, countVar = C.countVar, splitEq = C.splitEq, friendlyError = C.friendlyError,
    gcd = C.gcd, fracStr = C.fracStr, bestFraction = C.bestFraction;

  function S(t, m, n) { return { t: t, m: [].concat(m || []), n: n || '' }; }
  function strN(n) { return n.toString({ parenthesis: 'auto', implicit: 'show' }); }
  function parseOrThrow(s) { try { return core.parse(s); } catch (e) { throw new Error(friendlyError(e)); } }
  function varSub(expr, from, to) { return from === to ? expr : expr.replace(new RegExp('\\b' + from + '\\b', 'g'), to); }

  function constRational(v) {
    for (var d = 1; d <= 12; d++) { var n = Math.round(v * d); if (Math.abs(v - n / d) < 1e-12 * Math.max(1, Math.abs(v))) return fracStr(n, d); }
    return null;
  }
  function piForm(v) {
    var r = v / Math.PI;
    for (var d = 1; d <= 24; d++) {
      var n = Math.round(r * d);
      if (n !== 0 && Math.abs(r - n / d) < 1e-10) {
        var g = gcd(n, d); n /= g; var dd = d / g;
        return (n < 0 ? '-' : '') + (Math.abs(n) === 1 ? '' : Math.abs(n) + '*') + 'pi' + (dd === 1 ? '' : '/' + dd);
      }
    }
    return null;
  }
  function niceExpr(s) {
    try {
      var hasVar = true;
      try { hasVar = nodeVars(core.parse(norm(s))).size > 0; } catch (e0) { hasVar = true; }
      if (!hasVar) {
        var v0 = fnAt(s, {});
        if (Number.isFinite(v0)) {
          var cr = constRational(v0);
          if (cr !== null) return (/\./.test(s) && /\//.test(cr)) ? fmt(v0, 10) : cr;
          var pf = /asin|acos|atan|pi/.test(s) ? piForm(v0) : null;
          if (pf) return pf;
        }
      }
      var r = nerdamer(toNerd(s)).toString();
      if (/\d{8,}/.test(r)) return s;
      if (/\d\.\d{6,}/.test(r) || /\^\(-/.test(r) || /Infinity|NaN|#|Si\(|Ci\(/i.test(r)) return s;
      if (/^-?\d+\/\d+$/.test(r) && /\d\.\d/.test(s)) { var v = fnAt(s, {}); if (isFinite(v)) return fmt(v, 10); }
      return r;
    } catch (e) { return s; }
  }

  /* ---------- polynomial utilities ---------- */
  function coefTxt(a, forTerm) {
    if (Number.isInteger(a)) return String(a);
    var f = bestFraction(a, 1000, 1e-10);
    return f ? (forTerm ? '(' + f.n + '/' + f.d + ')' : f.n + '/' + f.d) : fmt(a, 8);
  }
  function polyStr(asc, v) {
    var out = '';
    for (var i = asc.length - 1; i >= 0; i--) {
      var c = asc[i]; if (Math.abs(c) < 1e-12) continue;
      var neg = c < 0, a = Math.abs(c), term;
      if (i === 0) term = coefTxt(a, false);
      else term = (Math.abs(a - 1) < 1e-12 ? '' : coefTxt(a, true)) + (i === 1 ? v : v + '^' + i);
      out += out === '' ? (neg ? '-' : '') + term : (neg ? ' - ' : ' + ') + term;
    }
    return out || '0';
  }
  function polyCoeffs(fStr, v) {
    try {
      var expanded = nerdamer('expand(' + toNerd(fStr) + ')').toString();
      var cs = nerdamer.coeffs(expanded, v).toString().trim().replace(/^\[/, '').replace(/\]$/, '');
      var arr = C.splitTop(cs, ',').map(function (s) { return fnAt(s, {}); });
      if (!arr.length || arr.some(function (x) { return !Number.isFinite(x); })) return null;
      var tests = [-2.1, -0.6, 0.9, 1.7, 3.3];
      for (var t = 0; t < tests.length; t++) {
        var x = tests[t], p = 0;
        for (var i = 0; i < arr.length; i++) p += arr[i] * Math.pow(x, i);
        var sc = {}; sc[v] = x;
        var f = fnAt(fStr, sc);
        if (!Number.isFinite(f) || Math.abs(p - f) > 1e-6 * Math.max(1, Math.abs(f))) return null;
      }
      while (arr.length > 1 && Math.abs(arr[arr.length - 1]) < 1e-12) arr.pop();
      return arr;
    } catch (e) { return null; }
  }
  function toInts(asc) {
    var fr = asc.map(function (c) { return Number.isInteger(c) ? { n: c, d: 1 } : bestFraction(c, 1000, 1e-10); });
    if (fr.some(function (f) { return !f; })) return null;
    var L = fr.reduce(function (l, f) { return l / gcd(l, f.d) * f.d; }, 1);
    var ints = fr.map(function (f) { return f.n * (L / f.d); });
    var g = ints.reduce(function (a, b) { return gcd(a, b); }, 0) || 1;
    ints = ints.map(function (x) { return x / g; });
    return ints.some(function (x) { return Math.abs(x) > 1e9; }) ? null : ints;
  }
  function sqFree(n) {
    var s = 1, r = n;
    for (var p = 2; p * p <= r; p++) { while (r % (p * p) === 0) { r /= p * p; s *= p; } }
    return [s, r];
  }
  function quadExact(a, b, c) {
    var D = b * b - 4 * a * c, two = 2 * a;
    if (D === 0) return { D: D, kind: 'double', roots: [{ s: fracStr(-b, two), v: -b / two, im: 0 }], pm: fracStr(-b, two) };
    var si = Math.round(Math.sqrt(Math.abs(D)));
    if (D > 0 && si * si === D) {
      return {
        D: D, kind: 'rational',
        roots: [{ s: fracStr(-b + si, two), v: (-b + si) / two, im: 0 }, { s: fracStr(-b - si, two), v: (-b - si) / two, im: 0 }],
        pm: ''
      };
    }
    var sf = sqFree(Math.abs(D)), s = sf[0], r = sf[1];
    var g = gcd(gcd(Math.abs(b), s), Math.abs(two)) || 1;
    var bb = -b / g, ss = s / g, dd = two / g;
    if (dd < 0) { dd = -dd; bb = -bb; }
    var sPart = ss === 1 ? '' : String(ss);
    var rad = D > 0 ? sPart + '√' + r : (r === 1 ? sPart + 'i' : sPart + '√' + r + 'i');
    var mk = function (sign) {
      var N = bb === 0 ? (sign > 0 ? rad : '-' + rad) : bb + (sign > 0 ? ' + ' : ' - ') + rad;
      return dd === 1 ? N : (bb === 0 ? N : '(' + N + ')') + '/' + dd;
    };
    var Npm = bb === 0 ? '±' + rad : bb + ' ± ' + rad;
    var pm = dd === 1 ? Npm : (bb === 0 ? Npm : '(' + Npm + ')') + '/' + dd;
    var root = Math.sqrt(r) * ss / dd, re = bb / dd;
    if (D > 0) {
      return { D: D, kind: 'irrational', pm: pm, roots: [{ s: mk(1), v: re + root, im: 0 }, { s: mk(-1), v: re - root, im: 0 }] };
    }
    return { D: D, kind: 'complex', pm: pm, roots: [{ s: mk(1), v: re, im: root }, { s: mk(-1), v: re, im: -root }] };
  }
  function divisors(n) {
    n = Math.abs(n); var out = [];
    for (var i = 1; i * i <= n; i++) if (n % i === 0) { out.push(i); if (i !== n / i) out.push(n / i); }
    return out;
  }
  function evalInt(asc, p, q) {
    var n = asc.length - 1, s = 0;
    for (var i = 0; i <= n; i++) s += asc[i] * Math.pow(p, i) * Math.pow(q, n - i);
    return s;
  }
  function deflate(asc, p, q) {
    var rem = asc.slice().reverse(), out = [], n = rem.length;
    for (var i = 0; i < n - 1; i++) {
      var coef = rem[i] / q;
      if (Math.abs(coef - Math.round(coef)) > 1e-9) return null;
      coef = Math.round(coef);
      out.push(coef); rem[i] -= coef * q; rem[i + 1] += coef * p;
    }
    return out.reverse();
  }
  function findRationalRoot(asc) {
    var n = asc.length - 1;
    if (asc[0] === 0) return { p: 0, q: 1 };
    var ps = divisors(asc[0]), qs = divisors(asc[n]), cands = [];
    if (ps.length * qs.length > 4000) return null;
    ps.forEach(function (p) { qs.forEach(function (q) { cands.push({ p: p, q: q }); cands.push({ p: -p, q: q }); }); });
    cands.sort(function (a, b) { return Math.abs(a.p / a.q) - Math.abs(b.p / b.q); });
    for (var i = 0; i < cands.length; i++) if (evalInt(asc, cands[i].p, cands[i].q) === 0) return cands[i];
    return null;
  }
  function factorTxt(p, q, v) {
    var lin = q === 1 ? v : q + v;
    return p === 0 ? lin : lin + (p > 0 ? ' - ' + p : ' + ' + (-p));
  }
  function polyRootsNum(asc) {
    var n = asc.length - 1; if (n < 1) return [];
    var a = asc.map(function (c) { return c / asc[n]; });
    var R = 1 + Math.max.apply(null, a.slice(0, n).map(Math.abs));
    var roots = [];
    for (var k = 0; k < n; k++) { var ang = 2 * Math.PI * k / n + 0.4; roots.push({ re: R * 0.5 * Math.cos(ang), im: R * 0.5 * Math.sin(ang) }); }
    var mul = function (p, q) { return { re: p.re * q.re - p.im * q.im, im: p.re * q.im + p.im * q.re }; };
    var sub = function (p, q) { return { re: p.re - q.re, im: p.im - q.im }; };
    var div = function (p, q) { var d = q.re * q.re + q.im * q.im; return { re: (p.re * q.re + p.im * q.im) / d, im: (p.im * q.re - p.re * q.im) / d }; };
    var evalP = function (z) { var r = { re: a[n], im: 0 }; for (var i = n - 1; i >= 0; i--) { var m = mul(r, z); r = { re: m.re + a[i], im: m.im }; } return r; };
    for (var it = 0; it < 800; it++) {
      var delta = 0;
      for (var i = 0; i < n; i++) {
        var den = { re: 1, im: 0 };
        for (var j = 0; j < n; j++) if (j !== i) den = mul(den, sub(roots[i], roots[j]));
        var dz = div(evalP(roots[i]), den);
        roots[i] = sub(roots[i], dz); delta = Math.max(delta, Math.hypot(dz.re, dz.im));
      }
      if (delta < 1e-14) break;
    }
    return roots.map(function (z) { return { re: Math.abs(z.re) < 1e-9 ? 0 : z.re, im: Math.abs(z.im) < 1e-8 ? 0 : z.im }; })
      .sort(function (p, q) { return (p.re - q.re) || (p.im - q.im); });
  }
  /* exact roots of an integer polynomial (ascending) using the rational root theorem */
  function solvePolyExact(ints, v) {
    var cur = ints.slice(), steps = [], roots = [];
    while (cur.length - 1 >= 3) {
      var rr = findRationalRoot(cur); if (!rr) break;
      var q = deflate(cur, rr.p, rr.q); if (!q) break;
      var r = fracStr(rr.p, rr.q);
      steps.push(S('Try a rational root: x = ' + r,
        ['P(' + r + ') = 0, so (' + factorTxt(rr.p, rr.q, v) + ') is a factor', 'P(' + v + ') = (' + factorTxt(rr.p, rr.q, v) + ')(' + polyStr(q, v) + ')'],
        'Rational root theorem: a rational root p/q has p dividing the constant term and q dividing the leading coefficient.'));
      roots.push({ s: r, v: rr.p / rr.q, im: 0 }); cur = q;
    }
    var deg = cur.length - 1;
    if (deg === 2) {
      var qe = quadExact(cur[2], cur[1], cur[0]);
      var lines = [polyStr(cur, v) + ' = 0', 'Δ = b² − 4ac = ' + qe.D];
      if (qe.pm) lines.push(v + ' = ' + qe.pm);
      steps.push(S('Solve the remaining quadratic', lines));
      roots = roots.concat(qe.roots);
    } else if (deg === 1) {
      roots.push({ s: fracStr(-cur[0], cur[1]), v: -cur[0] / cur[1], im: 0 });
    } else if (deg >= 3) {
      var nr = polyRootsNum(cur);
      steps.push(S('No more rational roots', 'The remaining degree-' + deg + ' factor ' + polyStr(cur, v) + ' has no rational roots, so its roots are found numerically.'));
      nr.forEach(function (z) { roots.push({ s: C.fmtC(z, 8), v: z.re, im: z.im, approx: true }); });
    }
    return { roots: roots, steps: steps };
  }

  /* ---------- numeric root scanning ---------- */
  function sampleGrid(R, N) {
    var xs = [], lim = Math.log(R + 1);
    for (var i = 0; i <= N; i++) { var u = -lim + 2 * lim * i / N; xs.push(Math.sign(u) * (Math.exp(Math.abs(u)) - 1)); }
    return xs;
  }
  function refineRoot(f, a, b, fa) {
    for (var i = 0; i < 200; i++) {
      var m = (a + b) / 2, fm = f(m);
      if (!Number.isFinite(fm)) return null;
      if (fm === 0) return m;
      if ((fa < 0) === (fm < 0)) { a = m; fa = fm; } else { b = m; }
      if (Math.abs(b - a) < 1e-14 * Math.max(1, Math.abs(a))) break;
    }
    return (a + b) / 2;
  }
  function minAbs(f, a, b) {
    var g = (Math.sqrt(5) - 1) / 2, c = b - g * (b - a), d = a + g * (b - a);
    for (var i = 0; i < 120; i++) {
      if (Math.abs(f(c)) < Math.abs(f(d))) b = d; else a = c;
      c = b - g * (b - a); d = a + g * (b - a);
    }
    return (a + b) / 2;
  }
  function dedupe(xs) {
    xs.sort(function (a, b) { return a - b; });
    return xs.filter(function (x, i) { return i === 0 || Math.abs(x - xs[i - 1]) > 1e-8 * Math.max(1, Math.abs(x)); });
  }
  function scanRoots(f, R, N) {
    var xs = sampleGrid(R || 100, N || 6000), ys = xs.map(f), roots = [];
    for (var i = 0; i < xs.length; i++) {
      var y0 = ys[i], y1 = ys[i + 1];
      if (!Number.isFinite(y0)) continue;
      if (y0 === 0) { roots.push(xs[i]); continue; }
      if (i === xs.length - 1 || !Number.isFinite(y1)) continue;
      if ((y0 < 0) !== (y1 < 0) && y1 !== 0) {
        var r = refineRoot(f, xs[i], xs[i + 1], y0);
        if (r !== null && Math.abs(f(r)) < 1e-5) roots.push(r);
      } else if (i > 0 && Number.isFinite(ys[i - 1]) && Math.abs(y0) < Math.abs(ys[i - 1]) && Math.abs(y0) <= Math.abs(y1) &&
        Math.abs(y0) < 1e-3 && (ys[i - 1] < 0) === (y0 < 0) && (y1 < 0) === (y0 < 0)) {
        var t = minAbs(f, xs[i - 1], xs[i + 1]);
        if (Math.abs(f(t)) < 1e-9) roots.push(t);
      }
    }
    return dedupe(roots);
  }

  /* ---------- equation solver ---------- */
  function isolate(A0, rhs0, v, steps, origF) {
    var A = A0, br = [{ rhs: rhs0, per: null }], principal = false, trig = false;
    var has = function (n) { return countVar(n, v) > 0; };
    var rec = function (title, node, note) {
      steps.push(S(title, br.map(function (b) { return strN(node) + ' = ' + b.rhs; }).join('     or     '), note));
    };
    var mapR = function (f) { br = br.map(function (b) { return { rhs: niceExpr(f(b.rhs)), per: b.per }; }); };
    var scalePer = function (f) { br.forEach(function (b) { if (b.per) b.per = niceExpr(f(b.per)); }); };
    var killPer = function () { if (br.some(function (b) { return b.per; })) principal = true; br.forEach(function (b) { b.per = null; }); };
    var fail = function (msg) { return { ok: false, msg: msg }; };
    var none = function (msg) { return { ok: false, none: true, msg: msg }; };
    for (var g = 0; g < 40; g++) {
      if (A.isParenthesisNode) { A = A.content; continue; }
      if (A.isSymbolNode && A.name === v) break;
      var u, c, title;
      if (A.isOperatorNode && A.args.length === 1 && A.op === '-') {
        u = A.args[0]; mapR(function (r) { return '-(' + r + ')'; }); A = u; rec('Multiply both sides by −1', u); continue;
      }
      if (A.isOperatorNode && A.args.length === 2) {
        var a0 = A.args[0], a1 = A.args[1], op = A.op;
        if (op === '+') {
          if (has(a0) === has(a1)) return fail('multi');
          u = has(a0) ? a0 : a1; c = has(a0) ? a1 : a0;
          mapR(function (r) { return '(' + r + ')-(' + strN(c) + ')'; }); A = u;
          rec('Subtract ' + pretty(strN(c)) + ' from both sides', u); continue;
        }
        if (op === '-') {
          if (has(a0) === has(a1)) return fail('multi');
          if (has(a0)) { c = a1; u = a0; mapR(function (r) { return '(' + r + ')+(' + strN(c) + ')'; }); A = u; rec('Add ' + pretty(strN(c)) + ' to both sides', u); }
          else { c = a0; u = a1; mapR(function (r) { return '(' + strN(c) + ')-(' + r + ')'; }); A = u; rec('Move ' + pretty(strN(c)) + ' to the right, then solve for ' + strN(u), u); }
          continue;
        }
        if (op === '*') {
          if (has(a0) === has(a1)) return fail('multi');
          u = has(a0) ? a0 : a1; c = has(a0) ? a1 : a0;
          if (fnAt(strN(c), {}) === 0) return fail('multi');
          mapR(function (r) { return '(' + r + ')/(' + strN(c) + ')'; }); scalePer(function (p) { return '(' + p + ')/(' + strN(c) + ')'; });
          A = u; rec('Divide both sides by ' + pretty(strN(c)), u); continue;
        }
        if (op === '/') {
          if (has(a0) === has(a1)) return fail('multi');
          if (has(a0)) {
            c = a1; u = a0; mapR(function (r) { return '(' + r + ')*(' + strN(c) + ')'; }); scalePer(function (p) { return '(' + p + ')*(' + strN(c) + ')'; });
            A = u; rec('Multiply both sides by ' + pretty(strN(c)), u);
          } else {
            c = a0; u = a1; killPer(); mapR(function (r) { return '(' + strN(c) + ')/(' + r + ')'; });
            A = u; rec('Swap the denominator and the right side', u, 'From c/u = r we get u = c/r (r must not be 0).');
          }
          continue;
        }
        if (op === '^') {
          if (has(a0) && !has(a1)) {
            var e = a1, en = fnAt(strN(e), {});
            killPer(); u = a0;
            if (Number.isInteger(en) && en % 2 === 0) {
              br = br.reduce(function (acc, b) {
                var rv = fnAt(b.rhs, {});
                if (en === 2 && Number.isFinite(rv) && rv < 0) {
                  var im = niceExpr('sqrt(-(' + b.rhs + '))*i');
                  return acc.concat([{ rhs: im, per: null }, { rhs: niceExpr('-(' + im + ')'), per: null }]);
                }
                if (en === 2) return acc.concat([{ rhs: niceExpr('sqrt(' + b.rhs + ')'), per: null }, { rhs: niceExpr('-sqrt(' + b.rhs + ')'), per: null }]);
                return acc.concat([{ rhs: niceExpr('(' + b.rhs + ')^(1/' + en + ')'), per: null }, { rhs: niceExpr('-(' + b.rhs + ')^(1/' + en + ')'), per: null }]);
              }, []);
              title = en === 2 ? 'Take the square root of both sides (±)' : 'Take the ' + en + 'th root of both sides (±)';
              A = u; rec(title, u, 'An even power loses the sign, so there are two roots.'); continue;
            }
            if (Number.isInteger(en) && en % 2 === 1) {
              mapR(function (r) { var rv = fnAt(r, {}); return (Number.isFinite(rv) && rv < 0) ? '-((-(' + r + '))^(1/' + en + '))' : '(' + r + ')^(1/' + en + ')'; });
              A = u; rec('Take the ' + (en === 3 ? 'cube' : en + 'th') + ' root of both sides', u); continue;
            }
            mapR(function (r) { return '(' + r + ')^(1/(' + strN(e) + '))'; });
            A = u; rec('Raise both sides to the power 1/(' + pretty(strN(e)) + ')', u, 'This assumes the right side is positive.'); continue;
          }
          if (!has(a0) && has(a1)) {
            var isE = a0.isSymbolNode && a0.name === 'e';
            var bl = fnAt(strN(a0), {});
            killPer();
            if (Number.isFinite(bl) && bl <= 0) return fail('multi');
            for (var q = 0; q < br.length; q++) {
              var rv2 = fnAt(br[q].rhs, {});
              if (Number.isFinite(rv2) && rv2 <= 0) return none('An exponential ' + pretty(strN(A)) + ' is always positive, so it can never equal ' + fmt(rv2) + '. There is no real solution.');
            }
            u = a1; mapR(function (r) { return isE ? 'log(' + r + ')' : 'log(' + r + ')/log(' + strN(a0) + ')'; });
            A = u; rec('Take the logarithm of both sides', u, 'a^u = r gives u = ln(r) / ln(a).'); continue;
          }
        }
        return fail('multi');
      }
      if (A.isFunctionNode && A.args.length === 1 && has(A.args[0])) {
        var name = A.fn.name, arg = A.args[0], nums = br.map(function (b) { return fnAt(b.rhs, {}); });
        var keep = function (pred) { br = br.filter(function (b, i) { return !Number.isFinite(nums[i]) || pred(nums[i]); }); return br.length > 0; };
        u = arg;
        if (name === 'sin') {
          if (!keep(function (x) { return Math.abs(x) <= 1 + 1e-12; })) return none('sin can only take values between −1 and 1, so there is no real solution.');
          if (br.some(function (b) { return b.per; })) principal = true;
          br = br.reduce(function (acc, b) {
            var a = niceExpr('asin(' + b.rhs + ')'), s2 = niceExpr('pi-asin(' + b.rhs + ')');
            acc.push({ rhs: a, per: '2*pi' });
            if (Math.abs(fnAt(a, {}) - fnAt(s2, {})) > 1e-10) acc.push({ rhs: s2, per: '2*pi' });
            return acc;
          }, []);
          trig = true; A = u; rec('Apply the inverse sine', u, 'sin(u) = r has solutions u = sin⁻¹(r) + 2πk and u = π − sin⁻¹(r) + 2πk, for any whole number k.'); continue;
        }
        if (name === 'cos') {
          if (!keep(function (x) { return Math.abs(x) <= 1 + 1e-12; })) return none('cos can only take values between −1 and 1, so there is no real solution.');
          if (br.some(function (b) { return b.per; })) principal = true;
          br = br.reduce(function (acc, b) {
            var a = niceExpr('acos(' + b.rhs + ')'), s2 = niceExpr('-acos(' + b.rhs + ')');
            acc.push({ rhs: a, per: '2*pi' });
            if (Math.abs(fnAt(a, {}) - fnAt(s2, {})) > 1e-10) acc.push({ rhs: s2, per: '2*pi' });
            return acc;
          }, []);
          trig = true; A = u; rec('Apply the inverse cosine', u, 'cos(u) = r has solutions u = ±cos⁻¹(r) + 2πk, for any whole number k.'); continue;
        }
        if (name === 'tan') {
          if (br.some(function (b) { return b.per; })) principal = true;
          br = br.map(function (b) { return { rhs: niceExpr('atan(' + b.rhs + ')'), per: 'pi' }; });
          trig = true; A = u; rec('Apply the inverse tangent', u, 'tan(u) = r has solutions u = tan⁻¹(r) + πk, for any whole number k.'); continue;
        }
        killPer();
        if (name === 'asin') { if (!keep(function (x) { return Math.abs(x) <= Math.PI / 2 + 1e-12; })) return none('The range of sin⁻¹ is −π/2 to π/2, so there is no real solution.'); mapR(function (r) { return 'sin(' + r + ')'; }); title = 'Apply sine to both sides'; }
        else if (name === 'acos') { if (!keep(function (x) { return x >= -1e-12 && x <= Math.PI + 1e-12; })) return none('The range of cos⁻¹ is 0 to π, so there is no real solution.'); mapR(function (r) { return 'cos(' + r + ')'; }); title = 'Apply cosine to both sides'; }
        else if (name === 'atan') { mapR(function (r) { return 'tan(' + r + ')'; }); title = 'Apply tangent to both sides'; }
        else if (name === 'exp') { if (!keep(function (x) { return x > 0; })) return none('e^u is always positive, so there is no real solution.'); mapR(function (r) { return 'log(' + r + ')'; }); title = 'Take the natural logarithm of both sides'; }
        else if (name === 'log') { mapR(function (r) { return 'e^(' + r + ')'; }); title = 'Raise e to both sides (undo ln)'; }
        else if (name === 'log10') { mapR(function (r) { return '10^(' + r + ')'; }); title = 'Raise 10 to both sides (undo log)'; }
        else if (name === 'log2') { mapR(function (r) { return '2^(' + r + ')'; }); title = 'Raise 2 to both sides'; }
        else if (name === 'sqrt') { if (!keep(function (x) { return x >= 0; })) return none('A square root cannot be negative, so there is no real solution.'); mapR(function (r) { return '(' + r + ')^2'; }); title = 'Square both sides'; }
        else if (name === 'cbrt') { mapR(function (r) { return '(' + r + ')^3'; }); title = 'Cube both sides'; }
        else if (name === 'abs') {
          if (!keep(function (x) { return x >= 0; })) return none('An absolute value cannot be negative, so there is no real solution.');
          br = br.reduce(function (acc, b) { acc.push({ rhs: b.rhs, per: null }); if (fnAt(b.rhs, {}) !== 0) acc.push({ rhs: niceExpr('-(' + b.rhs + ')'), per: null }); return acc; }, []);
          title = 'Split the absolute value into two cases';
        }
        else if (name === 'sinh') { mapR(function (r) { return 'asinh(' + r + ')'; }); title = 'Apply inverse sinh'; }
        else return fail('unsupported');
        A = u; rec(title, u, name === 'sqrt' ? 'Squaring can add false solutions, so each answer is checked in the original equation.' : ''); continue;
      }
      return fail('multi');
    }
    if (!(A.isSymbolNode && A.name === v)) return fail('multi');
    return { ok: true, br: br, principal: principal, trig: trig };
  }

  function solveEquation(input, opts) {
    opts = opts || {};
    var parts = splitEq(norm(input)), Ls = parts[0], Rs = parts[1];
    var LN = parseOrThrow(Ls), RN = parseOrThrow(Rs);
    var names = new Set(); nodeVars(LN).forEach(function (n) { names.add(n); }); nodeVars(RN).forEach(function (n) { names.add(n); });
    var v = (opts.variable && opts.variable !== 'auto') ? opts.variable : (names.has('x') ? 'x' : Array.from(names).sort()[0]);
    var res = { kind: 'equation', variable: v, steps: [], answers: [], plot: null, headline: '' };
    var eq = Ls + ' = ' + Rs;
    if (!v) {
      var lv = fnAt(Ls, {}), rv = fnAt(Rs, {}), same = Math.abs(lv - rv) < 1e-10;
      res.steps.push(S('Evaluate both sides', [Ls + ' = ' + fmt(lv), Rs + ' = ' + fmt(rv)]));
      res.headline = same ? 'True statement' : 'False statement';
      res.answers.push({ exact: same ? 'Both sides are equal, so the statement is true.' : 'The two sides differ, so the statement is false.' });
      return res;
    }
    var others = Array.from(names).filter(function (n) { return n !== v; });
    var symbolic = others.length > 0;
    res.steps.push(S('Write the equation', eq, symbolic ? 'Solving for ' + v + '. The letters ' + others.join(', ') + ' are treated as constants.' : ''));
    var total = countVar(LN, v) + countVar(RN, v);
    var fStr = '(' + Ls + ')-(' + Rs + ')';
    var scope = function (x) { var o = {}; o[v] = x; return o; };
    var real = [];
    var finish = function () {
      res.answers.sort(function (p, q) { return ((p._c ? 1 : 0) - (q._c ? 1 : 0)) || ((p._v || 0) - (q._v || 0)); });
      res.headline = res.answers.length ? res.answers.map(function (a) { return a.lhs ? a.lhs + ' = ' + a.exact : a.exact; }).join(',  ') : 'No solution';
      if (!symbolic) {
        var items = [{ type: 'fn', expr: varSub(Ls, v, 'x'), label: 'y = ' + pretty(Ls) }];
        if (!/^\s*0\s*$/.test(Rs)) items.push({ type: 'fn', expr: varSub(Rs, v, 'x'), label: 'y = ' + pretty(Rs) });
        res.plot = { items: items, points: real.map(function (x) { return { x: x, y: fnAt(Ls, scope(x)), label: v + ' = ' + fmt(x, 6) }; }) };
        if (real.length) {
          var checks = real.slice(0, 4).map(function (x) {
            var l = fnAt(Ls, scope(x)), r = fnAt(Rs, scope(x));
            var ok = Math.abs(l - r) < 1e-7 * Math.max(1, Math.abs(l), Math.abs(r));
            return v + ' = ' + fmt(x, 8) + ':   left side = ' + fmt(l, 8) + ',   right side = ' + fmt(r, 8) + (ok ? '   ✓' : '   ✗');
          });
          res.steps.push(S('Check the solution' + (real.length > 1 ? 's' : ''), checks, real.length > 4 ? 'Showing the first 4 checks.' : ''));
        }
      }
      return res;
    };
    var addAnswer = function (exact, val, extra) {
      var a = { lhs: v, exact: pretty(exact), approx: null, note: extra || '', _v: val };
      if (Number.isFinite(val) && !/^-?\d+$/.test(exact) && pretty(exact) !== fmt(val, 8)) a.approx = fmt(val, 8);
      res.answers.push(a);
      if (Number.isFinite(val)) real.push(val);
    };
    var addComplex = function (exact, re, im) {
      var ap = C.fmtC({ re: re, im: im }, 6);
      res.answers.push({ lhs: v, exact: pretty(exact), approx: pretty(exact) === pretty(ap) || pretty(exact).replace(/\s/g, '') === pretty(ap).replace(/\s/g, '') ? null : ap, note: 'complex', _c: true, _v: re });
    };
    if (total === 0) {
      var l0 = fnAt(Ls, {}), r0 = fnAt(Rs, {});
      res.steps.push(S('There is no unknown', 'The letter ' + v + ' does not appear in the equation.'));
      res.answers.push({ exact: Math.abs(l0 - r0) < 1e-10 ? 'The equation is always true.' : 'The equation is never true.' });
      res.headline = res.answers[0].exact; return res;
    }

    /* A. variable appears once: undo operations in reverse order */
    if (total === 1) {
      var left = LN, right = Rs;
      if (countVar(RN, v) === 1) { left = RN; right = Ls; res.steps.push(S('Swap the sides', strN(left) + ' = ' + right, 'The unknown is easier to isolate on the left.')); }
      res.steps.push(S('Isolate ' + v + ' by undoing the operations in reverse order', 'Work from the outside in, doing the same thing to both sides.'));
      var iso = isolate(left, right, v, res.steps);
      if (iso.ok) {
        iso.br.forEach(function (b) {
          var val = fnAt(b.rhs, {});
          if (!symbolic && !Number.isFinite(val) && !/\bi\b/.test(niceExpr(b.rhs))) return;
          var ex = b.rhs;
          if (!symbolic && !Number.isFinite(val)) {
            var cz; try { cz = core.evaluate(norm(b.rhs)); } catch (e) { cz = null; }
            if (cz && typeof cz.re === 'number') { addComplex(ex, cz.re, cz.im); return; }
          }
          var note = '';
          if (b.per) note = 'General solution: ' + v + ' = ' + pretty(ex) + ' + k·' + pretty(b.per) + ', k = 0, ±1, ±2, …';
          else if (iso.trig) note = '';
          if (iso.trig && Number.isFinite(val)) note += (note ? '   ' : '') + '≈ ' + fmt(val * 180 / Math.PI, 8) + '°';
          addAnswer(ex, val, note);
        });
        if (iso.principal) res.steps.push(S('Note', 'Only the principal solutions are listed, because the unknown sits inside more than one nested function.'));
        if (!res.answers.length && !symbolic) {
          res.steps.push(S('Result', 'No real solution.'));
          res.headline = 'No real solution'; return finish();
        }
        return finish();
      }
      if (iso.none) {
        res.steps.push(S('No real solution', iso.msg)); res.answers = []; res.headline = 'No real solution';
        res.plot = symbolic ? null : { items: [{ type: 'fn', expr: varSub(Ls, v, 'x'), label: 'y = ' + pretty(Ls) }, { type: 'fn', expr: varSub(Rs, v, 'x'), label: 'y = ' + pretty(Rs) }], points: [] };
        return res;
      }
      /* fall through to other strategies; drop the isolation steps that were added */
      res.steps = res.steps.slice(0, 1);
    }

    if (symbolic) {
      try {
        var sol = nerdamer.solve(toNerd(Ls + '-(' + Rs + ')'), v).toString().replace(/^\[|\]$/g, '');
        var list = C.splitTop(sol, ',');
        if (!list.length || list[0] === '') throw new Error('none');
        res.steps.push(S('Solve symbolically for ' + v, 'The computer algebra system isolates ' + v + ' in terms of ' + others.join(', ') + '.'));
        list.forEach(function (s) { res.answers.push({ lhs: v, exact: pretty(s), approx: null, note: '' }); });
        res.headline = res.answers.map(function (a) { return a.lhs + ' = ' + a.exact; }).join(',  ');
        return res;
      } catch (e) { throw new Error('I could not isolate ' + v + ' symbolically. Try giving numbers for ' + others.join(', ') + '.'); }
    }

    /* B. polynomial */
    var poly = polyCoeffs(fStr, v);
    if (poly) {
      var deg = poly.length - 1;
      res.steps.push(S('Move everything to one side and expand', polyStr(poly, v) + ' = 0', deg ? 'This is a polynomial of degree ' + deg + '.' : ''));
      if (deg === 0) {
        res.steps.push(S('Compare', poly[0] === 0 ? '0 = 0 is always true.' : fmt(poly[0]) + ' = 0 is never true.'));
        res.answers.push({ exact: poly[0] === 0 ? 'Every number is a solution.' : 'There is no solution.' });
        res.headline = res.answers[0].exact; return res;
      }
      if (deg === 1) {
        var a1 = poly[1], b1 = poly[0];
        var xr = -b1 / a1, fr = bestFraction(xr, 1000, 1e-10);
        res.steps.push(S('Isolate the ' + v + ' term', (Math.abs(a1) === 1 ? (a1 < 0 ? '-' : '') : coefTxt(a1, true)) + v + ' = ' + coefTxt(-b1, false).replace(/^-0$/, '0')));
        if (Math.abs(a1) !== 1) res.steps.push(S('Divide by the coefficient ' + coefTxt(a1, false), v + ' = ' + (fr ? fr.n + '/' + fr.d : fmt(xr, 10))));
        addAnswer(fr ? fracStr(fr.n, fr.d) : fmt(xr, 10), xr);
        return finish();
      }
      var ints = toInts(poly);
      if (deg === 2 && ints) {
        var qa = ints[2], qb = ints[1], qc = ints[0], qe = quadExact(qa, qb, qc);
        if (qa < 0) { /* keep as is; the formula handles negative a */ }
        res.steps.push(S('Identify the coefficients of ax² + bx + c = 0', 'a = ' + coefTxt(poly[2], false) + ',   b = ' + coefTxt(poly[1], false) + ',   c = ' + coefTxt(poly[0], false),
          ints.some(function (x, i) { return x !== poly[i]; }) ? 'Multiplying by a common factor does not change the solutions, so I use a = ' + qa + ', b = ' + qb + ', c = ' + qc + '.' : ''));
        res.steps.push(S('Compute the discriminant', ['Δ = b² − 4ac', 'Δ = (' + qb + ')² − 4·(' + qa + ')·(' + qc + ')', 'Δ = ' + qe.D],
          qe.D > 0 ? 'Δ > 0: two different real solutions.' : (qe.D === 0 ? 'Δ = 0: one repeated real solution.' : 'Δ < 0: no real solutions; the two solutions are complex.')));
        res.steps.push(S('Apply the quadratic formula', [v + ' = (−b ± √Δ) / (2a)', v + ' = (−(' + qb + ') ± √(' + qe.D + ')) / (2·' + qa + ')']));
        if (qe.pm) res.steps.push(S('Simplify the root', v + ' = ' + qe.pm, qe.kind === 'irrational' ? 'The square root is not a whole number, so the answer is left in exact form.' : ''));
        if (qe.kind === 'rational') res.steps.push(S('Evaluate both roots', qe.roots.map(function (r, i) { return v + (i + 1) + ' = ' + r.s; })));
        qe.roots.forEach(function (r) { if (r.im) addComplex(r.s, r.v, r.im); else addAnswer(r.s, r.v); });
        if (qe.kind === 'rational' || qe.kind === 'double') {
          var r1 = qe.roots[0], r2 = qe.roots[1] || qe.roots[0];
          res.steps.push(S('Factor form', qa + '·(' + v + ' − ' + r1.s + ')(' + v + ' − ' + r2.s + ') = 0', 'Each factor equals zero at a solution.'));
        }
        var vx = -poly[1] / (2 * poly[2]);
        res.vertex = { x: vx, y: fnAt(fStr, scope(vx)) };
        return finish();
      }
      if (ints) {
        var pe = solvePolyExact(ints, v);
        pe.steps.forEach(function (s) { res.steps.push(s); });
        var merged = [];
        pe.roots.forEach(function (r) {
          var hit = merged.filter(function (m) { return m.s === r.s && Math.abs(m.im - r.im) < 1e-9; })[0];
          if (hit) hit.mult++; else merged.push({ s: r.s, v: r.v, im: r.im, mult: 1, approx: r.approx });
        });
        merged.forEach(function (r) {
          var note = r.mult > 1 ? 'repeated ' + r.mult + ' times' : '';
          if (r.im) addComplex(r.s, r.v, r.im); else addAnswer(r.s, r.v, note);
          if (r.im) res.answers[res.answers.length - 1].note = (note ? note + ', ' : '') + 'complex';
        });
        res.steps.push(S('Collect the solutions', merged.map(function (r) { return v + ' = ' + r.s + (r.mult > 1 ? '   (×' + r.mult + ')' : ''); })));
        return finish();
      }
      var nr = polyRootsNum(poly);
      res.steps.push(S('Find the roots numerically', 'The coefficients are not simple fractions, so the roots are found with the Durand–Kerner method.'));
      nr.forEach(function (z) { if (z.im) addComplex(C.fmtC(z, 8), z.re, z.im); else addAnswer(fmt(z.re, 10), z.re); });
      return finish();
    }

    /* C. rational equation */
    try {
      var rat = core.rationalize(norm(fStr));
      if (rat.isOperatorNode && rat.op === '/') {
        var numS = strN(rat.args[0]), denS = strN(rat.args[1]);
        var pn = polyCoeffs(numS, v);
        if (pn && pn.length > 1) {
          res.steps.push(S('Combine everything into a single fraction', '(' + numS + ') / (' + denS + ') = 0', 'A fraction is zero only when its numerator is zero and its denominator is not.'));
          var nrts = polyRootsNum(pn).filter(function (z) { return !z.im; }).map(function (z) { return z.re; });
          var good = [];
          nrts.forEach(function (x) {
            var d = fnAt(denS, scope(x));
            if (Math.abs(d) < 1e-9) res.steps.push(S('Exclude x = ' + fmt(x, 8), 'The denominator is 0 there, so this value is not allowed.'));
            else good.push(x);
          });
          res.steps.push(S('Solve the numerator = 0', numS + ' = 0'));
          good.forEach(function (x) {
            var fr2 = bestFraction(x, 1000, 1e-9);
            addAnswer(Number.isInteger(x) ? String(x) : (fr2 ? fr2.n + '/' + fr2.d : fmt(x, 10)), x);
          });
          return finish();
        }
      }
    } catch (e) { /* not rational; use numeric scan */ }

    /* D. numeric */
    var f = function (x) { return fnAt(fStr, scope(x)); };
    var roots = scanRoots(f, 100, 6000);
    res.steps.push(S('No algebraic shortcut applies', 'I find the solutions numerically.'));
    res.steps.push(S('Rearrange to f(' + v + ') = 0', 'f(' + v + ') = ' + Ls + ' − (' + Rs + ')'));
    res.steps.push(S('Search for sign changes, then narrow each one down by bisection',
      roots.length ? roots.map(function (r) { return v + ' ≈ ' + fmt(r, 10) + '    f(' + v + ') ≈ ' + fmt(f(r), 3); }) : 'No solutions found between −100 and 100.',
      'Searched −100 ≤ ' + v + ' ≤ 100. Periodic equations can have more solutions outside this window.'));
    roots.forEach(function (r) { addAnswer(fmt(r, 10), r); });
    if (!roots.length) { res.headline = 'No real solution found'; res.plot = { items: [{ type: 'fn', expr: varSub(Ls, v, 'x'), label: 'y = ' + pretty(Ls) }], points: [] }; return res; }
    return finish();
  }

  /* ---------- systems ---------- */
  var Q = {
    mk: function (n, d) { if (d === undefined) d = 1; if (d < 0) { n = -n; d = -d; } var g = gcd(n, d) || 1; return { n: n / g, d: d / g }; },
    add: function (a, b) { return Q.mk(a.n * b.d + b.n * a.d, a.d * b.d); },
    sub: function (a, b) { return Q.mk(a.n * b.d - b.n * a.d, a.d * b.d); },
    mul: function (a, b) { return Q.mk(a.n * b.n, a.d * b.d); },
    div: function (a, b) { return Q.mk(a.n * b.d, a.d * b.n); },
    isZero: function (a) { return a.n === 0; },
    isOne: function (a) { return a.n === 1 && a.d === 1; },
    str: function (a) { return a.d === 1 ? String(a.n) : a.n + '/' + a.d; },
    val: function (a) { return a.n / a.d; },
    from: function (x) { if (Number.isInteger(x)) return Q.mk(x, 1); var f = bestFraction(x, 1000, 1e-10); return f ? Q.mk(f.n, f.d) : null; }
  };
  var FL = {
    add: function (a, b) { return a + b; }, sub: function (a, b) { return a - b; }, mul: function (a, b) { return a * b; }, div: function (a, b) { return a / b; },
    isZero: function (a) { return Math.abs(a) < 1e-10; }, isOne: function (a) { return Math.abs(a - 1) < 1e-10; },
    str: function (a) { return fmt(a, 6); }, val: function (a) { return a; }, from: function (x) { return x; }
  };
  function gaussJordan(M, ops) {
    var par = function (t) { return t.charAt(0) === '-' ? '(' + t + ')' : t; };
    var rows = M.length, cols = M[0].length, r = 0, pivs = [], steps = [];
    var snap = function () { return M.map(function (row) { return row.map(ops.str); }); };
    for (var c = 0; c < cols - 1 && r < rows; c++) {
      var p = -1, best = 0;
      for (var i = r; i < rows; i++) {
        if (ops.isZero(M[i][c])) continue;
        var mag = Math.abs(ops.val(M[i][c]));
        if (p < 0 || (ops === FL && mag > best)) { p = i; best = mag; if (ops !== FL) break; }
      }
      if (p < 0) continue;
      if (p !== r) { var tmp = M[p]; M[p] = M[r]; M[r] = tmp; steps.push({ op: 'R' + (r + 1) + ' ↔ R' + (p + 1), M: snap() }); }
      var pv = M[r][c];
      if (!ops.isOne(pv)) { M[r] = M[r].map(function (x) { return ops.div(x, pv); }); steps.push({ op: 'R' + (r + 1) + ' → R' + (r + 1) + ' ÷ ' + par(ops.str(pv)), M: snap() }); }
      for (var k = 0; k < rows; k++) {
        if (k === r || ops.isZero(M[k][c])) continue;
        var fct = M[k][c];
        M[k] = M[k].map(function (x, j) { return ops.sub(x, ops.mul(fct, M[r][j])); });
        steps.push({ op: 'R' + (k + 1) + ' → R' + (k + 1) + ' − (' + ops.str(fct) + ')·R' + (r + 1), M: snap() });
      }
      pivs.push(c); r++;
    }
    return { M: M, pivs: pivs, steps: steps };
  }
  function newtonSystem(fs, n) {
    var sols = [];
    var grid = n === 2 ? [-8, -4, -2, -0.7, 0.7, 2, 4, 8] : [-5, -1, 1, 5];
    var starts = [];
    var rec = function (pre) { if (pre.length === n) { starts.push(pre.slice()); return; } grid.forEach(function (g) { rec(pre.concat([g])); }); };
    rec([]);
    starts.forEach(function (x) {
      for (var it = 0; it < 60; it++) {
        var F = fs.map(function (f) { return f(x); });
        if (F.some(function (t) { return !Number.isFinite(t); })) return;
        var J = fs.map(function (f) { return x.map(function (_, j) { var h = 1e-6 * Math.max(1, Math.abs(x[j])), xp = x.slice(); xp[j] += h; return (f(xp) - f(x)) / h; }); });
        var aug = J.map(function (row, i) { return row.concat([-F[i]]); });
        var gj = gaussJordan(aug, FL);
        if (gj.pivs.length < n) return;
        var dx = gj.M.map(function (row) { return row[n]; });
        for (var j = 0; j < n; j++) x[j] += dx[j];
        if (Math.max.apply(null, dx.map(Math.abs)) < 1e-13) break;
      }
      var ok = fs.every(function (f) { return Math.abs(f(x)) < 1e-8; });
      if (ok && !sols.some(function (s) { return s.every(function (t, i) { return Math.abs(t - x[i]) < 1e-6; }); })) sols.push(x.slice());
    });
    return sols;
  }
  function solveSystem(input) {
    var raw = String(input);
    var lines = raw.split(/[\n;]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (lines.length < 2 && (raw.match(/=/g) || []).length >= 2) lines = C.splitTop(raw, ',');
    if (lines.length < 2) throw new Error('Enter at least two equations, one per line (or separated by semicolons).');
    var eqs = lines.map(function (l) {
      if (norm(l).indexOf('=') < 0) throw new Error('Each equation needs an = sign. Check: ' + l);
      var p = splitEq(norm(l)); return { L: p[0], R: p[1], f: '(' + p[0] + ')-(' + p[1] + ')', raw: l };
    });
    var set = new Set();
    eqs.forEach(function (e) { nodeVars(parseOrThrow(e.L)).forEach(function (n) { set.add(n); }); nodeVars(parseOrThrow(e.R)).forEach(function (n) { set.add(n); }); });
    var vars = Array.from(set).sort();
    if (!vars.length) throw new Error('There are no unknowns. Use letters such as x and y.');
    var res = { kind: 'system', variables: vars, steps: [], answers: [], plot: null, headline: '' };
    res.steps.push(S('Write the system', eqs.map(function (e) { return e.L + ' = ' + e.R; }), vars.length + ' unknown' + (vars.length > 1 ? 's' : '') + ' (' + vars.join(', ') + '), ' + eqs.length + ' equations.'));
    var zero = {}; vars.forEach(function (v) { zero[v] = 0; });
    var rowsC = eqs.map(function (e) {
      var c0 = fnAt(e.f, zero);
      var cs = vars.map(function (v) { var s = Object.assign({}, zero); s[v] = 1; return fnAt(e.f, s) - c0; });
      return { cs: cs, c0: c0 };
    });
    var affine = rowsC.every(function (rw, i) {
      if (!Number.isFinite(rw.c0) || rw.cs.some(function (x) { return !Number.isFinite(x); })) return false;
      return [[0.7, -1.3, 2.1, 0.4], [-2.2, 1.1, 0.5, -0.9], [3.1, 0.2, -1.7, 1.3]].every(function (pt) {
        var sc = {}; vars.forEach(function (v, j) { sc[v] = pt[j % 4]; });
        var pred = rw.c0 + rw.cs.reduce(function (a, c, j) { return a + c * sc[vars[j]]; }, 0);
        return Math.abs(pred - fnAt(eqs[i].f, sc)) < 1e-7 * Math.max(1, Math.abs(pred));
      });
    });
    var toXY = function (e) { var s = e.f; if (vars.length === 2) { s = varSub(varSub(s, vars[0], '__a'), vars[1], '__b').replace(/__a/g, 'x').replace(/__b/g, 'y'); } return s; };
    var setPlot = function (pts) {
      if (vars.length === 2) res.plot = { items: eqs.map(function (e) { return { type: 'implicit', expr: toXY(e), label: pretty(e.L + ' = ' + e.R) }; }), points: pts };
    };
    if (affine) {
      var ops = rowsC.every(function (rw) { return Q.from(rw.c0) && rw.cs.every(function (c) { return Q.from(c); }); }) ? Q : FL;
      var M = rowsC.map(function (rw) { return rw.cs.map(function (c) { return ops.from(c); }).concat([ops.from(-rw.c0)]); });
      var show = function (MM) { return { matrix: MM.map(function (r) { return r.map(ops.str); }), aug: true, vars: vars }; };
      res.steps.push(S('Write it as an augmented matrix', show(M), 'Each row is one equation. The last column holds the constants on the right.'));
      var gj = gaussJordan(M, ops);
      gj.steps.forEach(function (st, i) { res.steps.push(S('Row operation ' + (i + 1) + ':  ' + st.op, { matrix: st.M, aug: true, vars: vars })); });
      var inconsistent = gj.M.some(function (row) { return row.slice(0, vars.length).every(ops.isZero) && !ops.isZero(row[vars.length]); });
      if (inconsistent) {
        res.steps.push(S('Read the result', 'A row reads 0 = nonzero, which is impossible.'));
        res.headline = 'No solution'; res.answers.push({ exact: 'The equations contradict each other, so the system has no solution.' });
        setPlot([]); return res;
      }
      if (gj.pivs.length === vars.length) {
        res.steps.push(S('Read the solution from the reduced matrix', vars.map(function (v, i) { return v + ' = ' + ops.str(gj.M[i][vars.length]); }), 'The left block is now the identity matrix.'));
        var pts = [];
        vars.forEach(function (v, i) {
          var val = ops.val(gj.M[i][vars.length]); pts.push(val);
          res.answers.push({ lhs: v, exact: pretty(ops.str(gj.M[i][vars.length])), approx: Number.isInteger(val) ? null : fmt(val, 8), note: '' });
        });
        var ck = eqs.map(function (e, i) { var sc = {}; vars.forEach(function (v, j) { sc[v] = pts[j]; }); var l = fnAt(e.L, sc), r = fnAt(e.R, sc); return e.raw + ':   ' + fmt(l, 8) + ' = ' + fmt(r, 8) + (Math.abs(l - r) < 1e-8 ? '   ✓' : '   ✗'); });
        res.steps.push(S('Check in every original equation', ck));
        res.headline = vars.map(function (v, i) { return v + ' = ' + fmt(pts[i], 8); }).join(',   ');
        setPlot(vars.length === 2 ? [{ x: pts[0], y: pts[1], label: '(' + fmt(pts[0], 5) + ', ' + fmt(pts[1], 5) + ')' }] : []);
      } else {
        var free = vars.filter(function (v, i) { return gj.pivs.indexOf(i) < 0; });
        res.steps.push(S('Read the result', 'There are fewer independent equations than unknowns, so ' + free.join(', ') + ' can be chosen freely.'));
        vars.forEach(function (v, i) {
          var pi = gj.pivs.indexOf(i);
          if (pi < 0) { res.answers.push({ exact: v + ' is free (any value)', approx: null, note: '' }); return; }
          var rhs = [ops.str(gj.M[pi][vars.length])];
          vars.forEach(function (w, j) { if (gj.pivs.indexOf(j) < 0 && !ops.isZero(gj.M[pi][j])) { var c = ops.mul(gj.M[pi][j], ops === Q ? Q.mk(-1) : -1); var cm = ops === Q ? Q.mk(Math.abs(c.n), c.d) : Math.abs(c); rhs.push((ops.val(c) < 0 ? '- ' : '+ ') + (ops.isOne(cm) ? '' : ops.str(cm) + '·') + w); } });
          res.answers.push({ lhs: v, exact: pretty(rhs.join(' ')), approx: null, note: '' });
        });
        res.headline = 'Infinitely many solutions';
        setPlot([]);
      }
      return res;
    }
    /* non-linear */
    if (vars.length === 2) {
      var lin = null;
      eqs.forEach(function (e, i) {
        if (lin) return;
        vars.forEach(function (v, k) {
          if (lin) return;
          var w = vars[1 - k], rw = rowsC[i];
          var d1 = Math.abs(fnAt(e.f, (function () { var s = { }; s[v] = 1; s[w] = 0; return s; })()) - fnAt(e.f, (function () { var s = {}; s[v] = 0; s[w] = 0; return s; })()));
          var iso2 = [0.4, 1.7, -2.3].every(function (t) {
            var s0 = {}, s1 = {}; s0[v] = 0; s1[v] = 1; s0[w] = t; s1[w] = t;
            var s2 = {}; s2[v] = 2; s2[w] = t;
            return Math.abs(fnAt(e.f, s2) - 2 * fnAt(e.f, s1) + fnAt(e.f, s0)) < 1e-9;
          });
          if (iso2 && d1 > 1e-12 && countVar(parseOrThrow(e.f), v) >= 1) lin = { i: i, v: v, w: w };
        });
      });
      if (lin) {
        var e1 = eqs[lin.i], other = eqs[1 - lin.i], v1 = lin.v, w1 = lin.w;
        var lo = parseOrThrow(e1.L), ro = parseOrThrow(e1.R);
        var side = countVar(lo, v1) ? lo : ro, rest = countVar(lo, v1) ? e1.R : e1.L;
        var st = []; var isoR = isolate(side, rest, v1, st);
        if (isoR.ok && isoR.br.length === 1) {
          var expr = isoR.br[0].rhs;
          res.steps.push(S('Solve one equation for ' + v1, v1 + ' = ' + expr, 'This is the equation ' + e1.raw + '. Now substitute it into the other equation.'));
          var subL = other.L.replace(new RegExp('\\b' + v1 + '\\b', 'g'), '(' + expr + ')'), subR = other.R.replace(new RegExp('\\b' + v1 + '\\b', 'g'), '(' + expr + ')');
          res.steps.push(S('Substitute into ' + other.raw, subL + ' = ' + subR, 'Now there is only one unknown, ' + w1 + '.'));
          var inner;
          try { inner = solveEquation(subL + ' = ' + subR, { variable: w1 }); } catch (e) { inner = null; }
          if (inner && inner.answers.length) {
            inner.steps.slice(1).forEach(function (s) { if (!/^Check/.test(s.t)) res.steps.push(S('(' + w1 + ') ' + s.t, s.m, s.n)); });
            var sols = [], pts2 = [];
            inner.answers.forEach(function (a) {
              if (a.note === 'complex') return;
              var wv = fnAt(a.approx || a.exact, {}); if (!Number.isFinite(wv)) wv = fnAt(norm(a.exact), {});
              var sc = {}; sc[w1] = wv; var vv = fnAt(expr, sc);
              sols.push({ w: wv, v: vv, wExact: a.exact, vExact: niceExpr(expr.replace(new RegExp('\\b' + w1 + '\\b', 'g'), '(' + wv + ')')) });
            });
            if (sols.length) {
              res.steps.push(S('Back-substitute to find ' + v1, sols.map(function (s) { return w1 + ' = ' + s.wExact + '  →  ' + v1 + ' = ' + fmt(s.v, 8); })));
              sols.forEach(function (s, i) {
                var o = {}; o[w1] = s.w; o[v1] = s.v;
                res.answers.push({ exact: (sols.length > 1 ? 'Solution ' + (i + 1) + ':   ' : '') + vars.map(function (vn) { return vn + ' = ' + fmt(o[vn], 8); }).join(',   '), approx: null, note: '' });
                pts2.push({ x: o[vars[0]], y: o[vars[1]], label: '(' + fmt(o[vars[0]], 5) + ', ' + fmt(o[vars[1]], 5) + ')' });
              });
              res.headline = res.answers.map(function (a) { return a.exact; }).join('   |   ');
              setPlot(pts2); return res;
            }
          }
        }
      }
    }
    /* generic numeric solution */
    var fns = eqs.map(function (e) { return function (x) { var sc = {}; vars.forEach(function (v, j) { sc[v] = x[j]; }); return fnAt(e.f, sc); }; });
    res.steps.push(S('The equations are not all linear', 'I solve the system numerically with Newton\'s method from many starting points.'));
    var ns = newtonSystem(fns, vars.length);
    if (!ns.length) { res.headline = 'No real solution found'; res.answers.push({ exact: 'No real solution was found. The curves may not meet.' }); setPlot([]); return res; }
    ns.forEach(function (s, i) { res.answers.push({ exact: (ns.length > 1 ? 'Solution ' + (i + 1) + ':   ' : '') + vars.map(function (vn, j) { return vn + ' ≈ ' + fmt(s[j], 8); }).join(',   '), approx: null, note: '' }); });
    res.steps.push(S('Solutions found', res.answers.map(function (a) { return a.exact; })));
    res.headline = res.answers.map(function (a) { return a.exact; }).join('   |   ');
    setPlot(vars.length === 2 ? ns.map(function (s) { return { x: s[0], y: s[1], label: '(' + fmt(s[0], 5) + ', ' + fmt(s[1], 5) + ')' }; }) : []);
    return res;
  }

  /* ---------- inequalities ---------- */
  function scanSigns(f, R, N) {
    var xs = sampleGrid(R, N), ys = xs.map(f);
    var st = ys.map(function (y) { return !Number.isFinite(y) ? 'u' : (y > 0 ? 'p' : (y < 0 ? 'n' : 'z')); });
    var crit = [];
    for (var i = 0; i < xs.length - 1; i++) {
      var a = st[i], b = st[i + 1];
      if (a === 'z') { crit.push({ x: xs[i], type: 'root' }); continue; }
      if (a === b || b === 'z') continue;
      if ((a === 'p' && b === 'n') || (a === 'n' && b === 'p')) {
        var r = refineRoot(f, xs[i], xs[i + 1], ys[i]);
        if (r === null) { crit.push({ x: (xs[i] + xs[i + 1]) / 2, type: 'pole' }); continue; }
        crit.push({ x: r, type: Math.abs(f(r)) < 1e-5 ? 'root' : 'pole' });
      } else if (a === 'u' || b === 'u') {
        var lo = xs[i], hi = xs[i + 1], defLo = a !== 'u';
        for (var k = 0; k < 100; k++) { var mid = (lo + hi) / 2; if (Number.isFinite(f(mid)) === defLo) lo = mid; else hi = mid; }
        var edge = (lo + hi) / 2, rounded = parseFloat(edge.toFixed(8));
        crit.push({ x: rounded, type: 'edge', closed: Number.isFinite(f(rounded)) });
      }
    }
    if (st[st.length - 1] === 'z') crit.push({ x: xs[xs.length - 1], type: 'root' });
    for (var j = 1; j < xs.length - 1; j++) {
      if (!Number.isFinite(ys[j - 1]) || !Number.isFinite(ys[j]) || !Number.isFinite(ys[j + 1]) || ys[j] === 0) continue;
      if (Math.abs(ys[j]) < Math.abs(ys[j - 1]) && Math.abs(ys[j]) <= Math.abs(ys[j + 1]) && Math.abs(ys[j]) < 1e-3 &&
        st[j - 1] === st[j] && st[j + 1] === st[j]) {
        var t = minAbs(f, xs[j - 1], xs[j + 1]);
        if (Math.abs(f(t)) < 1e-9) crit.push({ x: t, type: 'root', touch: true });
      }
    }
    crit.sort(function (p, q) { return p.x - q.x; });
    return crit.filter(function (c, i) { return i === 0 || Math.abs(c.x - crit[i - 1].x) > 1e-8 * Math.max(1, Math.abs(c.x)); });
  }
  function solveInequality(input, opts) {
    opts = opts || {};
    var s = norm(input), m = s.match(/<=|>=|<|>/);
    if (!m) throw new Error('Use <, >, ≤ or ≥ in the inequality, for example x^2 - 5x + 6 > 0.');
    var op = m[0], Ls = s.slice(0, m.index).trim(), Rs = s.slice(m.index + op.length).trim() || '0';
    var LN = parseOrThrow(Ls), RN = parseOrThrow(Rs);
    var names = new Set(); nodeVars(LN).forEach(function (n) { names.add(n); }); nodeVars(RN).forEach(function (n) { names.add(n); });
    var v = (opts.variable && opts.variable !== 'auto') ? opts.variable : (names.has('x') ? 'x' : Array.from(names).sort()[0]);
    if (!v) throw new Error('Add an unknown such as x to the inequality.');
    if (names.size > 1) throw new Error('This tool solves inequalities with one unknown. Found: ' + Array.from(names).join(', ') + '.');
    var fStr = '(' + Ls + ')-(' + Rs + ')';
    var f = function (x) { var sc = {}; sc[v] = x; return fnAt(fStr, sc); };
    var res = { kind: 'inequality', variable: v, steps: [], answers: [], plot: null, headline: '' };
    var sym = { '<': '<', '>': '>', '<=': '≤', '>=': '≥' }[op];
    res.steps.push(S('Write the inequality', Ls + ' ' + sym + ' ' + Rs));
    res.steps.push(S('Move everything to one side', 'f(' + v + ') = ' + Ls + ' − (' + Rs + ')   ' + sym + '   0'));
    var crit = scanSigns(f, 1000, 9000);
    var exact = [];
    var poly = polyCoeffs(fStr, v), pints = poly && toInts(poly);
    if (pints && pints.length - 1 <= 2 && pints.length - 1 >= 1) {
      if (pints.length === 3) { var qq = quadExact(pints[2], pints[1], pints[0]); if (qq.kind !== 'complex') qq.roots.forEach(function (r) { exact.push(r); }); }
      else exact.push({ s: fracStr(-pints[0], pints[1]), v: -pints[0] / pints[1] });
    } else if (pints) {
      solvePolyExact(pints, v).roots.forEach(function (r) { if (!r.im && !r.approx) exact.push(r); });
    }
    var label = function (x) {
      for (var i = 0; i < exact.length; i++) if (Math.abs(exact[i].v - x) < 1e-7) return exact[i].s;
      if (Math.abs(x - Math.round(x)) < 1e-8) return String(Math.round(x));
      var fr = bestFraction(x, 1000, 1e-9); return fr ? fr.n + '/' + fr.d : fmt(x, 6);
    };
    var strict = op === '<' || op === '>';
    var sat = function (y) { return op === '<' ? y < 0 : op === '>' ? y > 0 : op === '<=' ? y <= 1e-12 : y >= -1e-12; };
    if (!crit.length) {
      var y0 = f(0.5), yy = Number.isFinite(y0) ? y0 : f(-0.5);
      res.steps.push(S('Find where f is zero or undefined', 'There are no such points, so f keeps one sign everywhere.'));
      var ok = sat(yy);
      res.steps.push(S('Test one point', 'f(0.5) = ' + fmt(yy, 6) + '  →  ' + (ok ? 'the inequality holds' : 'the inequality fails')));
      res.answers.push({ exact: ok ? 'All real numbers' : 'No real solution' });
      res.headline = res.answers[0].exact;
      res.plot = { items: [{ type: 'fn', expr: varSub(fStr, v, 'x'), label: 'y = ' + pretty(Ls + ' − (' + Rs + ')') }], points: [], bands: ok ? [{ a: -Infinity, b: Infinity }] : [] };
      return res;
    }
    res.steps.push(S('Find the critical points', crit.map(function (c) {
      return v + ' = ' + label(c.x) + (c.type === 'root' ? '   (f = 0)' : c.type === 'pole' ? '   (f is undefined: vertical asymptote)' : '   (edge of the domain)');
    }), 'These points split the number line into intervals. Inside each interval f cannot change sign.'));
    var pts = [-Infinity].concat(crit.map(function (c) { return c.x; })).concat([Infinity]);
    var tests = [], segs = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], t;
      if (a === -Infinity) t = b - Math.max(1, Math.abs(b) * 0.5);
      else if (b === Infinity) t = a + Math.max(1, Math.abs(a) * 0.5);
      else t = (a + b) / 2;
      var y = f(t), defined = Number.isFinite(y);
      tests.push({ a: a, b: b, t: t, y: y, ok: defined && sat(y), defined: defined });
    }
    res.steps.push(S('Test a point in each interval', tests.map(function (r) {
      var rng = (r.a === -Infinity ? '(−∞' : '(' + label(r.a)) + ', ' + (r.b === Infinity ? '∞)' : label(r.b) + ')');
      return rng + ':   f(' + fmt(r.t, 5) + ') = ' + (r.defined ? fmt(r.y, 5) : 'undefined') + '   →   ' + (!r.defined ? 'not in the domain' : (r.ok ? 'satisfies ' + sym + ' 0 ✓' : 'does not satisfy ✗'));
    })));
    var inc = crit.map(function (c) {
      if (c.type === 'pole') return false;
      if (c.type === 'edge') { var yv = f(c.x); return !!c.closed && Number.isFinite(yv) && sat(yv); }
      return !strict;
    });
    var cur = null;
    for (var k = 0; k < tests.length; k++) {
      var T = tests[k];
      if (T.ok) {
        if (cur && inc[k - 1]) { cur.b = T.b; cur.ib = k < crit.length ? inc[k] : false; }
        else { if (cur) segs.push(cur); cur = { a: T.a, b: T.b, ia: k > 0 ? inc[k - 1] : false, ib: k < crit.length ? inc[k] : false }; }
      } else {
        if (cur) { segs.push(cur); cur = null; }
        if (k > 0 && inc[k - 1] && !(tests[k - 1].ok) && (k - 1 >= 0)) {
          if (!segs.some(function (sg) { return sg.a === T.a || sg.b === T.a; }) && !(tests[k - 1] && tests[k - 1].ok)) segs.push({ point: T.a });
        }
      }
    }
    if (cur) segs.push(cur);
    var seen = {};
    segs = segs.filter(function (sg) { var key = sg.point !== undefined ? 'p' + sg.point : sg.a + '|' + sg.b; if (seen[key]) return false; seen[key] = 1; return true; });
    var intTxt = segs.map(function (sg) {
      if (sg.point !== undefined) return '{' + label(sg.point) + '}';
      return (sg.ia ? '[' : '(') + (sg.a === -Infinity ? '−∞' : label(sg.a)) + ', ' + (sg.b === Infinity ? '∞' : label(sg.b)) + (sg.ib ? ']' : ')');
    }).join(' ∪ ');
    var ineqTxt = segs.map(function (sg) {
      if (sg.point !== undefined) return v + ' = ' + label(sg.point);
      var lo = sg.a === -Infinity, hi = sg.b === Infinity;
      if (lo && hi) return 'all real ' + v;
      if (lo) return v + (sg.ib ? ' ≤ ' : ' < ') + label(sg.b);
      if (hi) return v + (sg.ia ? ' ≥ ' : ' > ') + label(sg.a);
      return label(sg.a) + (sg.ia ? ' ≤ ' : ' < ') + v + (sg.ib ? ' ≤ ' : ' < ') + label(sg.b);
    }).join('   or   ');
    if (!segs.length) { intTxt = 'No real solution'; ineqTxt = 'No real solution'; }
    res.steps.push(S('Combine the intervals that work', ['Interval notation:  ' + intTxt, 'Inequality form:  ' + ineqTxt],
      'A round bracket means the end value is not included. A square bracket means it is.'));
    res.answers.push({ exact: segs.length ? intTxt : 'No real solution', approx: segs.length ? ineqTxt : null, note: '' });
    res.headline = segs.length ? intTxt : 'No real solution';
    res.plot = {
      items: [{ type: 'fn', expr: varSub(fStr, v, 'x'), label: 'y = ' + pretty(Ls + ' − (' + Rs + ')') }],
      points: crit.filter(function (c) { return c.type === 'root'; }).map(function (c) { return { x: c.x, y: 0, label: v + ' = ' + label(c.x) }; }),
      bands: segs.map(function (sg) { return sg.point !== undefined ? { a: sg.point, b: sg.point } : { a: sg.a, b: sg.b }; })
    };
    return res;
  }

  MB.solvers = {
    S: S, strN: strN, parseOrThrow: parseOrThrow, varSub: varSub, niceExpr: niceExpr, polyCoeffs: polyCoeffs, polyStr: polyStr,
    toInts: toInts, quadExact: quadExact, polyRootsNum: polyRootsNum, scanRoots: scanRoots, sampleGrid: sampleGrid,
    gaussJordan: gaussJordan, Q: Q, FL: FL, solveEquation: solveEquation, solveSystem: solveSystem, solveInequality: solveInequality,
    isolate: isolate, coefTxt: coefTxt, piForm: piForm
  };
})(globalThis.MB = globalThis.MB || {});
