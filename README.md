# MiMath

**A scientific calculator and maths workbench that runs entirely in your browser.**

MiMath shows you how an answer was reached, not just the answer. It solves equations, does calculus, draws graphs and charts, works with complex numbers and number bases, converts units, and comes with 33 extra calculators. Each result comes with step-by-step working. You don't need to install anything, create an account or run a server: open the page and start.

🔗 **Live demo:** https://ummasalmamim.github.io/mimath/

![HTML](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![No build needed](https://img.shields.io/badge/build-not%20required-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

---

## 📑 Contents

- [Highlights](#-highlights)
- [Why MiMath is different](#-why-mimath-is-different)
- [How it works](#️-how-it-works)
- [Features in detail](#-features-in-detail)
- [Operations reference](#-operations-reference)
- [Examples to try](#-examples-to-try)
- [Keyboard and mouse shortcuts](#️-keyboard-and-mouse-shortcuts)
- [Getting started](#-getting-started)
- [Publishing on GitHub Pages](#-publishing-on-github-pages)
- [Editing the code](#️-editing-the-code)
- [Built with](#-built-with)
- [Privacy](#-privacy)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Author](#-author)
- [Licence](#-licence)

---

## 🌟 Highlights

- **Worked solutions.** Most results come with the steps that produced them, such as the rule used for a derivative, the row operations for a system, or a sign chart for an inequality.
- **Eight tools in one page:** Calculator, Solve, Graph, Charts, Complex, Bases, Convert and Tools, plus 33 extra calculators.
- **Light and dark themes.** It follows your device's setting by default, and the theme button switches it.
- **Works on phone, tablet and desktop.** The layout adapts to any screen size.
- **Remembers your session.** Your history, memory value, DEG/RAD mode, graphs and last-used tab are saved in your browser.
- **A single file.** The whole app is one `index.html`, so it is easy to host anywhere.

---

## 🏆 Why MiMath is different

Most calculators give you a number. MiMath shows **how that number was reached**, and it puts tools that normally need several apps on one page.

| | Typical phone / basic calculator | Typical scientific calculator | **MiMath** |
| --- | :---: | :---: | :---: |
| Arithmetic, powers, roots, trig, logs | ✅ | ✅ | ✅ |
| Shows the **order-of-operations steps** | ❌ | ❌ | ✅ |
| Solves equations **with worked steps** | ❌ | Partial (answer only) | ✅ |
| Systems of equations and inequalities | ❌ | Partial | ✅ |
| Symbolic derivatives, integrals and limits | ❌ | ❌ | ✅ |
| Names the **rule used at each step** (chain rule, L'Hôpital, …) | ❌ | ❌ | ✅ |
| Graphs functions, implicit, polar and parametric curves | ❌ | ❌ | ✅ |
| Finds zeros, peaks and crossings on a graph | ❌ | ❌ | ✅ |
| 14 chart types from an equation or your own data | ❌ | ❌ | ✅ |
| Complex numbers with an Argand diagram | ❌ | Partial | ✅ |
| Any number base (2–36), bitwise logic, IEEE 754 | ❌ | Partial | ✅ |
| Matrices, including eigenvalues and RREF | ❌ | Partial | ✅ |
| Unit converter in the same app | ❌ | ❌ | ✅ |
| 33 extra calculators (geometry, statistics, finance, …) | ❌ | ❌ | ✅ |
| Free, open source, no ads, no sign-up | Varies | ❌ (paid hardware) | ✅ |
| Works on any device with a browser | Phone only | Device only | ✅ |

### What this means in practice

1. **It teaches as well as calculates.** For an equation like `x² − 5x + 6 = 0`, MiMath doesn't just print `x = 2, 3`. It shows how the equation was solved, writes the factor form, and checks each root by substituting it back in. That makes it useful for homework, revision and checking your own working.
2. **It explains its errors.** If you type something like `tan(90)` in degree mode, you get a plain-language message (*"tan is undefined for odd multiples of 90°"*) instead of a bare `Error` or a huge wrong number.
3. **It tidies up rounding errors.** Floating-point arithmetic gives results like `sin(180°) = 1.2246e-16`. MiMath recognises values this tiny and shows `0`.
4. **One page instead of five apps.** Calculator, equation solver, graphing tool, chart maker, base converter and unit converter all live in one tab.
5. **Forgiving input.** You can type the way you'd write on paper: `2(3+4)`, `3x`, `√9`, `π`, `x²`, `45°`, `×`, `÷`, `≤`, `≥`. MiMath converts them to the right form for you.
6. **Private and offline-friendly.** Everything is computed in your browser. Nothing is uploaded, and once the libraries are loaded no server is needed for the maths.
7. **Free and open.** The full source is here under the MIT licence. Anyone can read how a result is computed, fix bugs, or add features.

---

## ⚙️ How it works

Every input goes through the same pipeline:

```
 Your input ─► 1. Normalise ─► 2. Detect type ─► 3. Compute ─► 4. Build steps ─► 5. Display
```

1. **Normalise.** Symbols written as you'd write them by hand are converted to a standard form: `×` → `*`, `÷` → `/`, `π` → `pi`, `√` → `sqrt`, `²` → `^2`, `°` → degrees, `≤` → `<=`. On the keypad `log` means base 10 and `ln` means natural log, so there is no ambiguity.
2. **Detect type.** In Solve → *Any problem*, MiMath checks the input. An `=` sign means an equation, several lines mean a system, `<` or `>` means an inequality, and anything else is an expression to simplify.
3. **Compute.**
   - **Numbers** (Calculator, Tools, Convert) use **math.js**. The Calculator has its own copy of math.js that understands DEG/RAD mode, while Solve, Graph and Charts always use radians.
   - **Symbols** (derivatives, integrals, factoring, series) use **Nerdamer**, a computer-algebra library.
   - **Equations** go through MiMath's own solvers in `engine-solve.js`: direct methods for linear and quadratic equations, factoring and the rational root test for polynomials, Gauss–Jordan elimination for linear systems, sign charts for inequalities, and numerical root-finding when no exact form exists.
4. **Build steps.** As each solver runs, it records what it did in plain language (e.g. which rule was applied, which row operation was done, or a check that the answer is right). These records become the worked solution.
5. **Display.** The answer, the steps and, where useful, a graph are shown together. Results are formatted cleanly, using fractions, π and roots where possible and tidy decimals otherwise.

---

## 🧮 Features in detail

### 1. Calculator
- Scientific keypad with trigonometric, logarithmic, power, root and factorial functions
- **DEG / RAD** angle modes
- Memory keys (**M+**, **M−**, **MR**, **MC**) and **Ans** for the last answer
- History of your last 40 calculations, which you can click to reuse
- Complex numbers such as `3+4i`
- Binary and hex literals such as `0b1010` and `0xFF`
- A live preview of the result as you type
- **Order-of-operations steps** that show how the expression was evaluated
- One-click copy of the result

### 2. Solve
Pick a mode, or use **Any problem** and MiMath detects the type for you.

| Mode | What it handles |
| --- | --- |
| **Equation** | Linear, quadratic, polynomial, rational, root, exponential, logarithmic, trigonometric and absolute value equations |
| **System** | Two or more equations; linear systems use Gauss–Jordan row operations; non-linear systems also work |
| **Inequality** | `<`, `>`, `≤`, `≥`, with the answer as an interval and a sign chart |
| **Derivative** | 1st to 4th order, with the rule named at each step, plus the slope and tangent line at a point |
| **Integral** | Antiderivatives, or definite integrals with the shaded area |
| **Limit** | Direct substitution, factoring, L'Hôpital's rule or a numerical check, from both sides, the left or the right |
| **Algebra** | Simplify, expand, factor, partial fractions |
| **Series** | Taylor polynomials up to degree 8 around any centre |
| **Matrix** | Determinant, inverse, transpose, trace, RREF, rank, eigenvalues, powers, A × B, A + B, A − B |

Most solutions also come with a graph.

### 3. Graph
- Plot several curves at once, of four kinds:
  - `y = f(x)` functions
  - **Implicit** equations in x and y (e.g. circles, ellipses)
  - **Polar** curves `r(θ)`
  - **Parametric** curves `x(t), y(t)`
- Pan, zoom and trace with mouse, touch or keyboard
- Automatic **zeros, peaks, troughs, intercepts and crossings**
- Derivative overlay
- A table of values
- Ready-made presets such as a circle and line, an ellipse, a heart curve, a rose and a spiral

### 4. Charts
- **14 chart types:** Line, Area, Step, Bar, Horizontal bar, Scatter, Pie, Doughnut, Polar area, Radar, Bubble, Histogram, Running total, and **f, f′ and ∫f** side by side
- Build a chart from an **equation** or from **your own data** (one value per line, with an optional label such as `Maths, 72`)
- Summary statistics alongside the chart

### 5. Complex numbers
- Add, subtract, multiply, divide
- Powers and n-th roots
- Rectangular ↔ polar form
- `exp`, `ln`, `sin`, `cos` of complex numbers
- Step-by-step working and an **Argand diagram**

### 6. Bases
- Binary, octal, decimal, hexadecimal and **any base from 2 to 36**
- Two's complement
- Clickable bits that let you flip bits directly
- Logic operations: **AND, OR, XOR, NAND, NOR, XNOR, NOT**
- Bit shifts and rotates
- Text ↔ bytes
- **IEEE 754** floating-point representation

### 7. Convert
Length, mass, temperature, area, volume, time, speed, pressure, energy, power, force, angle, frequency, data size, data rate, density and fuel economy, plus **Roman numerals** and **number to words**.

### 8. Tools
**33 calculators**, each with step-by-step working:

| Category | Calculators |
| --- | --- |
| **Number theory** | Prime factors · GCD and LCM · Divisors · Primes up to n · Modular arithmetic (incl. modular powers) · Fibonacci and Lucas numbers · Factorial, nCr and nPr · Collatz sequence · Number properties (prime, perfect, Armstrong, …) |
| **Percent and fractions** | Percentages · Ratio and proportion · Fraction calculator (incl. mixed numbers like `2 1/2`) · Rounding and scientific notation |
| **Geometry** | Circle and sphere · Rectangle and box · Triangle from 3 sides · Trapezoid and parallelogram · Regular polygon · Cylinder and cone · Ellipse · Two points: distance and line · Right triangle (Pythagoras) |
| **Statistics** | Descriptive statistics · Linear regression · Normal distribution · Binomial probability · Types of average |
| **Finance** | Simple and compound interest · Loan payment (EMI) |
| **Sequences and vectors** | Arithmetic sequence · Geometric sequence · Vectors (2D and 3D) |
| **Functions of x** | All elementary functions of x evaluated at once |

Plus a **searchable function library**, built from math.js's own documentation, listing every function the calculator understands with a description and examples.

---

## 🔣 Operations reference

### Calculator keypad

The keypad has a **2nd** key that switches some keys to their second function.

| Key | Does | With **2nd** |
| --- | --- | --- |
| `sin` `cos` `tan` | Sine, cosine, tangent | `sin⁻¹` `cos⁻¹` `tan⁻¹` (inverse) |
| `x²` | Square | `x³` (cube) |
| `√` | Square root | `∛` (cube root) |
| `xʸ` | Power | `ʸ√x` (y-th root) |
| `log` | Log base 10 | `10ˣ` |
| `ln` | Natural log | `eˣ` |
| `n!` | Factorial | |
| `1/x` | Reciprocal | |
| `abs` | Absolute value | |
| `nCr` / `nPr` | Combinations / permutations | |
| `mod` | Remainder | |
| `%` | Percent | |
| `×10ˣ` | Scientific notation | |
| `Ans` | Last answer | |
| `DEL` / `AC` | Delete one character / clear all | |
| `π` `e` | Constants | |

### Operators

| Operator | Meaning | Example | Result |
| --- | --- | --- | --- |
| `+` `-` | Add, subtract | `7 - 2` | `5` |
| `*` or `×` | Multiply | `6 × 7` | `42` |
| `/` or `÷` | Divide | `22 ÷ 7` | `3.142857…` |
| `^` | Power | `2^10` | `1024` |
| `!` | Factorial | `5!` | `120` |
| `%` | Percent | `200 * 15%` | `30` |
| `mod` | Remainder | `17 mod 5` | `2` |
| *(nothing)* | Implicit multiply | `2(3+4)`, `3pi` | `14`, `9.4247…` |
| `( )` | Grouping | `(2+3)^2` | `25` |
| `=` `<` `>` `<=` `>=` | Equations and inequalities (Solve tab) | `2x+3=11` | `x = 4` |

**Order of operations:** brackets → powers and factorials → multiplication, division, mod → addition and subtraction. The Calculator shows each stage as a step.

### Functions

| Group | Functions |
| --- | --- |
| **Trigonometry** | `sin` `cos` `tan` `sec` `csc` `cot` |
| **Inverse trig** | `asin` `acos` `atan` `asec` `acsc` `acot` |
| **Hyperbolic** | `sinh` `cosh` `tanh` `sech` `csch` `coth`, plus inverses `asinh` `acosh` `atanh` |
| **Powers and roots** | `sqrt(x)` `cbrt(x)` `root(x, n)` `exp(x)` `x^y` |
| **Logarithms** | `log(x)` (base 10), `ln(x)` (natural), `log2(x)`, `logb(x, b)` (any base) |
| **Rounding** | `round` `floor` `ceil` `fix` `abs` `sign` |
| **Counting** | `n!` `nCr(n, k)` `nPr(n, k)` `gcd` `lcm` |
| **Statistics** | `mean` `median` `mode` `std` `variance` `min` `max` `sum` |
| **Complex** | `re` `im` `conj` `arg` `abs` |

The **Tools → Function library** lists all of them, with search.

### Constants

| Name | Value |
| --- | --- |
| `pi` or `π` | 3.14159265… |
| `e` | 2.71828182… |
| `i` | √−1 (imaginary unit) |
| `phi` | 1.61803398… (golden ratio) |
| `tau` | 6.28318530… (2π) |
| `Infinity` | ∞ (e.g. for limits) |

### Writing input the easy way

| You can type | MiMath reads it as |
| --- | --- |
| `×` `·` | `*` |
| `÷` | `/` |
| `−` (long minus) | `-` |
| `π` | `pi` |
| `√9`, `√(x+1)` | `sqrt(9)`, `sqrt(x+1)` |
| `∛` | `cbrt` |
| `x²`, `x³` | `x^2`, `x^3` |
| `45°` | 45 degrees |
| `≤` `≥` `≠` | `<=` `>=` `!=` |
| `θ` | `theta` (for polar graphs) |
| `0b1010`, `0xFF` | binary 10, hex 255 |

---

## 🧪 Examples to try

| Tab | Type this | You get |
| --- | --- | --- |
| Calculator | `2(3+4)^2` | `98`, with order-of-operations steps |
| Calculator | `sqrt(-16)` | `4i` |
| Solve → Equation | `x^2 - 5x + 6 = 0` | `x = 2`, `x = 3` |
| Solve → System | `2x + y = 7` and `x - y = 2`, one per line | `x = 3`, `y = 1` |
| Solve → Inequality | `x^2 - 4 > 0` | `x < −2` or `x > 2` |
| Solve → Derivative | `x^2 sin(x)` | `2x sin(x) + x² cos(x)` |
| Solve → Integral | `x^2` from `0` to `3` | `9` |
| Solve → Limit | `sin(x)/x` as x → `0` | `1` |
| Solve → Algebra (Factor) | `x^3 - 6x^2 + 11x - 6` | `(x − 1)(x − 2)(x − 3)` |
| Solve → Matrix (Det) | `2 1` / `1 3` | `5` |
| Graph (Implicit) | `x^2 + y^2 = 25` | a circle of radius 5 |
| Graph (Polar) | `2 cos(3 theta)` | a three-petal rose |

---

## ⌨️ Keyboard and mouse shortcuts

| Where | Key / action | Does |
| --- | --- | --- |
| Calculator | **Enter** | Calculate |
| Calculator | **Esc** | Clear the input |
| Most input boxes | **Enter** | Run |
| Solve (multi-line boxes) | **Ctrl + Enter** (⌘ + Enter on Mac) | Solve |
| Graph | **Drag** | Pan |
| Graph | **Scroll wheel** / **pinch** | Zoom |
| Graph | **Double-click** | Zoom in at that point |
| Graph (focused) | **Arrow keys** | Pan |
| Graph (focused) | **+** / **−** | Zoom in / out |
| Graph (focused) | **0** | Reset the view |

---

## 🚀 Getting started

### Option 1: use it online
Visit the **[live demo](https://ummasalmamim.github.io/mimath/)**.

### Option 2: run it on your computer
1. Download this repository: click **Code → Download ZIP**, or clone it:
   ```sh
   git clone https://github.com/ummasalmamim/mimath.git
   cd mimath
   ```
2. Double-click `index.html` to open it in any modern browser (Chrome, Edge, Firefox, Safari).

> An internet connection is needed the first time, to load the maths libraries and fonts.

### Option 3: run a local server (optional)
```sh
python3 -m http.server 8000
```
Then open http://localhost:8000 in your browser.

---

## 🌐 Publishing on GitHub Pages

1. Make sure the repository is **Public**.
2. Make sure `index.html` is in the **top level** of the repository, not inside a sub-folder.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose **main** and **/ (root)**, then click **Save**.
5. Wait 1–5 minutes. Progress shows on the **Actions** tab.
6. When it finishes, your site is at `https://<your-username>.github.io/<repo-name>/`. The repo name in that link is case-sensitive.

---

## 🛠️ Editing the code

`index.html` is **generated** from the files in `src/`. Edit the files in `src/`, then rebuild:

```sh
sh build.sh
```

This joins all the source files into a fresh `index.html`. On Windows, run it from **Git Bash** or **WSL**.

### Project structure

```
mimath/
├── index.html          # the built app (this is what GitHub Pages serves)
├── build.sh            # combines src/ into index.html
├── README.md           # this file
├── LICENSE             # MIT licence
├── .gitignore
└── src/
    ├── head.html           # styles (colours, layout, light/dark theme)
    ├── body.html           # page layout and tabs
    ├── engine-core.js      # expression parsing, number formatting, order-of-operations steps
    ├── engine-solve.js     # equation, system and inequality solvers with steps
    ├── engine-calculus.js  # derivatives, integrals, limits, series, matrices, problem-type detection
    ├── ui-base.js          # shared helpers, saved settings, theme switching, tabs
    ├── ui-plot.js          # the graph canvas (pan, zoom, trace, key points)
    ├── ui-calc.js          # Calculator tab
    ├── ui-solve.js         # Solve tab
    ├── ui-graph.js         # Graph tab
    ├── ui-charts.js        # Charts tab
    ├── ui-complex.js       # Complex tab
    ├── ui-bases.js         # Bases tab
    ├── ui-convert.js       # Convert tab
    ├── ui-tools.js         # Tools tab
    └── ui-main.js          # start-up
```

---

## 📚 Built with

| Library | Version | Used for |
| --- | --- | --- |
| [math.js](https://mathjs.org) | 12.4.2 | Evaluating expressions, complex numbers, matrices, units |
| [Nerdamer](https://nerdamer.com) | 1.1.13 | Symbolic algebra and calculus |
| [Chart.js](https://www.chartjs.org) | 4.4.1 | The Charts tab |

All three load from the [jsDelivr](https://www.jsdelivr.com) CDN. Fonts are **Bricolage Grotesque**, **Figtree** and **JetBrains Mono** from Google Fonts. Everything else is plain HTML, CSS and JavaScript, with no framework.

---

## 🔒 Privacy

- All calculations run **on your own device**. Nothing you type is sent to a server.
- Your history and settings are stored only in your browser's local storage. Clearing your browser data removes them.

---

## 🧩 Troubleshooting

| Problem | Fix |
| --- | --- |
| Buttons do nothing or the page looks unstyled | Check your internet connection. The libraries and fonts load online. |
| The live demo shows a 404 | Check the steps in [Publishing on GitHub Pages](#-publishing-on-github-pages), especially that the repo is public and `index.html` is at the top level. |
| A trig answer looks wrong | Check **DEG / RAD** on the Calculator. The Solve, Graph and Charts tabs always use **radians**. |
| My edits in `src/` don't show | Run `sh build.sh` to rebuild `index.html`, then refresh with **Ctrl + Shift + R**. |

---

## ⚠️ Note

MiMath is a learning aid. Answers are computed carefully, but check the working against your own notes, especially for exams and assignments.

---

## 👤 Author

**ummasalmamim**: [GitHub profile](https://github.com/ummasalmamim)

If you find MiMath useful, consider giving it a ⭐ on GitHub!

---

## 📄 Licence

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
