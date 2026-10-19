/* MiMath engine: core helpers, formatting, expression steps, statistics */
(function (MB) {
  'use strict';

  var core = math;                       // radians; used by Solve, Graph, Charts
  var calc = math.create(math.all);      // angle-aware instance; used by the calculator
  var angle = { mode: 'deg' };

  var CONSTS = new Set(['pi', 'e', 'i', 'Infinity', 'NaN', 'phi', 'tau', 'true', 'false', 'null', 'LN2', 'LN10',
    'LOG2E', 'LOG10E', 'SQRT2', 'SQRT1_2', 'PI', 'E', 'undefined', 'deg', 'rad', 'grad']);

  /* ---------- angle-aware trig for the calculator instance ---------- */
  var TRIG_IN = ['sin', 'cos', 'tan', 'sec', 'csc', 'cot'];
  var TRIG_OUT = ['asin', 'acos', 'atan', 'acot', 'asec', 'acsc'];
  var orig = {};
  TRIG_IN.concat(TRIG_OUT).forEach(function (n) { orig[n] = calc[n]; });
  var snap = function (r) { return (typeof r === 'number' && Math.abs(r) < 1e-14) ? 0 : r; };
  var over = {};
  TRIG_IN.forEach(function (n) {
    over[n] = function (x) {
      if (angle.mode === 'deg' && typeof x === 'number') {
        if (n === 'tan' && Math.abs((((x % 180) + 180) % 180) - 90) < 1e-12) throw new Error('tan is undefined for odd multiples of 90°.');
        return snap(orig[n](x * Math.PI / 180));
      }
      return snap(orig[n](x));
    };
  });
  TRIG_OUT.forEach(function (n) {
    over[n] = function (x) {
      var r = orig[n](x);
      if (angle.mode === 'deg' && typeof r === 'number') return snap(r * 180 / Math.PI);
      return r;
    };
  });
  calc.import(over, { override: true });

  var extras = {
    ln: function (x) { return core.log(x); },
    logb: function (x, b) { return Math.log(x) / Math.log(b); },
    nCr: function (n, k) { return core.combinations(n, k); },
    nPr: function (n, k) { return core.permutations(n, k); },
    root: function (x, n) { return core.nthRoot(x, n); },
    sech: function (x) { return 1 / Math.cosh(x); },
    csch: function (x) { return 1 / Math.sinh(x); }
  };
  try { core.import(extras, { silent: true }); } catch (e) { /* already imported */ }
  try { calc.import(extras, { silent: true }); } catch (e) { /* already imported */ }

  /* ---------- text normalisation ---------- */
  function norm(s) {
    return String(s == null ? '' : s)
      .replace(/[×·⋅∙]/g, '*').replace(/÷/g, '/').replace(/[−–—]/g, '-')
      .replace(/√\s*(\d+(?:\.\d+)?|pi|[a-zA-Z])/g, 'sqrt($1)')
      .replace(/π/g, 'pi').replace(/θ/g, 'theta').replace(/√/g, 'sqrt').replace(/∛/g, 'cbrt')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/°/g, ' deg')
      .replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/≠/g, '!=')
      .replace(/\bAns\b/g, 'ans')
      .trim();
  }
  /* user-level text: log = base 10, ln = natural. Apply once, where text enters the app. */
  function userNorm(s) {
    return norm(s).replace(/\b(ln|log)\(/g, function (m, f) { return f === 'ln' ? 'log(' : 'log10('; });
  }
  function toNerd(s) {
    return norm(s).replace(/\bln\(/g, 'log(').replace(/\s*\bdeg\b/g, '*pi/180')
      .replace(/\blog2\(([^()]*)\)/g, '(log($1)/log(2))')
      .replace(/\blog10\(/g, 'log10(');
  }

  function friendlyError(e) {
    var m = String((e && e.message) || e || 'Something went wrong.');
    if (/Unexpected end of expression/i.test(m)) return 'The expression looks unfinished. Check for a missing number or a closing bracket.';
    if (/Parenthesis \) expected/i.test(m)) return 'A closing bracket ) is missing.';
    if (/Value expected/i.test(m)) return 'A number or value is missing after an operator.';
    if (/Undefined symbol (\w+)/i.test(m)) return 'Unknown name "' + (m.match(/Undefined symbol (\w+)/i) || [])[1] + '". Use numbers, or a known function such as sin( or sqrt(.';
    if (/Undefined function (\w+)/i.test(m)) return 'Unknown function "' + (m.match(/Undefined function (\w+)/i) || [])[1] + '". Try sin, cos, tan, sqrt, ln, log, abs, exp.';
    if (/Unexpected operator/i.test(m)) return 'Two operators in a row. Check the expression.';
    if (/Unexpected type of argument/i.test(m)) return 'That function does not accept this kind of input.';
    if (/Too (few|many) arguments/i.test(m)) return 'This function got the wrong number of inputs. For a logarithm in another base use logb(x, base).';
    return m;
  }

  /* ---------- number formatting ---------- */
  function sci(v, d) {
    var parts = v.toExponential(Math.max(1, d - 1)).split('e');
    var mant = parts[0].indexOf('.') >= 0 ? parts[0].replace(/0+$/, '').replace(/\.$/, '') : parts[0];
    return mant + '×10^' + parseInt(parts[1], 10);
  }
  function fmt(v, digits) {
    digits = digits || 12;
    if (v === undefined || v === null) return '';
    if (typeof v === 'number') {
      if (Number.isNaN(v)) return 'undefined';
      if (!Number.isFinite(v)) return v > 0 ? '∞' : '-∞';
      var a = Math.abs(v);
      if (a !== 0 && (a >= 1e15 || a < 1e-9)) return sci(v, digits);
      var s = String(parseFloat(v.toPrecision(digits)));
      if (/e/.test(s)) return sci(v, digits);
      return s;
    }
    if (typeof v === 'boolean') return String(v);
    if (typeof v === 'string') return v;
    if (v && v.isFraction) return fmt(v.valueOf(), digits);
    if (v && typeof v.re === 'number' && typeof v.im === 'number') return fmtC(v, digits);
    try { return core.format(v, { precision: digits }); } catch (e) { return String(v); }
  }
  function fmtC(z, d) {
    d = d || 8;
    var re = Math.abs(z.re) < 1e-10 ? 0 : z.re, im = Math.abs(z.im) < 1e-10 ? 0 : z.im;
    if (im === 0) return fmt(re, d);
    var imS = Math.abs(im) === 1 ? '' : fmt(Math.abs(im), d);
    if (re === 0) return (im < 0 ? '-' : '') + imS + 'i';
    return fmt(re, d) + (im < 0 ? ' - ' : ' + ') + imS + 'i';
  }
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function pretty(s) {
    return String(s == null ? '' : s)
      .replace(/\s*\*\s*/g, '*').replace(/\s*\^\s*/g, '^').replace(/\s*\/\s*/g, '/')
      .replace(/\bsqrt\(/g, '√(').replace(/\bcbrt\(/g, '∛(')
      .replace(/\bpi\b/g, 'π').replace(/\btheta\b/g, 'θ')
      .replace(/\b[Ii]nfinity\b/g, '∞')
      .replace(/<=/g, '≤').replace(/>=/g, '≥').replace(/!=/g, '≠')
      .replace(/\basin\(/g, 'sin⁻¹(').replace(/\bacos\(/g, 'cos⁻¹(').replace(/\batan\(/g, 'tan⁻¹(')
      .replace(/\blog10\(/g, 'LOGTEN(').replace(/\blog\(/g, 'ln(').replace(/LOGTEN\(/g, 'log₁₀(')
      .replace(/\^\((-?\d+)\)/g, function (m, d) { return d.split('').map(function (c) { return SUP[c]; }).join(''); })
      .replace(/\^(-?\d+)(?![\d.])/g, function (m, d) { return d.split('').map(function (c) { return SUP[c]; }).join(''); })
      .replace(/\^x\b/g, 'ˣ')
      .replace(/(\d(?:\.\d+)?)\*(?=\d)/g, '$1×')
      .replace(/(\d)\*(?=[a-zA-Zπ√∛(])/g, '$1')
      .replace(/\*/g, '·')
      .replace(/\s+deg\b/g, '°')
      .replace(/√\((\d+|[A-Za-z]+)\)/g, '√$1')
      .replace(/(^|[\s+\-*/^,(=])\(([A-Za-z0-9.π]+)\)(?![A-Za-z0-9(])/g, '$1$2')
      .replace(/-(?=[\d(a-zA-Zπ√])/g, '−');
  }

  function bestFraction(x, maxDen, tol) {
    maxDen = maxDen || 10000; tol = tol || 1e-11;
    if (!Number.isFinite(x) || Number.isInteger(x)) return null;
    var sign = x < 0 ? -1 : 1; x = Math.abs(x);
    var h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = x;
    for (var i = 0; i < 40; i++) {
      var a = Math.floor(b);
      var h2 = a * h1 + h0, k2 = a * k1 + k0;
      if (k2 > maxDen) break;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      if (Math.abs(x - h1 / k1) <= tol * Math.max(1, x)) return { n: sign * h1, d: k1 };
      var fr = b - a;
      if (fr < 1e-15) break;
      b = 1 / fr;
    }
    return null;
  }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function fracStr(n, d) {
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d) || 1; n /= g; d /= g;
    return d === 1 ? String(n) : n + '/' + d;
  }

  /* ---------- evaluation helpers ---------- */
  var cc = new Map();
  function compile(src) {
    var n = norm(src), c = cc.get(n);
    if (!c) { c = core.compile(n); cc.set(n, c); if (cc.size > 400) cc.clear(); }
    return c;
  }
  function num(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    if (v && v.isFraction) return v.valueOf();
    if (v && typeof v.re === 'number' && typeof v.im === 'number') return Math.abs(v.im) < 1e-12 ? v.re : NaN;
    return NaN;
  }
  function fnAt(src, scope) {
    try { return num(compile(src).evaluate(Object.assign({}, scope))); } catch (e) { return NaN; }
  }
  function nodeVars(node) {
    var set = new Set();
    node.traverse(function (n, path, parent) {
      if (n.isSymbolNode) {
        if (parent && parent.isFunctionNode && path === 'fn') return;
        if (CONSTS.has(n.name)) return;
        set.add(n.name);
      }
    });
    return set;
  }
  function countVar(node, v) {
    var c = 0;
    node.traverse(function (n, path, parent) {
      if (n.isSymbolNode && n.name === v && !(parent && parent.isFunctionNode && path === 'fn')) c++;
    });
    return c;
  }
  function stripLHS(s) {
    return String(s).replace(/^\s*(?:[yfgh]\s*\(\s*[a-zA-Z]\s*\)|y)\s*=(?!=)\s*/i, '');
  }
  function splitEq(s) {
    for (var i = 0; i < s.length; i++) {
      if (s[i] === '=') {
        var p = s[i - 1], q = s[i + 1];
        if (p === '<' || p === '>' || p === '!' || p === '=' || q === '=') continue;
        return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
      }
    }
    return [s.trim(), '0'];
  }
  function splitTop(s, sep) {
    var out = [], depth = 0, cur = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === '(' || ch === '[') depth++;
      if (ch === ')' || ch === ']') depth--;
      if (ch === sep && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur);
    return out.map(function (t) { return t.trim(); }).filter(Boolean);
  }

  /* ---------- result description for the calculator ---------- */
  function hasTrig(s) { return /\b(a?(sin|cos|tan|sec|csc|cot)h?)\(/.test(s); }
  function exactForm(src, val, mode) {
    try {
      if (typeof val !== 'number' || !Number.isFinite(val) || Number.isInteger(val)) return null;
      var n = norm(src);
      if (mode === 'deg' && hasTrig(n)) return null;
      var tree = core.parse(n);
      if (nodeVars(tree).size) return null;
      var t = nerdamer(toNerd(n)).toString();
      if (/^-?\d+(\.\d+)?$/.test(t) || /^-?\d+\/\d+$/.test(t)) return null;
      if (!/[a-zA-Z]/.test(t.replace(/e[+-]?\d+/i, ''))) return null;
      if (/\d\.\d{6,}/.test(t) || /Si\(|Ci\(|integrate|factorial|#/.test(t)) return null;
      var back = fnAt(t, {});
      if (!Number.isFinite(back) || Math.abs(back - val) > 1e-9 * Math.max(1, Math.abs(val))) return null;
      return t;
    } catch (e) { return null; }
  }
  function describeResult(src, val, mode) {
    var out = { main: fmt(val), type: 'number', fraction: null, exact: null };
    if (typeof val === 'number') {
      var f = bestFraction(val, 10000, 1e-11);
      if (f && f.d > 1) out.fraction = f.n + '/' + f.d;
      out.exact = exactForm(src, val, mode);
      if (out.exact && out.fraction && pretty(out.exact) === out.fraction) out.exact = null;
    } else if (val && typeof val.re === 'number') out.type = 'complex';
    else if (val && val.isMatrix) { out.type = 'matrix'; out.main = core.format(val, { precision: 8 }); }
    else if (typeof val === 'boolean') out.type = 'boolean';
    else if (val && val.type === 'Unit') out.type = 'unit';
    return out;
  }

  /* ---------- order-of-operations steps ---------- */
  function roundLong(s) {
    return s.replace(/\d+\.\d{9,}(e[+-]?\d+)?/g, function (m) { return String(parseFloat(parseFloat(m).toPrecision(10))); });
  }
  function exprSteps(src, M, scope) {
    M = M || calc;
    var tree;
    try { tree = M.parse(norm(src)); } catch (e) { return null; }
    var CN = M.ConstantNode, ON = M.OperatorNode, PN = M.ParenthesisNode;
    var ALLOWED = { ConstantNode: 1, OperatorNode: 1, ParenthesisNode: 1, FunctionNode: 1, SymbolNode: 1 };
    var bad = false;
    tree.traverse(function (n) { if (!ALLOWED[n.type]) bad = true; });
    if (bad) return null;
    function mkNum(v, wrap) {
      var n = v < 0 ? new ON('-', 'unaryMinus', [new CN(-v)]) : new CN(v);
      return (v < 0 && wrap) ? new PN(n) : n;
    }
    tree = tree.transform(function (n, path, parent) {
      if (n.isSymbolNode && scope && Object.prototype.hasOwnProperty.call(scope, n.name) && !(parent && parent.isFunctionNode && path === 'fn')) {
        var sv = scope[n.name];
        if (typeof sv === 'number' && Number.isFinite(sv)) return mkNum(sv, true);
      }
      return n;
    });
    if (nodeVars(tree).size) return null;
    var isNeg = function (n) { return n.isOperatorNode && n.fn === 'unaryMinus' && n.args.length === 1 && n.args[0].isConstantNode; };
    var isVal = function (n) {
      return n.isConstantNode || (n.isSymbolNode && CONSTS.has(n.name)) || isNeg(n) || (n.isParenthesisNode && isVal(n.content));
    };
    var isReady = function (n) {
      return (n.isOperatorNode && n.args.every(isVal) && !isNeg(n)) ||
        (n.isFunctionNode && n.args.length > 0 && n.args.every(isVal) && n.fn && n.fn.isSymbolNode);
    };
    var rankOf = function (n) {
      if (n.isFunctionNode) return 0;
      if (n.args.length === 1 || n.op === '^' || n.op === '!') return 0;
      if (n.op === '+' || n.op === '-') return 2;
      return 1;
    };
    function collect(n, depth, out) {
      if (n.isParenthesisNode) { collect(n.content, depth + 1, out); return; }
      if (isReady(n)) { out.push({ node: n, depth: depth, rank: rankOf(n), idx: out.length }); return; }
      if (n.isOperatorNode) n.args.forEach(function (a) { collect(a, depth, out); });
      else if (n.isFunctionNode) n.args.forEach(function (a) { collect(a, depth + 1, out); });
    }
    var show = function (t) { return roundLong(t.toString({ parenthesis: 'keep', implicit: 'show' })); };
    var start = show(tree);
    var steps = [];
    var ruleName = function (b) {
      var n = b.node;
      if (b.depth > 0) return 'Brackets first';
      if (n.isFunctionNode) return 'Function';
      if (n.op === '^') return 'Exponent';
      if (n.op === '!') return 'Factorial';
      if (n.args && n.args.length === 1) return 'Negate';
      if (n.op === '*' || n.op === '/' || n.op === 'mod' || n.op === '%') return 'Multiply / divide';
      return 'Add / subtract';
    };
    for (var k = 0; k < 40; k++) {
      if (isVal(tree)) break;
      var cand = []; collect(tree, 0, cand);
      if (!cand.length) return null;
      cand.sort(function (a, b) { return (b.depth - a.depth) || (a.rank - b.rank) || (a.idx - b.idx); });
      var best = cand[0], val;
      try { val = M.evaluate(best.node.toString({ parenthesis: 'keep', implicit: 'show' })); } catch (e) { return null; }
      if (typeof val !== 'number') return null;
      var before = show(best.node);
      tree = tree.transform(function (n, path, parent) {
        if (n === best.node) {
          var wrap = val < 0 && parent && parent.isOperatorNode &&
            !((parent.op === '+' || parent.op === '-') && parent.args.length === 2 && parent.args[0] === n);
          return mkNum(val, wrap);
        }
        return n;
      });
      for (var pass = 0; pass < 3; pass++) {
        tree = tree.transform(function (n) {
          return (n.isParenthesisNode && (n.content.isConstantNode || n.content.isSymbolNode)) ? n.content : n;
        });
      }
      steps.push({ rule: ruleName(best), calc: before.replace(/^\((.*)\)$/, '$1') + ' = ' + fmt(val, 10), expr: show(tree) });
    }
    if (!steps.length) return null;
    return { start: start, steps: steps };
  }

  /* ---------- statistics ---------- */
  function describe(a) {
    var n = a.length, s = a.slice().sort(function (x, y) { return x - y; });
    var sum = a.reduce(function (p, c) { return p + c; }, 0), mean = sum / n;
    var q = function (p) { var pos = (n - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos); return s[lo] + (s[hi] - s[lo]) * (pos - lo); };
    var ss = a.reduce(function (p, c) { return p + Math.pow(c - mean, 2); }, 0);
    var counts = new Map(); a.forEach(function (v) { counts.set(v, (counts.get(v) || 0) + 1); });
    var mx = Math.max.apply(null, Array.from(counts.values()));
    var modes = mx > 1 ? Array.from(counts).filter(function (e) { return e[1] === mx; }).map(function (e) { return e[0]; }) : [];
    return {
      n: n, sum: sum, mean: mean, median: q(0.5), q1: q(0.25), q3: q(0.75), min: s[0], max: s[n - 1], range: s[n - 1] - s[0],
      varP: ss / n, varS: n > 1 ? ss / (n - 1) : NaN, sdP: Math.sqrt(ss / n), sdS: n > 1 ? Math.sqrt(ss / (n - 1)) : NaN,
      modes: modes, sorted: s, ss: ss
    };
  }

  MB.core = {
    core: core, calc: calc, angle: angle, CONSTS: CONSTS, norm: norm, toNerd: toNerd, friendlyError: friendlyError,
    fmt: fmt, fmtC: fmtC, pretty: pretty, userNorm: userNorm, bestFraction: bestFraction, gcd: gcd, fracStr: fracStr,
    compile: compile, num: num, fnAt: fnAt, nodeVars: nodeVars, countVar: countVar, stripLHS: stripLHS, splitEq: splitEq,
    splitTop: splitTop, describeResult: describeResult, exprSteps: exprSteps, describe: describe, hasTrig: hasTrig, roundLong: roundLong
  };
})(globalThis.MB = globalThis.MB || {});
