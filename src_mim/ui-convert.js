/* ---------- unit and number converters ---------- */
(function (MB) {
  'use strict';
  if (!MB.ui) return;
  const U = MB.ui, el = U.el, root = U.$('#v-convert');
  if (!root) return;

  /* [name, symbol, size in the base unit] */
  const CATS = {
    'Length': { base: 'metre', units: [['Kilometre', 'km', 1000], ['Metre', 'm', 1], ['Decimetre', 'dm', 0.1], ['Centimetre', 'cm', 0.01], ['Millimetre', 'mm', 0.001], ['Micrometre', 'µm', 1e-6], ['Nanometre', 'nm', 1e-9], ['Picometre', 'pm', 1e-12], ['Angstrom', 'Å', 1e-10], ['Mile', 'mi', 1609.344], ['Yard', 'yd', 0.9144], ['Foot', 'ft', 0.3048], ['Inch', 'in', 0.0254], ['Nautical mile', 'nmi', 1852], ['Furlong', 'fur', 201.168], ['Light-year', 'ly', 9460730472580800], ['Astronomical unit', 'au', 149597870700], ['Parsec', 'pc', 3.0856775814913673e16]], def: ['km', 'cm', 5] },
    'Mass': { base: 'kilogram', units: [['Tonne', 't', 1000], ['Kilogram', 'kg', 1], ['Gram', 'g', 0.001], ['Milligram', 'mg', 1e-6], ['Microgram', 'µg', 1e-9], ['Pound', 'lb', 0.45359237], ['Ounce', 'oz', 0.028349523125], ['Stone', 'st', 6.35029318], ['Short ton (US)', 'ton', 907.18474], ['Long ton (UK)', 'LT', 1016.0469088], ['Carat', 'ct', 0.0002], ['Grain', 'gr', 0.00006479891], ['Atomic mass unit', 'u', 1.66053906660e-27]], def: ['kg', 'lb', 70] },
    'Temperature': { special: 'temp', units: [['Celsius', '°C'], ['Fahrenheit', '°F'], ['Kelvin', 'K'], ['Rankine', '°R'], ['Réaumur', '°Ré']], def: ['°C', '°F', 25] },
    'Area': { base: 'square metre', units: [['Square kilometre', 'km²', 1e6], ['Hectare', 'ha', 1e4], ['Square metre', 'm²', 1], ['Square centimetre', 'cm²', 1e-4], ['Square millimetre', 'mm²', 1e-6], ['Square mile', 'mi²', 2589988.110336], ['Acre', 'ac', 4046.8564224], ['Square yard', 'yd²', 0.83612736], ['Square foot', 'ft²', 0.09290304], ['Square inch', 'in²', 0.00064516]], def: ['ha', 'ac', 1] },
    'Volume': { base: 'litre', units: [['Cubic metre', 'm³', 1000], ['Litre', 'L', 1], ['Millilitre', 'mL', 0.001], ['Cubic centimetre', 'cm³', 0.001], ['Cubic foot', 'ft³', 28.316846592], ['Cubic inch', 'in³', 0.016387064], ['US gallon', 'gal', 3.785411784], ['US quart', 'qt', 0.946352946], ['US pint', 'pt', 0.473176473], ['US cup', 'cup', 0.2365882365], ['US fluid ounce', 'fl oz', 0.0295735295625], ['US tablespoon', 'tbsp', 0.01478676478125], ['US teaspoon', 'tsp', 0.00492892159375], ['UK gallon', 'imp gal', 4.54609], ['UK pint', 'imp pt', 0.56826125], ['Barrel (oil)', 'bbl', 158.987294928]], def: ['L', 'gal', 10] },
    'Time': { base: 'second', units: [['Millennium', 'ky', 31557600000], ['Century', 'c', 3155760000], ['Decade', 'dec', 315576000], ['Year (365.25 days)', 'yr', 31557600], ['Month (30.44 days)', 'mo', 2629800], ['Week', 'wk', 604800], ['Day', 'd', 86400], ['Hour', 'h', 3600], ['Minute', 'min', 60], ['Second', 's', 1], ['Millisecond', 'ms', 0.001], ['Microsecond', 'µs', 1e-6], ['Nanosecond', 'ns', 1e-9]], def: ['h', 's', 2] },
    'Speed': { base: 'metre per second', units: [['Metre per second', 'm/s', 1], ['Kilometre per hour', 'km/h', 1 / 3.6], ['Mile per hour', 'mph', 0.44704], ['Knot', 'kn', 0.5144444444444445], ['Foot per second', 'ft/s', 0.3048], ['Mach (sea level)', 'Ma', 340.29], ['Speed of light', 'c', 299792458]], def: ['km/h', 'mph', 100] },
    'Pressure': { base: 'pascal', units: [['Pascal', 'Pa', 1], ['Kilopascal', 'kPa', 1000], ['Megapascal', 'MPa', 1e6], ['Bar', 'bar', 1e5], ['Millibar', 'mbar', 100], ['Atmosphere', 'atm', 101325], ['Pound per square inch', 'psi', 6894.757293168], ['Millimetre of mercury', 'mmHg', 133.322387415], ['Torr', 'Torr', 101325 / 760], ['Inch of mercury', 'inHg', 3386.389]], def: ['atm', 'psi', 1] },
    'Energy': { base: 'joule', units: [['Joule', 'J', 1], ['Kilojoule', 'kJ', 1000], ['Megajoule', 'MJ', 1e6], ['Calorie (thermochemical)', 'cal', 4.184], ['Kilocalorie (food Calorie)', 'kcal', 4184], ['Watt-hour', 'Wh', 3600], ['Kilowatt-hour', 'kWh', 3.6e6], ['Electronvolt', 'eV', 1.602176634e-19], ['British thermal unit', 'BTU', 1055.05585262], ['Foot-pound', 'ft·lbf', 1.3558179483314004], ['Erg', 'erg', 1e-7]], def: ['kcal', 'kJ', 250] },
    'Power': { base: 'watt', units: [['Watt', 'W', 1], ['Kilowatt', 'kW', 1000], ['Megawatt', 'MW', 1e6], ['Horsepower (mechanical)', 'hp', 745.6998715822702], ['Horsepower (metric)', 'PS', 735.49875], ['BTU per hour', 'BTU/h', 0.29307107017], ['Calorie per second', 'cal/s', 4.184]], def: ['hp', 'kW', 100] },
    'Force': { base: 'newton', units: [['Newton', 'N', 1], ['Kilonewton', 'kN', 1000], ['Pound-force', 'lbf', 4.4482216152605], ['Kilogram-force', 'kgf', 9.80665], ['Dyne', 'dyn', 1e-5]], def: ['N', 'lbf', 100] },
    'Angle': { base: 'radian', units: [['Degree', '°', Math.PI / 180], ['Radian', 'rad', 1], ['Gradian', 'grad', Math.PI / 200], ['Turn (revolution)', 'turn', 2 * Math.PI], ['Arcminute', '′', Math.PI / 10800], ['Arcsecond', '″', Math.PI / 648000]], def: ['°', 'rad', 180] },
    'Frequency': { base: 'hertz', units: [['Hertz', 'Hz', 1], ['Kilohertz', 'kHz', 1000], ['Megahertz', 'MHz', 1e6], ['Gigahertz', 'GHz', 1e9], ['Revolutions per minute', 'rpm', 1 / 60], ['Beats per minute', 'bpm', 1 / 60]], def: ['rpm', 'Hz', 3000] },
    'Data size': { base: 'byte', units: [['Bit', 'bit', 0.125], ['Byte', 'B', 1], ['Kilobyte (1000)', 'KB', 1e3], ['Megabyte (1000²)', 'MB', 1e6], ['Gigabyte (1000³)', 'GB', 1e9], ['Terabyte (1000⁴)', 'TB', 1e12], ['Petabyte (1000⁵)', 'PB', 1e15], ['Kibibyte (1024)', 'KiB', 1024], ['Mebibyte (1024²)', 'MiB', 1048576], ['Gibibyte (1024³)', 'GiB', 1073741824], ['Tebibyte (1024⁴)', 'TiB', 1099511627776]], def: ['GB', 'MB', 4] },
    'Data rate': { base: 'bit per second', units: [['Bit per second', 'bit/s', 1], ['Kilobit per second', 'kbit/s', 1e3], ['Megabit per second', 'Mbit/s', 1e6], ['Gigabit per second', 'Gbit/s', 1e9], ['Byte per second', 'B/s', 8], ['Kilobyte per second', 'KB/s', 8e3], ['Megabyte per second', 'MB/s', 8e6], ['Gigabyte per second', 'GB/s', 8e9]], def: ['Mbit/s', 'MB/s', 100] },
    'Density': { base: 'kilogram per cubic metre', units: [['Kilogram per cubic metre', 'kg/m³', 1], ['Gram per cubic centimetre', 'g/cm³', 1000], ['Gram per litre', 'g/L', 1], ['Pound per cubic foot', 'lb/ft³', 16.01846337396], ['Pound per US gallon', 'lb/gal', 119.8264273]], def: ['g/cm³', 'kg/m³', 1] },
    'Fuel economy': { special: 'fuel', units: [['Kilometres per litre', 'km/L'], ['Litres per 100 km', 'L/100km'], ['Miles per US gallon', 'mpg (US)'], ['Miles per UK gallon', 'mpg (UK)']], def: ['mpg (US)', 'L/100km', 30] },
    'Roman numerals': { special: 'roman' },
    'Number to words': { special: 'words' }
  };
  let cat = U.store.get('convCat', 'Length');
  if (!CATS[cat]) cat = 'Length';

  function nice(x) {
    if (!Number.isFinite(x)) return String(x);
    if (x === 0) return '0';
    const a = Math.abs(x);
    if (a >= 1e15 || a < 1e-7) return x.toExponential(8).replace(/\.?0+e/, 'e').replace('e+', ' × 10^').replace('e', ' × 10^');
    return String(parseFloat(x.toPrecision(12)));
  }
  const sel = (opts, v) => { const s = el('select', { class: 'in' }, opts.map(o => el('option', { value: o[1], text: o[0] + ' (' + o[1] + ')' }))); s.value = v; return s; };

  /* ----- temperature and fuel ----- */
  const toK = { '°C': v => v + 273.15, '°F': v => (v - 32) * 5 / 9 + 273.15, 'K': v => v, '°R': v => v * 5 / 9, '°Ré': v => v * 5 / 4 + 273.15 };
  const fromK = { '°C': k => k - 273.15, '°F': k => (k - 273.15) * 9 / 5 + 32, 'K': k => k, '°R': k => k * 9 / 5, '°Ré': k => (k - 273.15) * 4 / 5 };
  const TF = { '°C>°F': '°F = °C × 9/5 + 32', '°F>°C': '°C = (°F − 32) × 5/9', '°C>K': 'K = °C + 273.15', 'K>°C': '°C = K − 273.15', '°F>K': 'K = (°F − 32) × 5/9 + 273.15', 'K>°F': '°F = (K − 273.15) × 9/5 + 32' };
  const FUEL = { 'km/L': 100, 'L/100km': 0, 'mpg (US)': 235.2145833, 'mpg (UK)': 282.4809363 };
  const toL100 = (u, v) => u === 'L/100km' ? v : FUEL[u] === 100 ? 100 / v : FUEL[u] / v;
  const fromL100 = (u, b) => u === 'L/100km' ? b : FUEL[u] === 100 ? 100 / b : FUEL[u] / b;

  /* ----- roman and words ----- */
  function toRoman(n) { const m = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; m.forEach(([v, r]) => { while (n >= v) { s += r; n -= v; } }); return s; }
  function fromRoman(s) { const v = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }; let t = 0; for (let i = 0; i < s.length; i++) { const a = v[s[i]], b = v[s[i + 1]]; t += b > a ? -a : a; } return t; }
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const SCALE = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion'];
  function below1000(n) { let s = ''; if (n >= 100) { s += ONES[Math.floor(n / 100)] + ' hundred'; n %= 100; if (n) s += ' and '; } if (n >= 20) { s += TENS[Math.floor(n / 10)]; if (n % 10) s += '-' + ONES[n % 10]; } else if (n > 0 || !s) s += ONES[n]; return s; }
  function words(str) {
    let neg = false; str = str.trim(); if (str[0] === '-') { neg = true; str = str.slice(1); }
    if (!/^\d+(\.\d+)?$/.test(str)) throw new Error('Type a number such as 1234.56.');
    let [ip, fp] = str.split('.'); ip = ip.replace(/^0+(?=\d)/, '');
    if (ip.length > 18) throw new Error('That number is too large. Use up to 18 digits.');
    let n = BigInt(ip), parts = [], i = 0;
    if (n === 0n) parts = ['zero']; else while (n > 0n) { const chunk = Number(n % 1000n); if (chunk) parts.unshift(below1000(chunk) + (SCALE[i] ? ' ' + SCALE[i] : '')); n /= 1000n; i++; }
    let s = parts.join(', ');
    if (fp) s += ' point ' + fp.split('').map(d => ONES[+d]).join(' ');
    return (neg ? 'minus ' : '') + s;
  }

  /* ----- UI ----- */
  const chipBox = el('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'What to convert' });
  const body = el('div', { class: 'stack' });
  Object.keys(CATS).forEach(name => chipBox.appendChild(el('button', { class: 'chip', type: 'button', role: 'radio', 'data-id': name, 'aria-checked': 'false', text: name, onclick: () => { cat = name; U.store.set('convCat', name); build(); } })));
  chipBox.appendChild(el('button', { class: 'chip', type: 'button', text: 'Number bases →', title: 'Binary, octal, decimal and hex have their own tab', onclick: () => U.showTab('bases') }));
  root.appendChild(el('div', { class: 'stack' }, [el('div', { class: 'card solve-input' }, [el('div', { class: 'card-h' }, [el('h3', { text: 'Converters' }), el('span', { class: 'hint', text: 'Pick a type, type a value, choose units' })]), chipBox]), body]));

  function build() {
    chipBox.querySelectorAll('.chip[data-id]').forEach(b => b.setAttribute('aria-checked', b.dataset.id === cat ? 'true' : 'false'));
    body.replaceChildren();
    const c = CATS[cat];
    if (c.special === 'roman') return buildRoman();
    if (c.special === 'words') return buildWords();
    const valIn = el('input', { class: 'in', value: String(c.def[2]), inputmode: 'decimal', spellcheck: 'false', 'aria-label': 'Value' });
    const from = sel(c.units, c.def[0]), to = sel(c.units, c.def[1]);
    const swap = el('button', { class: 'btn', type: 'button', text: '⇄', title: 'Swap units', 'aria-label': 'Swap units', onclick: () => { const t = from.value; from.value = to.value; to.value = t; calc(); } });
    const res = el('div', { class: 'card ans-card', 'aria-live': 'polite' }), tableCard = el('div', { class: 'card' });
    function unitsList() { return c.units; }
    function convert(v, f, t) {
      if (c.special === 'temp') return fromK[t](toK[f](v));
      if (c.special === 'fuel') return fromL100(t, toL100(f, v));
      const fu = unitsList().find(u => u[1] === f), tu = unitsList().find(u => u[1] === t);
      return v * fu[2] / tu[2];
    }
    function calc() {
      const v = Number(String(valIn.value).trim().replace(/−/g, '-').replace(/,/g, ''));
      res.replaceChildren(); tableCard.replaceChildren();
      if (valIn.value.trim() === '' || !Number.isFinite(v)) { res.appendChild(el('p', { class: 'hint', style: 'color:var(--bad)', text: 'Enter a number to convert.' })); return; }
      if (c.special === 'fuel' && v <= 0) { res.appendChild(el('p', { class: 'hint', style: 'color:var(--bad)', text: 'Fuel economy must be more than 0.' })); return; }
      if (c.special === 'temp' && toK[from.value](v) < -1e-9) { res.appendChild(el('p', { class: 'hint', style: 'color:var(--bad)', text: 'That is below absolute zero (−273.15 °C), so it cannot exist.' })); return; }
      const r = convert(v, from.value, to.value);
      const name = s => c.units.find(u => u[1] === s)[0];
      const lines = [];
      if (c.special === 'temp') {
        const k = toK[from.value](v), key = from.value + '>' + to.value;
        lines.push(from.value === to.value ? 'Same unit, nothing to change.' : (TF[key] || 'Go through kelvin: first convert to K, then to ' + to.value + '.'));
        if (from.value !== to.value) { lines.push('Via kelvin: ' + nice(v) + ' ' + from.value + ' = ' + nice(k) + ' K'); lines.push(nice(k) + ' K = ' + nice(r) + ' ' + to.value); }
      } else if (c.special === 'fuel') {
        const b = toL100(from.value, v);
        lines.push('Fuel economy units are reciprocals of each other, so we go through litres per 100 km.', nice(v) + ' ' + from.value + ' = ' + nice(b) + ' L/100km', nice(b) + ' L/100km = ' + nice(r) + ' ' + to.value);
      } else {
        const fu = c.units.find(u => u[1] === from.value), tu = c.units.find(u => u[1] === to.value), ratio = fu[2] / tu[2];
        lines.push('1 ' + from.value + ' = ' + nice(ratio) + ' ' + to.value, nice(v) + ' × ' + nice(ratio) + ' = ' + nice(r));
      }
      res.appendChild(el('div', { class: 'card-h' }, [el('h3', { text: 'Result' }), el('button', { class: 'btn small', type: 'button', text: 'Copy', onclick: () => U.copy(nice(r).replace(/ × 10\^/, 'e'), 'Copied') })]));
      res.appendChild(el('div', { class: 'conv-big', text: nice(v) + ' ' + from.value + ' = ' + nice(r) + ' ' + to.value }));
      res.appendChild(el('p', { class: 'hint', style: 'margin-top:4px', text: name(from.value) + ' to ' + name(to.value).toLowerCase() }));
      lines.forEach(l => res.appendChild(el('div', { class: 'mline', text: l })));
      tableCard.appendChild(el('div', { class: 'card-h' }, [el('h3', { text: nice(v) + ' ' + from.value + ' in every unit' }), el('span', { class: 'hint', text: 'Tap a row to use it' })]));
      const t = el('table', { class: 'data' }), tb = el('tbody');
      t.appendChild(el('thead', null, [el('tr', null, [el('th', { text: 'Unit', style: 'text-align:left' }), el('th', { text: 'Value' })])]));
      c.units.forEach(u => { const tr = el('tr', { style: 'cursor:pointer', onclick: () => { to.value = u[1]; calc(); } }, [el('td', { text: u[0] + ' (' + u[1] + ')', style: 'text-align:left' }), el('td', { text: nice(convert(v, from.value, u[1])) })]); tb.appendChild(tr); });
      t.appendChild(tb); tableCard.appendChild(el('div', { class: 'tbl-scroll', style: 'max-height:380px' }, [t]));
    }
    [valIn].forEach(i => i.addEventListener('input', calc)); [from, to].forEach(i => i.addEventListener('change', calc));
    body.append(el('div', { class: 'card solve-input' }, [
      el('div', { class: 'field' }, [el('label', { text: 'Value' }), valIn]),
      el('div', { class: 'conv-row' }, [el('div', { class: 'field' }, [el('label', { text: 'From' }), from]), swap, el('div', { class: 'field' }, [el('label', { text: 'To' }), to])])
    ]), res, tableCard);
    calc();
  }
  function buildRoman() {
    const inp = el('input', { class: 'in', value: '2026', spellcheck: 'false', autocapitalize: 'characters', 'aria-label': 'Number or Roman numeral' }), res = el('div', { class: 'card ans-card', 'aria-live': 'polite' });
    function calc() {
      res.replaceChildren(); const t = inp.value.trim().toUpperCase();
      if (!t) return;
      if (/^\d+$/.test(t)) { const n = parseInt(t, 10); if (n < 1 || n > 3999) { res.appendChild(el('p', { class: 'hint', style: 'color:var(--bad)', text: 'Roman numerals cover 1 to 3999.' })); return; } res.appendChild(el('div', { class: 'conv-big', text: n + ' = ' + toRoman(n) }));
        const parts = []; let m = n; [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].forEach(([v, r]) => { while (m >= v) { parts.push(r + ' = ' + v); m -= v; } });
        res.appendChild(el('div', { class: 'mline', text: 'Take the biggest symbol that fits, again and again:\n' + parts.join('\n') }));
      } else if (/^[IVXLCDM]+$/.test(t)) { const n = fromRoman(t); if (toRoman(n) !== t) { res.appendChild(el('p', { class: 'hint', style: 'color:var(--bad)', text: t + ' is not a standard Roman numeral. The standard form of ' + n + ' is ' + toRoman(n) + '.' })); return; } res.appendChild(el('div', { class: 'conv-big', text: t + ' = ' + n })); res.appendChild(el('div', { class: 'mline', text: 'Add the symbols. If a smaller one comes before a bigger one, subtract it (IV = 5 − 1 = 4).' })); }
      else res.appendChild(el('p', { class: 'hint', style: 'color:var(--bad)', text: 'Type a number from 1 to 3999, or a Roman numeral using I V X L C D M.' }));
    }
    inp.addEventListener('input', calc);
    body.append(el('div', { class: 'card solve-input' }, [el('div', { class: 'field' }, [el('label', { text: 'Number or Roman numeral' }), inp])]), res); calc();
  }
  function buildWords() {
    const inp = el('input', { class: 'in', value: '1234567.89', inputmode: 'decimal', 'aria-label': 'Number' }), res = el('div', { class: 'card ans-card', 'aria-live': 'polite' });
    function calc() { res.replaceChildren(); try { const s = words(inp.value); res.appendChild(el('div', { class: 'card-h' }, [el('h3', { text: 'In words' }), el('button', { class: 'btn small', type: 'button', text: 'Copy', onclick: () => U.copy(s, 'Copied') })])); res.appendChild(el('div', { class: 'conv-big', style: 'font-size:20px;font-family:var(--f-body)', text: s })); } catch (e) { res.appendChild(el('p', { class: 'hint', style: 'color:var(--bad)', text: e.message })); } }
    inp.addEventListener('input', calc);
    body.append(el('div', { class: 'card solve-input' }, [el('div', { class: 'field' }, [el('label', { text: 'Number' }), inp])]), res); calc();
  }
  build();
})(globalThis.MB = globalThis.MB || {});
