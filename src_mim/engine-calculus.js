/* MiMath engine: calculus, algebra tools, series, matrices and the dispatcher */
(function (MB) {
  'use strict';
  var C = MB.core, core = C.core, norm = C.norm, toNerd = C.toNerd, fmt = C.fmt, pretty = C.pretty, fnAt = C.fnAt,
    nodeVars = C.nodeVars, countVar = C.countVar, friendlyError = C.friendlyError, bestFraction = C.bestFraction;
  var X = MB.solvers, S = X.S, strN = X.strN, parseOrThrow = X.parseOrThrow, varSub = X.varSub, niceExpr = X.niceExpr, Q = X.Q, FL = X.FL;

  function pickVar(node, pref) {
    if (pref && pref !== 'auto') return pref;
    var names = Array.from(nodeVars(node)).sort();
    return names.indexOf('x') >= 0 ? 'x' : (names[0] || 'x');
  }
  function sc(v, x) { var o = {}; o[v] = x; return o; }
  function primes(k, v) { return k === 1 ? '′' : k === 2 ? '″' : k === 3 ? '‴' : '⁽' + k + '⁾'; }
  function ndiff(s, v, n) {
    try {
      var t = core.parse(norm(s));
      t = t.transform(function (nd) {
        if (nd.isFunctionNode && nd.args.length === 1 && (nd.fn.name === 'log10' || nd.fn.name === 'log2')) {
          return new core.OperatorNode('/', 'divide', [new core.FunctionNode('log', [nd.args[0]]), new core.SymbolNode(nd.fn.name === 'log10' ? 'LN10' : 'LN2')]);
        }
        return nd;
      });
      for (var i = 0; i < (n || 1); i++) t = core.derivative(t, v);
      var r = t.toString().replace(/\bLN10\b/g, 'ln(10)').replace(/\bLN2\b/g, 'ln(2)');
      if (/derivative\(/.test(r)) throw new Error('x');
      return r;
    } catch (e) {
      var r2 = nerdamer.diff(toNerd(s), v, n || 1).toString();
      if (/diff\(/.test(r2)) throw new Error('I could not differentiate that expression.');
      return r2;
    }
  }
  function numAt(f, v, x) { return fnAt(f, sc(v, x)); }
  function tidyRational(d, v) {
    try {
      if (d.indexOf('/') < 0) return null;
      var r = core.rationalize(norm(d));
      if (!(r.isOperatorNode && r.op === '/' && r.args.length === 2)) return null;
      var num = strN(r.args[0]), den = strN(r.args[1]);
      var fd = nerdamer('factor(' + toNerd(den) + ')').toString();
      if (/\d{8,}/.test(num + fd) || /factor\(/.test(fd)) return null;
      var out = '(' + num + ')/(' + fd + ')';
      for (var i = 0; i < 4; i++) { var x = [0.7, 1.9, -1.4, 4.2][i], a = numAt(d, v, x), b = numAt(out, v, x); if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) > 1e-8 * Math.max(1, Math.abs(a))) return null; }
      return out.replace(/^\((.*)\)\/\(([^()]*)\)$/, '($1)/($2)');
    } catch (e) { return null; }
  }
  function nicePt(x) {
    if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
    var fr = bestFraction(x, 1000, 1e-9); return fr ? fr.n + '/' + fr.d : fmt(x, 6);
  }

  /* ---------- derivative rules ---------- */
  var DTABLE = {
    sin: 'cos(u)', cos: '-sin(u)', tan: 'sec(u)^2', exp: 'e^u', log: '1/u', log10: '1/(u·ln 10)', log2: '1/(u·ln 2)',
    sqrt: '1/(2√u)', cbrt: '1/(3·u^(2/3))', asin: '1/√(1 − u²)', acos: '−1/√(1 − u²)', atan: '1/(1 + u²)',
    sinh: 'cosh(u)', cosh: 'sinh(u)', tanh: 'sech(u)²', abs: 'u/|u|', sec: 'sec(u)·tan(u)', csc: '−csc(u)·cot(u)', cot: '−csc(u)²'
  };
  function flattenSum(n, sign, out) {
    if (n.isParenthesisNode && (n.content.isOperatorNode && (n.content.op === '+' || n.content.op === '-'))) return flattenSum(n.content, sign, out);
    if (n.isOperatorNode && n.args.length === 2 && n.op === '+') { flattenSum(n.args[0], sign, out); flattenSum(n.args[1], sign, out); return out; }
    if (n.isOperatorNode && n.args.length === 2 && n.op === '-') { flattenSum(n.args[0], sign, out); flattenSum(n.args[1], -sign, out); return out; }
    out.push({ sign: sign, node: n }); return out;
  }
  function explainDiff(node, v, depth, out) {
    var dep = function (n) { return countVar(n, v) > 0; };
    var D = function (n) { return ndiff(strN(n), v); };
    var isElem = function (n) {
      if (!dep(n)) return true;
      if (n.isSymbolNode) return true;
      if (n.isParenthesisNode) return isElem(n.content);
      if (n.isOperatorNode && n.op === '*' && n.args.length === 2) return (!dep(n.args[0]) && isElem(n.args[1])) || (!dep(n.args[1]) && isElem(n.args[0]));
      if (n.isOperatorNode && n.op === '^' && n.args[0].isSymbolNode && !dep(n.args[1])) return true;
      return false;
    };
    var P = function (t) { return depth ? 'Inner part: ' + t : t; };
    var recurse = function (n) { if (!isElem(n) && depth < 2) explainDiff(n, v, depth + 1, out); };
    var d = 'd/d' + v;
    if (!dep(node)) { out.push(S(P('Constant rule'), d + '[' + strN(node) + '] = 0')); return; }
    if (node.isParenthesisNode) { explainDiff(node.content, v, depth, out); return; }
    if (node.isSymbolNode) { out.push(S(P('Variable rule'), d + '[' + v + '] = 1')); return; }
    if (node.isOperatorNode) {
      var a = node.args, op = node.op;
      if (a.length === 1 && op === '-') { out.push(S(P('Constant multiple rule (−1)'), [d + '[−u] = −u′', 'u = ' + strN(a[0]), '= −(' + D(a[0]) + ')'])); recurse(a[0]); return; }
      if (a.length === 2 && (op === '+' || op === '-')) {
        var terms = flattenSum(node, 1, []);
        out.push(S(P('Sum / difference rule'), ['(f ± g)′ = f′ ± g′'].concat(terms.map(function (t) { return d + '[' + strN(t.node) + '] = ' + D(t.node); })), 'Differentiate each term on its own.'));
        terms.forEach(function (t) { recurse(t.node); }); return;
      }
      if (a.length === 2 && op === '*') {
        if (!dep(a[0]) || !dep(a[1])) {
          var c = dep(a[0]) ? a[1] : a[0], u = dep(a[0]) ? a[0] : a[1];
          out.push(S(P('Constant multiple rule'), ['(c·f)′ = c·f′', 'c = ' + strN(c) + ',   f = ' + strN(u), 'f′ = ' + D(u)])); recurse(u); return;
        }
        out.push(S(P('Product rule'), ['(u·v)′ = u′·v + u·v′', 'u = ' + strN(a[0]) + '   →   u′ = ' + D(a[0]), 'v = ' + strN(a[1]) + '   →   v′ = ' + D(a[1]),
          'u′·v + u·v′ = (' + D(a[0]) + ')·(' + strN(a[1]) + ') + (' + strN(a[0]) + ')·(' + D(a[1]) + ')']));
        recurse(a[0]); recurse(a[1]); return;
      }
      if (a.length === 2 && op === '/') {
        if (!dep(a[1])) { out.push(S(P('Constant multiple rule'), ['(f/c)′ = f′/c', 'f = ' + strN(a[0]) + ',   c = ' + strN(a[1]), 'f′ = ' + D(a[0])])); recurse(a[0]); return; }
        out.push(S(P('Quotient rule'), ['(u/v)′ = (u′·v − u·v′) / v²', 'u = ' + strN(a[0]) + '   →   u′ = ' + D(a[0]), 'v = ' + strN(a[1]) + '   →   v′ = ' + D(a[1]),
          '(' + D(a[0]) + ')·(' + strN(a[1]) + ') − (' + strN(a[0]) + ')·(' + D(a[1]) + ')   over   (' + strN(a[1]) + ')²']));
        recurse(a[0]); recurse(a[1]); return;
      }
      if (a.length === 2 && op === '^') {
        if (!dep(a[1])) {
          if (a[0].isSymbolNode) out.push(S(P('Power rule'), [d + '[' + v + '^n] = n·' + v + '^(n−1)', 'n = ' + strN(a[1]), '= ' + D(node)]));
          else { out.push(S(P('Power rule with the chain rule'), ['(u^n)′ = n·u^(n−1)·u′', 'u = ' + strN(a[0]) + ',   n = ' + strN(a[1]), 'u′ = ' + D(a[0]), '= ' + strN(a[1]) + '·(' + strN(a[0]) + ')^(' + strN(a[1]) + ' − 1)·(' + D(a[0]) + ')'])); recurse(a[0]); }
          return;
        }
        if (!dep(a[0])) {
          var isE = a[0].isSymbolNode && a[0].name === 'e';
          out.push(S(P('Exponential rule'), [isE ? '(e^u)′ = e^u·u′' : '(a^u)′ = a^u·ln(a)·u′', 'u = ' + strN(a[1]) + '   →   u′ = ' + D(a[1])])); recurse(a[1]); return;
        }
        out.push(S(P('Logarithmic differentiation'), ['(u^v)′ = u^v·(v′·ln u + v·u′/u)', 'u = ' + strN(a[0]) + ',   v = ' + strN(a[1]), 'u′ = ' + D(a[0]) + ',   v′ = ' + D(a[1])])); return;
      }
    }
    if (node.isFunctionNode && node.args.length === 1) {
      var nm = node.fn.name, arg = node.args[0];
      if (DTABLE[nm]) {
        out.push(S(P(arg.isSymbolNode ? 'Standard derivative' : 'Chain rule'),
          ['(' + nm + '(u))′ = ' + DTABLE[nm].replace(/\bu\b/g, 'u') + '·u′', 'u = ' + strN(arg) + (arg.isSymbolNode ? '' : '   →   u′ = ' + D(arg)), '= ' + D(node)]));
        recurse(arg); return;
      }
    }
    out.push(S(P('Differentiate'), d + '[' + strN(node) + '] = ' + D(node)));
  }
  function solveDerivative(input, opts) {
    opts = opts || {};
    var src = C.stripLHS(norm(input)), node = parseOrThrow(src), v = pickVar(node, opts.variable);
    var order = Math.max(1, Math.min(4, parseInt(opts.order, 10) || 1));
    var res = { kind: 'derivative', variable: v, steps: [], answers: [], plot: null, headline: '' };
    res.steps.push(S('Write the function', 'f(' + v + ') = ' + src));
    var rules = []; explainDiff(node, v, 0, rules);
    var seen = {}; rules.filter(function (r) { var k = r.t + r.m.join('|'); if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 10).forEach(function (r) { res.steps.push(r); });
    var cur = src, ders = [], tidy = [];
    for (var k = 1; k <= order; k++) {
      var d = ndiff(cur, v, 1); ders.push(d); tidy.push(tidyRational(d, v));
      if (k === 1) res.steps.push(S('Put the pieces together', 'f′(' + v + ') = ' + d, order > 1 ? 'This is the first derivative. Differentiating again gives the next one.' : ''));
      else res.steps.push(S('Differentiate again (derivative ' + k + ')', ['d/d' + v + '[' + ders[k - 2] + '] = ' + d], 'The result is f' + primes(k) + '(' + v + ').'));
      cur = d;
    }
    var chk = 1.3, h = 1e-5;
    var fn = function (x) { return numAt(src, v, x); };
    var num1 = (fn(chk + h) - fn(chk - h)) / (2 * h), form = numAt(ders[0], v, chk);
    if (Number.isFinite(num1) && Number.isFinite(form)) {
      var good = Math.abs(num1 - form) < 1e-5 * Math.max(1, Math.abs(form));
      res.steps.push(S('Check numerically', ['At ' + v + ' = 1.3, the slope from a tiny interval is ' + fmt(num1, 7), 'The formula for f′ gives ' + fmt(form, 7) + (good ? '   ✓' : '   ✗')]));
    }
    var tidyLast = tidy[tidy.length - 1];
    if (tidyLast) res.steps.push(S('Combine into a single fraction', 'f' + primes(order) + '(' + v + ') = ' + tidyLast, 'Putting everything over a common denominator gives a tidier form.'));
    ders.forEach(function (d, i) { res.answers.push({ lhs: 'f' + primes(i + 1) + '(' + v + ')', exact: pretty(tidy[i] || d), approx: null, note: '' }); });
    var items = [{ type: 'fn', expr: varSub(src, v, 'x'), label: 'f(x)' }];
    ders.slice(0, 2).forEach(function (d, i) { items.push({ type: 'fn', expr: varSub(d, v, 'x'), label: 'f' + primes(i + 1) + '(x)', dash: true }); });
    var pts = [];
    if (opts.point !== undefined && String(opts.point).trim() !== '') {
      var a = fnAt(String(opts.point), {});
      if (Number.isFinite(a)) {
        var last = ders[ders.length - 1], val = numAt(last, v, a), f0 = fn(a), s1 = numAt(ders[0], v, a);
        res.steps.push(S('Evaluate at ' + v + ' = ' + String(opts.point), ['f' + primes(order) + '(' + opts.point + ') = ' + fmt(val, 10), order === 1 ? 'f(' + opts.point + ') = ' + fmt(f0, 10) : '']));
        res.answers.push({ lhs: 'f' + primes(order) + '(' + opts.point + ')', exact: fmt(val, 10), approx: null, note: order === 1 ? 'the slope of the curve at ' + v + ' = ' + opts.point : '' });
        if (Number.isFinite(f0) && Number.isFinite(s1)) {
          pts.push({ x: a, y: f0, label: 'x = ' + fmt(a, 5) });
          if (order === 1) { items.push({ type: 'fn', expr: '(' + fmt(f0, 12) + ')+(' + fmt(s1, 12) + ')*(x-(' + fmt(a, 12) + '))', label: 'tangent line', dash: true }); res.steps.push(S('Tangent line at that point', 'y = ' + fmt(f0, 8) + ' + ' + fmt(s1, 8) + '·(' + v + ' − ' + fmt(a, 8) + ')')); }
        }
      }
    }
    res.headline = 'f' + primes(order) + '(' + v + ') = ' + pretty(tidyLast || ders[ders.length - 1]);
    res.plot = { items: items, points: pts };
    return res;
  }

  /* ---------- integrals ---------- */
  function splitConst(n, v) {
    if (n.isParenthesisNode) return splitConst(n.content, v);
    if (n.isOperatorNode && n.args.length === 1 && n.op === '-') { var r = splitConst(n.args[0], v); return { c: r.c ? '-(' + r.c + ')' : '-1', rest: r.rest }; }
    if (n.isOperatorNode && n.op === '*' && n.args.length === 2) {
      var h0 = countVar(n.args[0], v) > 0, h1 = countVar(n.args[1], v) > 0;
      if (!h0 && h1) { var r1 = splitConst(n.args[1], v); return { c: '(' + strN(n.args[0]) + ')' + (r1.c ? '*(' + r1.c + ')' : ''), rest: r1.rest }; }
      if (h0 && !h1) { var r0 = splitConst(n.args[0], v); return { c: '(' + strN(n.args[1]) + ')' + (r0.c ? '*(' + r0.c + ')' : ''), rest: r0.rest }; }
    }
    if (n.isOperatorNode && n.op === '/' && n.args.length === 2 && countVar(n.args[1], v) === 0 && countVar(n.args[0], v) > 0) {
      var r2 = splitConst(n.args[0], v); return { c: '1/(' + strN(n.args[1]) + ')' + (r2.c ? '*(' + r2.c + ')' : ''), rest: r2.rest };
    }
    return { c: '', rest: n };
  }
  function linearInner(u, v) {
    if (u.isSymbolNode && u.name === v) return 1;
    var d = ndiff(strN(u), v);
    var dn = fnAt(d, sc(v, 0.37)), dn2 = fnAt(d, sc(v, -1.9));
    return (Number.isFinite(dn) && Math.abs(dn - dn2) < 1e-12 && Math.abs(dn) > 1e-12) ? dn : null;
  }
  function integralRule(term, v) {
    var t = term; while (t.isParenthesisNode) t = t.content;
    if (countVar(t, v) === 0) return 'Constant rule: ∫ c dx = c·x';
    if (t.isSymbolNode) return 'Power rule: ∫ x dx = x²/2';
    if (t.isOperatorNode && t.op === '^' && t.args.length === 2 && countVar(t.args[1], v) === 0 && linearInner(t.args[0], v) !== null) {
      var n = fnAt(strN(t.args[1]), {});
      var lin = !(t.args[0].isSymbolNode);
      if (n === -1) return (lin ? 'Reciprocal rule with u = ' + strN(t.args[0]) + ': ' : 'Reciprocal rule: ') + '∫ 1/u du = ln|u|';
      return (lin ? 'Power rule with the substitution u = ' + strN(t.args[0]) + ': ' : 'Power rule: ') + '∫ u^n du = u^(n+1)/(n+1)';
    }
    if (t.isOperatorNode && t.op === '/' && countVar(t.args[0], v) === 0 && linearInner(t.args[1], v) !== null) return 'Reciprocal rule: ∫ 1/(ax+b) dx = ln|ax+b| / a';
    if (t.isOperatorNode && t.op === '^' && countVar(t.args[0], v) === 0 && linearInner(t.args[1], v) !== null) return 'Exponential rule: ∫ a^u du = a^u / ln(a)';
    if (t.isFunctionNode && t.args.length === 1 && linearInner(t.args[0], v) !== null) {
      var nm = t.fn.name, lin2 = !(t.args[0].isSymbolNode);
      var tbl = { sin: '∫ sin u du = −cos u', cos: '∫ cos u du = sin u', exp: '∫ e^u du = e^u', sqrt: '∫ √u du = (2/3)·u^(3/2)', sinh: '∫ sinh u du = cosh u', cosh: '∫ cosh u du = sinh u' };
      if (tbl[nm]) return (lin2 ? 'Substitution u = ' + strN(t.args[0]) + ' (then divide by u′): ' : 'Standard integral: ') + tbl[nm];
    }
    return 'No single table rule applies. A technique such as substitution, integration by parts or partial fractions is needed; the result below comes from the algebra engine.';
  }
  function bad(F) { return /integrate\(|defint\(|Si\(|Ci\(|Ei\(|erf|Li\(|#|undefined/i.test(F); }
  function simpson(f, a, b, n) {
    n = n || 4000; if (n % 2) n++;
    var h = (b - a) / n, s = f(a) + f(b);
    for (var i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
    return s * h / 3;
  }
  function solveIntegral(input, opts) {
    opts = opts || {};
    var src = C.stripLHS(norm(input)).replace(/^∫\s*/, '').replace(/([\s)\d])d([a-zA-Z])\s*$/, '$1');
    var node = parseOrThrow(src), v = pickVar(node, opts.variable);
    var res = { kind: 'integral', variable: v, steps: [], answers: [], plot: null, headline: '' };
    var aS = opts.a !== undefined ? String(opts.a).trim() : '', bS = opts.b !== undefined ? String(opts.b).trim() : '';
    var definite = aS !== '' && bS !== '';
    res.steps.push(S('Write the integral', definite ? '∫ from ' + aS + ' to ' + bS + ' of  ' + src + '  d' + v : '∫ ' + src + ' d' + v));
    var F = null;
    try { F = nerdamer.integrate(toNerd(src), v).toString(); } catch (e) { F = null; }
    var okF = false;
    if (F && !bad(F)) {
      okF = true;
      [0.6, 1.4, 2.3].forEach(function (x) {
        var h = 1e-5, dn = (numAt(F, v, x + h) - numAt(F, v, x - h)) / (2 * h), fv = numAt(src, v, x);
        if (Number.isFinite(dn) && Number.isFinite(fv) && Math.abs(dn - fv) > 1e-4 * Math.max(1, Math.abs(fv))) okF = false;
      });
    }
    var terms = flattenSum(node, 1, []);
    if (okF) {
      if (terms.length > 1) res.steps.push(S('Split the integral into terms', '∫ f d' + v + ' = ' + terms.map(function (t, i) { return (i ? (t.sign < 0 ? ' − ' : ' + ') : (t.sign < 0 ? '−' : '')) + '∫ ' + strN(t.node) + ' d' + v; }).join(''), 'The integral of a sum is the sum of the integrals.'));
      terms.slice(0, 8).forEach(function (t) {
        var sp = splitConst(t.node, v), lines = [];
        var inner = sp.rest, tf;
        try { tf = nerdamer.integrate(toNerd(strN(inner)), v).toString(); } catch (e) { tf = '?'; }
        if (sp.c) lines.push('Pull out the constant ' + pretty(sp.c) + ':   ∫ ' + strN(t.node) + ' d' + v + ' = ' + pretty(sp.c) + ' · ∫ ' + strN(inner) + ' d' + v);
        lines.push('∫ ' + strN(inner) + ' d' + v + ' = ' + pretty(tf));
        res.steps.push(S('Integrate ' + pretty(strN(t.node)), lines, integralRule(inner, v)));
      });
      if (terms.length > 8) res.steps.push(S('More terms', (terms.length - 8) + ' further terms are included in the total below.'));
      res.steps.push(S('Add the constant of integration', 'F(' + v + ') = ' + F + ' + C', /log\(/.test(F) ? 'ln stands for ln|…| when its argument can be negative.' : ''));
      var dchk = ndiff(F, v);
      res.steps.push(S('Check by differentiating', 'd/d' + v + '[F] = ' + dchk + '   ' + (numAt(dchk, v, 1.1) - numAt(src, v, 1.1) < 1e-6 ? '✓ matches the original function' : '')));
    } else if (!definite) {
      res.steps.push(S('Look for an antiderivative', 'This function has no antiderivative that can be written with elementary functions' + (F && /Si\(|Ci\(|Ei\(|erf/.test(F) ? ' (it needs a special function: ' + pretty(F) + ').' : '.'),
        'Definite integrals of it can still be computed numerically: enter lower and upper limits.'));
      res.headline = 'No elementary antiderivative';
      res.answers.push({ exact: 'No elementary antiderivative' + (F && !bad(F.replace(/Si|Ci|Ei|erf/g, 'q')) ? '' : ''), approx: F && /Si\(|Ci\(|Ei\(|erf/.test(F) ? pretty(F) + ' + C' : null, note: '' });
      res.plot = { items: [{ type: 'fn', expr: varSub(src, v, 'x'), label: 'f(x)' }], points: [] };
      return res;
    }
    if (!definite) {
      res.answers.push({ lhs: '∫ f d' + v, exact: pretty(F) + ' + C', approx: null, note: '' });
      res.headline = '∫ f d' + v + ' = ' + pretty(F) + ' + C';
      var items = [{ type: 'fn', expr: varSub(src, v, 'x'), label: 'f(x)' }, { type: 'fn', expr: varSub(F, v, 'x'), label: 'F(x), one antiderivative (C = 0)', dash: true }];
      res.plot = { items: items, points: [] };
      return res;
    }
    var aV = fnAt(norm(aS).replace(/\binf(inity)?\b/gi, 'Infinity'), {}), bV = fnAt(norm(bS).replace(/\binf(inity)?\b/gi, 'Infinity'), {});
    if (Number.isNaN(aV) || Number.isNaN(bV)) throw new Error('The limits must be numbers such as 0, 3, pi or sqrt(2).');
    var exactVal = null, value = NaN;
    if (okF && Number.isFinite(aV) && Number.isFinite(bV)) {
      var Fa = numAt(F, v, aV), Fb = numAt(F, v, bV);
      if (Number.isFinite(Fa) && Number.isFinite(Fb)) {
        res.steps.push(S('Evaluate the antiderivative at both limits', ['F(' + bS + ') = ' + fmt(Fb, 10), 'F(' + aS + ') = ' + fmt(Fa, 10)], 'Fundamental theorem of calculus: ∫ from a to b of f = F(b) − F(a).'));
        value = Fb - Fa;
        res.steps.push(S('Subtract', 'F(' + bS + ') − F(' + aS + ') = ' + fmt(value, 10)));
        try { var ev = nerdamer.defint(toNerd(src), toNerd(aS), toNerd(bS), v).toString(); if (!bad(ev) && !/\d\.\d{6,}/.test(ev) && !/\d{8,}/.test(ev)) exactVal = ev; } catch (e) { exactVal = null; }
      }
    }
    if (!Number.isFinite(value) && Number.isFinite(aV) && Number.isFinite(bV)) {
      value = simpson(function (x) { return numAt(src, v, x); }, aV, bV, 4000);
      res.steps.push(S('Numerical integration', 'No usable antiderivative, so I use Simpson\'s rule with 4000 strips: ≈ ' + fmt(value, 10)));
    }
    if (!Number.isFinite(value) && (!Number.isFinite(aV) || !Number.isFinite(bV))) {
      try {
        var iv = nerdamer.defint(toNerd(src), toNerd(aS).replace(/\binf(inity)?\b/gi, 'Infinity'), toNerd(bS).replace(/\binf(inity)?\b/gi, 'Infinity'), v).toString();
        if (!bad(iv) && !/\d{8,}/.test(iv)) { exactVal = iv; value = fnAt(iv, {}); res.steps.push(S('Improper integral', 'The limit of F(t) as t → ∞ (or −∞) is used: result = ' + pretty(iv))); }
      } catch (e) { /* ignore */ }
    }
    if (Number.isFinite(aV) && Number.isFinite(bV) && Number.isFinite(value)) {
      var chk = simpson(function (x) { return numAt(src, v, x); }, aV, bV, 2000);
      if (Number.isFinite(chk)) res.steps.push(S('Check with a numerical method', 'Simpson\'s rule gives ' + fmt(chk, 8) + (Math.abs(chk - value) < 1e-6 * Math.max(1, Math.abs(value)) ? '   ✓' : '   (differs; the function may be singular on the interval)')));
    }
    if (!Number.isFinite(value)) throw new Error('This integral does not converge to a finite number on the given limits.');
    var ex = exactVal ? niceExpr(exactVal) : null;
    if (!ex || /\d{8,}/.test(ex)) { ex = null; var pfm = X.piForm ? X.piForm(value) : null; if (pfm && !Number.isInteger(value)) ex = pfm; }
    res.answers.push({ lhs: '∫ from ' + aS + ' to ' + bS, exact: ex && !/^-?\d+(\.\d+)?$/.test(ex) ? pretty(ex) : fmt(value, 10), approx: ex && !/^-?\d+(\.\d+)?$/.test(ex) ? fmt(value, 10) : null, note: 'signed area between the curve and the ' + v + '-axis' });
    res.headline = '∫ = ' + (ex && !/^-?\d+(\.\d+)?$/.test(ex) ? pretty(ex) + ' ≈ ' : '') + fmt(value, 8);
    res.plot = { items: [{ type: 'fn', expr: varSub(src, v, 'x'), label: 'f(x)' }], points: [], shade: { expr: varSub(src, v, 'x'), a: aV, b: bV } };
    return res;
  }

  /* ---------- limits ---------- */
  function solveLimit(input, opts) {
    opts = opts || {};
    var src = C.stripLHS(norm(input)).replace(/^lim\s*/i, '');
    var node = parseOrThrow(src), v = pickVar(node, opts.variable);
    var toS = String(opts.to === undefined || String(opts.to).trim() === '' ? '0' : opts.to).replace(/∞/g, 'Infinity').replace(/\binf(inity)?\b/gi, 'Infinity');
    var a = fnAt(norm(toS), {});
    if (Number.isNaN(a)) throw new Error('The approach value must be a number such as 0, 2, pi, Infinity or -Infinity.');
    var dir = opts.dir || 'both', inf = !Number.isFinite(a);
    var res = { kind: 'limit', variable: v, steps: [], answers: [], plot: null, headline: '' };
    var arrow = v + ' → ' + pretty(toS) + (dir === 'left' ? '⁻' : dir === 'right' ? '⁺' : '');
    res.steps.push(S('Write the limit', 'lim (' + arrow + ')  ' + src));
    var f = function (x) { return numAt(src, v, x); };
    var direct = inf ? NaN : f(a);
    var cas = null, lh = null, casTxt = null;
    if (!inf && Number.isFinite(direct) && dir === 'both') {
      res.steps.push(S('Try direct substitution', 'f(' + pretty(toS) + ') = ' + fmt(direct, 10), 'The function is defined and finite there, so the limit equals this value (the function is continuous at this point).'));
    } else {
      res.steps.push(S('Try direct substitution', inf ? 'The value is infinite, so I look at how f behaves as ' + v + ' grows.' : 'f(' + pretty(toS) + ') is undefined or infinite.'));
      var tn = node.isParenthesisNode ? node.content : node;
      if (tn.isOperatorNode && tn.op === '/' && tn.args.length === 2) {
        var ns = strN(tn.args[0]), ds = strN(tn.args[1]);
        var at = function (s) { return inf ? numAt(s, v, a > 0 ? 1e8 : -1e8) : numAt(s, v, a); };
        var nv = at(ns), dv = at(ds);
        var zeroZero = !inf && Math.abs(nv) < 1e-9 && Math.abs(dv) < 1e-9, infInf = inf && Math.abs(nv) > 1e6 && Math.abs(dv) > 1e6;
        if (zeroZero || infInf) {
          res.steps.push(S('Identify the form', (zeroZero ? '0/0' : '∞/∞') + ' is indeterminate: numerator → ' + (zeroZero ? '0' : '∞') + ' and denominator → ' + (zeroZero ? '0' : '∞') + '.', 'We need another method.'));
          var cn = ns, cd = ds;
          for (var k = 1; k <= 3; k++) {
            cn = ndiff(cn, v); cd = ndiff(cd, v);
            var q = at('(' + cn + ')/(' + cd + ')');
            res.steps.push(S('L\'Hôpital\'s rule' + (k > 1 ? ' (again)' : ''), ['lim f/g = lim f′/g′', 'f′/g′ = (' + cn + ') / (' + cd + ')', 'at ' + pretty(toS) + ':  ' + (Number.isFinite(q) ? (inf ? '≈ ' + fmt(q, 6) : fmt(q, 10)) : 'still indeterminate')]));
            if (Number.isFinite(q)) { lh = q; break; }
          }
        }
      }
    }
    try {
      var casStr = nerdamer('limit(' + toNerd(src) + ',' + v + ',' + (inf ? (a > 0 ? 'Infinity' : '-Infinity') : toNerd(toS)) + ')').toString();
      if (dir === 'both' && !/limit\(|#|undefined/.test(casStr)) {
        var cv = /Infinity/.test(casStr) ? (/^-/.test(casStr) ? -Infinity : Infinity) : fnAt(casStr, {});
        if (!Number.isNaN(cv)) { cas = cv; casTxt = casStr; res.steps.push(S('Simplify with algebra', 'The algebra engine finds  lim = ' + pretty(casStr))); }
      }
    } catch (e) { /* ignore */ }
    var seq = [], tbl = [];
    if (inf) {
      [10, 100, 1000, 1e4, 1e5, 1e6].forEach(function (t) { var x = a > 0 ? t : -t; seq.push({ x: x, y: f(x) }); });
      tbl = seq.map(function (r) { return v + ' = ' + fmt(r.x, 8) + '    f = ' + fmt(r.y, 10); });
    } else {
      var hs = [0.1, 0.01, 0.001, 1e-4, 1e-5, 1e-6];
      var L = hs.map(function (h) { return { x: a - h, y: f(a - h) }; }), R = hs.map(function (h) { return { x: a + h, y: f(a + h) }; });
      tbl = hs.map(function (h, i) { return (dir !== 'right' ? 'from the left  ' + v + ' = ' + fmt(L[i].x, 8) + ': ' + fmt(L[i].y, 8) : '') + (dir === 'both' ? '      ' : '') + (dir !== 'left' ? 'from the right  ' + v + ' = ' + fmt(R[i].x, 8) + ': ' + fmt(R[i].y, 8) : ''); });
      seq = { L: L, R: R };
    }
    res.steps.push(S('Look at values that get closer and closer', tbl, 'A table of values shows what f(' + v + ') approaches.'));
    var verdict;
    var near = function (arr) { return arr[arr.length - 1].y; };
    var lv, rv;
    if (inf) { lv = rv = near(seq); } else { lv = near(seq.L); rv = near(seq.R); }
    var grows = function (arr) { var y1 = arr[arr.length - 2].y, y2 = arr[arr.length - 1].y; return Math.abs(y2) > 1e4 && Math.abs(y2) > Math.abs(y1) * 1.5; };
    var side = function (arr, y) { return grows(arr) ? (y > 0 ? Infinity : -Infinity) : y; };
    var Lv = inf ? side(seq, lv) : side(seq.L, lv), Rv = inf ? Lv : side(seq.R, rv);
    var closeEnough = function (p, q) { return (p === q) || (Number.isFinite(p) && Number.isFinite(q) && Math.abs(p - q) < 1e-4 * Math.max(1, Math.abs(p))); };
    var value;
    if (dir === 'left') value = Lv; else if (dir === 'right') value = Rv;
    else if (closeEnough(Lv, Rv)) value = Number.isFinite(Lv) && Number.isFinite(Rv) ? (Lv + Rv) / 2 : Lv;
    else value = NaN;
    if (dir === 'both' && !closeEnough(Lv, Rv)) {
      verdict = 'The two sides disagree (left → ' + fmt(Lv, 6) + ', right → ' + fmt(Rv, 6) + '), so the limit does not exist.';
      res.steps.push(S('Compare the two sides', verdict)); res.headline = 'The limit does not exist'; res.answers.push({ exact: 'Does not exist', approx: 'left → ' + fmt(Lv, 6) + ',  right → ' + fmt(Rv, 6), note: '' });
    } else {
      if (cas !== null && Number.isFinite(cas)) value = cas;
      else if (lh !== null && Number.isFinite(lh)) value = lh;
      else if (cas !== null && !Number.isFinite(cas)) value = cas;
      if (!inf && Number.isFinite(direct) && dir === 'both') { value = direct; casTxt = null; }
      var txt = !Number.isFinite(value) ? (value > 0 ? '∞' : value < 0 ? '−∞' : 'undefined') : nicePt(value);
      if (Number.isFinite(value) && !Number.isInteger(value) && !bestFraction(value, 1000, 1e-9)) txt = (casTxt && !/\d{8,}/.test(casTxt)) ? pretty(casTxt) : fmt(value, 10);
      if (Number.isFinite(value) && casTxt && /^[a-z]+$/i.test(casTxt)) txt = pretty(casTxt);
      res.steps.push(S('Conclusion', 'lim (' + arrow + ')  f = ' + txt));
      res.answers.push({ lhs: 'lim (' + arrow + ')', exact: txt, approx: Number.isFinite(value) && !Number.isInteger(value) ? fmt(value, 10) : null, note: !Number.isFinite(value) ? 'the function grows without bound' : '' });
      res.headline = 'lim = ' + txt;
    }
    var pts = [];
    if (!inf && Number.isFinite(value)) pts.push({ x: a, y: value, label: 'limit ' + fmt(value, 6), hollow: true });
    res.plot = { items: [{ type: 'fn', expr: varSub(src, v, 'x'), label: 'f(x)' }], points: pts };
    if (!inf) res.plot.center = a;
    return res;
  }

  /* ---------- simplify / expand / factor ---------- */
  function solveAlgebra(input, opts) {
    opts = opts || {};
    var op = opts.op || 'simplify';
    var src = C.stripLHS(norm(input)), node = parseOrThrow(src), v = pickVar(node, opts.variable);
    var res = { kind: 'algebra', variable: v, steps: [], answers: [], plot: null, headline: '' };
    res.steps.push(S('Write the expression', src));
    var cmd = { simplify: 'simplify', expand: 'expand', factor: 'factor', partfrac: 'partfrac' }[op] || 'simplify';
    var out;
    try { out = nerdamer(cmd + '(' + toNerd(src) + (cmd === 'partfrac' ? ',' + v : '') + ')').toString(); } catch (e) { throw new Error('I could not ' + op + ' that expression.'); }
    var title = { simplify: 'Simplify', expand: 'Expand the products and powers', factor: 'Factor into simpler pieces', partfrac: 'Split into partial fractions' }[cmd];
    res.steps.push(S(title, pretty(src) + '   =   ' + pretty(out)));
    var agree = [-2.3, -0.7, 0.45, 1.6, 2.9].every(function (x) {
      var p = numAt(src, v, x), q = numAt(out, v, x);
      return !Number.isFinite(p) || !Number.isFinite(q) || Math.abs(p - q) < 1e-7 * Math.max(1, Math.abs(p));
    });
    res.steps.push(S('Check both forms agree', 'Plugging in several values of ' + v + ' gives the same result for the original and the new form.' + (agree ? '   ✓' : '   ✗ (the forms differ)')));
    if (cmd === 'factor' || cmd === 'expand' || cmd === 'simplify') {
      var pc = X.polyCoeffs(src, v);
      if (pc && pc.length > 2) {
        var roots = X.polyRootsNum(pc).filter(function (z) { return !z.im; });
        if (roots.length) res.steps.push(S('Where it equals zero', roots.map(function (z) { return v + ' = ' + fmt(z.re, 8); }), 'The zeros of a polynomial match the factors that appear in its factored form.'));
      }
    }
    res.answers.push({ lhs: cmd === 'simplify' ? 'Simplified' : cmd === 'expand' ? 'Expanded' : cmd === 'factor' ? 'Factored' : 'Partial fractions', exact: pretty(out), approx: null, note: '' });
    res.headline = pretty(out);
    res.plot = { items: [{ type: 'fn', expr: varSub(src, v, 'x'), label: 'original' }, { type: 'fn', expr: varSub(out, v, 'x'), label: 'result', dash: true }], points: [] };
    return res;
  }

  /* ---------- Taylor series ---------- */
  function solveSeries(input, opts) {
    opts = opts || {};
    var src = C.stripLHS(norm(input)), node = parseOrThrow(src), v = pickVar(node, opts.variable);
    var aS = String(opts.center === undefined || String(opts.center).trim() === '' ? '0' : opts.center);
    var a = fnAt(norm(aS), {}); if (!Number.isFinite(a)) throw new Error('The centre must be a number such as 0, 1 or pi.');
    var n = Math.max(1, Math.min(10, parseInt(opts.order, 10) || 5));
    var res = { kind: 'series', variable: v, steps: [], answers: [], plot: null, headline: '' };
    res.steps.push(S('Write the function', 'f(' + v + ') = ' + src, 'Expanding around ' + v + ' = ' + aS + ' up to degree ' + n + (a === 0 ? ' (a Maclaurin series).' : ' (a Taylor series).')));
    res.steps.push(S('Use the Taylor formula', 'f(' + v + ') ≈ Σ  f⁽ᵏ⁾(a)/k! · (' + v + ' − a)ᵏ,    k = 0, 1, …, ' + n));
    var cur = src, rows = [], coefs = [], exacts = [];
    for (var k = 0; k <= n; k++) {
      if (k > 0) cur = ndiff(cur, v);
      var val = numAt(cur, v, a);
      if (!Number.isFinite(val)) throw new Error('f or one of its derivatives is undefined at ' + v + ' = ' + aS + '. Choose a different centre.');
      var exact = niceExpr(cur.replace(new RegExp('\\b' + v + '\\b', 'g'), '(' + aS + ')'));
      if (/\d{8,}/.test(exact) || !/^[\w+\-*\/^().\s]+$/.test(exact)) exact = nicePt(val);
      var fact = 1; for (var q = 2; q <= k; q++) fact *= q;
      var c = val / fact;
      var ce = niceExpr('(' + exact + ')/' + fact);
      if (/\d{8,}/.test(ce) || !/^[\w+\-*\/^().\s]+$/.test(ce)) ce = nicePt(c);
      coefs.push(c); exacts.push(ce);
      rows.push('k = ' + k + ':   f' + (k ? '⁽' + k + '⁾' : '') + '(' + aS + ') = ' + exact + (k > 1 ? '    ÷ ' + k + '! = ' + ce : ''));
    }
    res.steps.push(S('Compute the derivatives at the centre', rows));
    var terms = [];
    coefs.forEach(function (c, k) {
      if (Math.abs(c) < 1e-14) return;
      var cs = exacts[k].replace(/^-/, ''); if (/[+\-]/.test(cs)) cs = '(' + cs + ')';
      var base = a === 0 ? v : '(' + v + ' − ' + aS + ')';
      var t = k === 0 ? cs : (cs === '1' ? '' : cs + '·') + base + (k > 1 ? '^' + k : '');
      terms.push((terms.length ? (c < 0 ? ' - ' : ' + ') : (c < 0 ? '-' : '')) + t);
    });
    var poly = terms.join('') || '0';
    res.steps.push(S('Assemble the polynomial', 'P' + n + '(' + v + ') = ' + pretty(poly)));
    var test = a + 0.3, ft = numAt(src, v, test);
    var pv = coefs.reduce(function (s, c, k) { return s + c * Math.pow(test - a, k); }, 0);
    res.steps.push(S('Compare with the real function', 'At ' + v + ' = ' + fmt(test, 4) + ':  f = ' + fmt(ft, 8) + ',   P' + n + ' = ' + fmt(pv, 8) + ',   error = ' + fmt(Math.abs(ft - pv), 3)));
    res.answers.push({ lhs: 'P' + n + '(' + v + ')', exact: pretty(poly), approx: null, note: 'Taylor polynomial of degree ' + n });
    res.headline = 'P' + n + '(' + v + ') = ' + pretty(poly);
    var polyX = coefs.map(function (c, k) { return '(' + c + ')*(x-(' + a + '))^' + k; }).join('+');
    res.plot = { items: [{ type: 'fn', expr: varSub(src, v, 'x'), label: 'f(x)' }, { type: 'fn', expr: polyX, label: 'Taylor polynomial, degree ' + n, dash: true }], points: [{ x: a, y: numAt(src, v, a), label: 'centre' }], center: a };
    return res;
  }

  /* ---------- matrices ---------- */
  function parseMatrix(text) {
    var t = String(text || '').replace(/[\[\]]/g, ' ').trim();
    if (!t) return null;
    var rows = t.split(/;|\n/).map(function (r) { return r.trim(); }).filter(Boolean);
    var M = rows.map(function (r) {
      return r.split(/[\s,]+/).filter(Boolean).map(function (e) {
        var v = fnAt(e, {}); if (!Number.isFinite(v)) throw new Error('"' + e + '" is not a number. Matrix entries must be numbers or simple fractions.'); return v;
      });
    });
    var w = M[0].length;
    if (M.some(function (r) { return r.length !== w; })) throw new Error('Every row must have the same number of entries.');
    return M;
  }
  function opsFor(M) { return M.every(function (r) { return r.every(function (x) { return Q.from(x); }); }) ? Q : FL; }
  function toOps(M, ops) { return M.map(function (r) { return r.map(function (x) { return ops.from(x); }); }); }
  function strM(M, ops) { return M.map(function (r) { return r.map(ops.str); }); }
  function solveMatrix(input, opts) {
    opts = opts || {};
    var A = parseMatrix(input), B = opts.B ? parseMatrix(opts.B) : null, op = opts.op || 'det';
    if (!A) throw new Error('Enter the matrix: one row per line, entries separated by spaces or commas.');
    var res = { kind: 'matrix', steps: [], answers: [], plot: null, headline: '' };
    var r = A.length, c = A[0].length, ops = opsFor(A);
    var Aq = toOps(A, ops);
    res.steps.push(S('Matrix A (' + r + '×' + c + ')', { matrix: strM(Aq, ops), label: 'A' }));
    var needSquare = function () { if (r !== c) throw new Error('This operation needs a square matrix, but A is ' + r + '×' + c + '.'); };
    var addMat = function (lhs, M2, o2) { res.answers.push({ lhs: lhs, matrix: strM(M2, o2 || ops), exact: '', approx: null, note: '' }); };
    var det = function (M) {
      var n = M.length;
      if (n === 1) return M[0][0];
      if (n === 2) return M[0][0] * M[1][1] - M[0][1] * M[1][0];
      var s = 0;
      for (var j = 0; j < n; j++) s += (j % 2 ? -1 : 1) * M[0][j] * det(M.slice(1).map(function (row) { return row.filter(function (_, k) { return k !== j; }); }));
      return s;
    };
    if (op === 'det') {
      needSquare();
      var d = det(A);
      if (r === 1) res.steps.push(S('1×1 determinant', 'det(A) = ' + fmt(A[0][0])));
      else if (r === 2) res.steps.push(S('2×2 determinant: ad − bc', ['det(A) = (' + A[0][0] + ')(' + A[1][1] + ') − (' + A[0][1] + ')(' + A[1][0] + ')', 'det(A) = ' + fmt(A[0][0] * A[1][1]) + ' − ' + fmt(A[0][1] * A[1][0]), 'det(A) = ' + fmt(d)]));
      else if (r === 3) {
        var minors = [0, 1, 2].map(function (j) { var m = A.slice(1).map(function (row) { return row.filter(function (_, k) { return k !== j; }); }); return { j: j, m: m, d: m[0][0] * m[1][1] - m[0][1] * m[1][0] }; });
        res.steps.push(S('Expand along the first row (cofactors)', 'det(A) = a₁₁·M₁₁ − a₁₂·M₁₂ + a₁₃·M₁₃', 'Each minor Mᵢⱼ is the determinant left after deleting row i and column j.'));
        minors.forEach(function (mn) { res.steps.push(S('Minor M1' + (mn.j + 1), ['M1' + (mn.j + 1) + ' = (' + mn.m[0][0] + ')(' + mn.m[1][1] + ') − (' + mn.m[0][1] + ')(' + mn.m[1][0] + ') = ' + fmt(mn.d)])); });
        res.steps.push(S('Combine', 'det(A) = (' + A[0][0] + ')(' + fmt(minors[0].d) + ') − (' + A[0][1] + ')(' + fmt(minors[1].d) + ') + (' + A[0][2] + ')(' + fmt(minors[2].d) + ') = ' + fmt(d)));
      } else res.steps.push(S('Cofactor expansion', 'For a ' + r + '×' + r + ' matrix the determinant is found by repeated cofactor expansion along the first row.', 'Result: det(A) = ' + fmt(d)));
      res.answers.push({ lhs: 'det(A)', exact: fmt(d, 10), approx: null, note: Math.abs(d) < 1e-12 ? 'The matrix is singular (no inverse).' : '' });
      res.headline = 'det(A) = ' + fmt(d, 10);
    } else if (op === 'inverse') {
      needSquare();
      var dd = det(A);
      res.steps.push(S('Check the determinant', 'det(A) = ' + fmt(dd, 10), Math.abs(dd) < 1e-12 ? 'The determinant is 0, so A has no inverse.' : 'The determinant is not 0, so the inverse exists.'));
      if (Math.abs(dd) < 1e-12) throw new Error('This matrix is singular (determinant 0), so it has no inverse.');
      if (r === 2) {
        res.steps.push(S('Use the 2×2 formula', ['A⁻¹ = 1/det · [ d  −b ; −c  a ]', 'A⁻¹ = 1/' + fmt(dd) + ' · [ ' + fmt(A[1][1]) + '  ' + fmt(-A[0][1]) + ' ; ' + fmt(-A[1][0]) + '  ' + fmt(A[0][0]) + ' ]']));
      }
      var aug = Aq.map(function (row, i) { return row.concat(Array.apply(null, Array(r)).map(function (_, j) { return ops.from(i === j ? 1 : 0); })); });
      res.steps.push(S('Augment with the identity matrix [A | I]', { matrix: strM(aug, ops), aug: true, split: r }));
      var gj = X.gaussJordan(aug, ops);
      gj.steps.slice(0, 24).forEach(function (st, i) { res.steps.push(S('Row operation ' + (i + 1) + ':  ' + st.op, { matrix: st.M, aug: true, split: r })); });
      if (gj.steps.length > 24) res.steps.push(S('More row operations', (gj.steps.length - 24) + ' further operations lead to the final form.'));
      var inv = gj.M.map(function (row) { return row.slice(r); });
      res.steps.push(S('Read A⁻¹ from the right-hand block', { matrix: strM(inv, ops), label: 'A⁻¹' }));
      var prod = core.multiply(A, inv.map(function (row) { return row.map(ops.val); }));
      res.steps.push(S('Check: A · A⁻¹ = I', { matrix: prod.map(function (row) { return row.map(function (x) { return fmt(Math.abs(x) < 1e-10 ? 0 : x, 6); }); }), label: 'A·A⁻¹' }));
      addMat('A⁻¹', inv); res.headline = 'A⁻¹ computed';
    } else if (op === 'transpose') {
      var T = Aq[0].map(function (_, j) { return Aq.map(function (row) { return row[j]; }); });
      res.steps.push(S('Swap rows and columns', 'The entry in row i, column j moves to row j, column i.'));
      addMat('Aᵀ', T); res.headline = 'Aᵀ computed';
    } else if (op === 'trace') {
      needSquare();
      var tr = A.reduce(function (s, row, i) { return s + row[i]; }, 0);
      res.steps.push(S('Add the diagonal entries', 'trace(A) = ' + A.map(function (row, i) { return fmt(row[i]); }).join(' + ') + ' = ' + fmt(tr)));
      res.answers.push({ lhs: 'trace(A)', exact: fmt(tr, 10), approx: null, note: '' }); res.headline = 'trace(A) = ' + fmt(tr, 10);
    } else if (op === 'rref' || op === 'rank') {
      var augz = Aq.map(function (row) { return row.concat([ops.from(0)]); });
      var g2 = X.gaussJordan(augz, ops);
      g2.steps.slice(0, 24).forEach(function (st, i) { res.steps.push(S('Row operation ' + (i + 1) + ':  ' + st.op, { matrix: st.M.map(function (row) { return row.slice(0, c); }) })); });
      var rr = g2.M.map(function (row) { return row.slice(0, c); });
      if (op === 'rref') { addMat('RREF(A)', rr); res.headline = 'Reduced row echelon form'; }
      res.steps.push(S('Count the pivots', 'The reduced matrix has ' + g2.pivs.length + ' nonzero row' + (g2.pivs.length === 1 ? '' : 's') + ', so the rank is ' + g2.pivs.length + '.'));
      if (op === 'rank') { res.answers.push({ lhs: 'rank(A)', exact: String(g2.pivs.length), approx: null, note: '' }); res.headline = 'rank(A) = ' + g2.pivs.length; }
    } else if (op === 'eigen') {
      needSquare();
      var ev;
      try { ev = core.eigs(A); } catch (e) { throw new Error('Eigenvalues could not be found for this matrix.'); }
      var vals = (ev.values.toArray ? ev.values.toArray() : ev.values);
      if (r === 2) {
        var trc = A[0][0] + A[1][1], dt = det(A);
        res.steps.push(S('Characteristic equation det(A − λI) = 0', ['λ² − trace·λ + det = 0', 'λ² − (' + fmt(trc) + ')λ + (' + fmt(dt) + ') = 0']));
        var ints = X.toInts([dt, -trc, 1]);
        if (ints) { var qe = X.quadExact(ints[2], ints[1], ints[0]); res.steps.push(S('Solve the quadratic', qe.roots.map(function (z) { return 'λ = ' + z.s; }))); }
      } else res.steps.push(S('Characteristic equation', 'The eigenvalues are the roots of det(A − λI) = 0, found here numerically.'));
      vals.forEach(function (lam, i) {
        var lt = typeof lam === 'number' ? fmt(lam, 8) : C.fmtC(lam, 6);
        res.answers.push({ lhs: 'λ' + (i + 1), exact: lt, approx: null, note: '' });
      });
      if (ev.eigenvectors) {
        ev.eigenvectors.forEach(function (e, i) {
          var vec = (e.vector.toArray ? e.vector.toArray() : e.vector).map(function (x) { return typeof x === 'number' ? fmt(x, 5) : C.fmtC(x, 4); });
          res.answers.push({ lhs: 'v' + (i + 1), exact: '[ ' + vec.join(', ') + ' ]', approx: null, note: 'eigenvector for λ = ' + (typeof e.value === 'number' ? fmt(e.value, 6) : C.fmtC(e.value, 4)) });
        });
      }
      res.headline = 'Eigenvalues: ' + vals.map(function (l) { return typeof l === 'number' ? fmt(l, 6) : C.fmtC(l, 4); }).join(', ');
    } else if (op === 'power') {
      needSquare();
      var pw = parseInt(opts.power, 10); if (!Number.isFinite(pw) || pw < 0 || pw > 30) throw new Error('Enter a whole-number power between 0 and 30.');
      var cur = core.identity(r).toArray ? core.identity(r).toArray() : core.identity(r);
      for (var i = 0; i < pw; i++) cur = core.multiply(cur, A);
      res.steps.push(S('Multiply A by itself ' + pw + ' time' + (pw === 1 ? '' : 's'), 'Aⁿ = A · A · … · A  (n factors).'));
      res.answers.push({ lhs: 'A^' + pw, matrix: cur.map(function (row) { return row.map(function (x) { return fmt(x, 8); }); }), exact: '', approx: null, note: '' });
      res.headline = 'A^' + pw + ' computed';
    } else if (op === 'multiply' || op === 'add' || op === 'subtract') {
      if (!B) throw new Error('Enter matrix B as well.');
      var Bq = toOps(B, opsFor(B));
      res.steps.push(S('Matrix B (' + B.length + '×' + B[0].length + ')', { matrix: strM(Bq, opsFor(B)), label: 'B' }));
      var out;
      if (op === 'multiply') {
        if (c !== B.length) throw new Error('A has ' + c + ' columns but B has ' + B.length + ' rows. For A·B they must match.');
        res.steps.push(S('Check the sizes', 'A is ' + r + '×' + c + ' and B is ' + B.length + '×' + B[0].length + ', so A·B is ' + r + '×' + B[0].length + '.'));
        res.steps.push(S('Each entry is a row of A times a column of B', 'entry (1,1) = ' + A[0].map(function (x, k) { return '(' + fmt(x) + ')(' + fmt(B[k][0]) + ')'; }).join(' + ') + ' = ' + fmt(A[0].reduce(function (s, x, k) { return s + x * B[k][0]; }, 0))));
        out = core.multiply(A, B);
      } else {
        if (r !== B.length || c !== B[0].length) throw new Error('For ' + (op === 'add' ? 'addition' : 'subtraction') + ' both matrices must have the same size.');
        res.steps.push(S((op === 'add' ? 'Add' : 'Subtract') + ' matching entries', 'Entry (i,j) of the result = A(i,j) ' + (op === 'add' ? '+' : '−') + ' B(i,j).'));
        out = op === 'add' ? core.add(A, B) : core.subtract(A, B);
      }
      var arr = out.toArray ? out.toArray() : out;
      res.answers.push({ lhs: op === 'multiply' ? 'A·B' : (op === 'add' ? 'A + B' : 'A − B'), matrix: arr.map(function (row) { return row.map(function (x) { return fmt(x, 8); }); }), exact: '', approx: null, note: '' });
      res.headline = 'Result computed';
    } else throw new Error('Choose a matrix operation.');
    return res;
  }

  /* ---------- dispatcher ---------- */
  function detectMode(input) {
    var s = String(input || '');
    if (/[<>≤≥]/.test(s)) return 'inequality';
    var eq = (s.match(/=/g) || []).length;
    if (/[\n;]/.test(s.trim()) && eq >= 2) return 'system';
    if (eq >= 2 && /,/.test(s)) return 'system';
    if (eq >= 1) return 'equation';
    return 'simplify';
  }
  function solve(mode, input, opts) {
    try {
      opts = opts || {};
      if (mode === 'auto') mode = detectMode(input);
      input = C.userNorm(input);
      ['a', 'b', 'to', 'center', 'point', 'power', 'B'].forEach(function (k) { if (typeof opts[k] === 'string') opts[k] = C.userNorm(opts[k]); });
      var out;
      if (mode === 'equation') out = X.solveEquation(input, opts);
      else if (mode === 'system') out = X.solveSystem(input, opts);
      else if (mode === 'inequality') out = X.solveInequality(input, opts);
      else if (mode === 'derivative') out = solveDerivative(input, opts);
      else if (mode === 'integral') out = solveIntegral(input, opts);
      else if (mode === 'limit') out = solveLimit(input, opts);
      else if (mode === 'simplify') out = solveAlgebra(input, opts);
      else if (mode === 'series') out = solveSeries(input, opts);
      else if (mode === 'matrix') out = solveMatrix(input, opts);
      else throw new Error('Unknown problem type.');
      out.mode = mode;
      return out;
    } catch (e) {
      return { error: friendlyError(e), mode: mode };
    }
  }

  MB.solve = solve;
  MB.detectMode = detectMode;
  MB.calculus = { ndiff: ndiff, simpson: simpson };
})(globalThis.MB = globalThis.MB || {});
