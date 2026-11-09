
"use strict";


const $ = (id) => document.getElementById(id);

const functionSelect = $("functionSelect");
const nSelect = $("nSelect");
const binsSelect = $("binsSelect");

let integrationData = null;


const functionsData = {
  sin: {
    a: 0,
    b: Math.PI,
    exact: 2,
    name: "sin(x)",
    description: "A smooth continuous function on [0, π]. Its exact integral is 2, making it a useful baseline for comparing the two approaches.",
    fn: (x) => Math.sin(x)
  },

  square: {
    a: 0,
    b: 1,
    exact: 1 / 3,
    name: "x²",
    description: "A continuous polynomial on [0, 1]. Its exact integral is 1/3. Both numerical methods should converge towards this value.",
    fn: (x) => x * x
  },

  step: {
    a: 0,
    b: 1,
    exact: 2,
    name: "Step function",
    description: "The function is 1 for x < 0.5 and 3 for x ≥ 0.5. It has a single discontinuity, but remains Riemann-integrable.",
    fn: (x) => x < 0.5 ? 1 : 3
  },

  absolute: {
    a: 0,
    b: 1,
    exact: 0.25,
    name: "|x − 0.5|",
    description: "A continuous V-shaped function. Its minimum is at x = 0.5 and its integral over [0, 1] is 0.25.",
    fn: (x) => Math.abs(x - 0.5)
  },

  inverseRoot: {
    a: 0,
    b: 1,
    exact: 2,
    name: "1 / √x",
    description: "An unbounded function near zero. It is an improper but convergent integral with value 2. The midpoint rule avoids evaluating the function exactly at zero.",
    fn: (x) => 1 / Math.sqrt(x)
  },

  indicator: {
    a: 0,
    b: 1,
    exact: 0.5,
    name: "Indicator function",
    description: "The function is 1 on [0, 0.5) and 0 on [0.5, 1]. Its integral is the length of the first half of the interval: 0.5.",
    fn: (x) => x < 0.5 ? 1 : 0
  },

  sinc: {
    a: 0,
    b: Math.PI,
    exact: 1.851937051982466,
    name: "sin(x) / x",
    description: "A smooth function after defining its value at zero by continuity: sinc(0) = 1. Its integral has no elementary expression, so the reference value is a high-precision numerical constant.",
    fn: (x) => x === 0 ? 1 : Math.sin(x) / x
  },

  dirichlet: {
    a: 0,
    b: 1,
    exact: 0,
    name: "Dirichlet function",
    description: "The function is 1 at rational numbers and 0 at irrational numbers. It is discontinuous everywhere and not Riemann-integrable, but its Lebesgue integral is zero.",
    fn: () => 1
  },

  thomae: {
    a: 0,
    b: 1,
    exact: 0,
    name: "Thomae's function",
    description: "At a rational p/q in lowest terms, the function is 1/q; at irrational numbers it is zero. It is Riemann-integrable, with integral zero, despite being discontinuous at every rational point.",
    fn: (x) => thomaeValue(x)
  }
};



function gcd(a, b) {
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return Math.abs(a);
}

function thomaeValue(x) {
  if (x <= 0 || x >= 1) return 0;

  const maxDenominator = 100000;
  let best = 0;
  let bestError = Infinity;

  for (let q = 1; q <= maxDenominator; q++) {
    const p = Math.round(x * q);
    const error = Math.abs(x - p / q);

    if (error < bestError) {
      bestError = error;
      best = 1 / q;
    }

    if (error < 1e-12) break;
  }

  return bestError < 1e-8 ? best : 0;
}



function riemannMidpoint(fn, a, b, n) {
  const dx = (b - a) / n;
  let sum = 0;

  for (let i = 0; i < n; i++) {
    const x = a + (i + 0.5) * dx;
    sum += fn(x);
  }

  return sum * dx;
}


function lebesgueInspired(fn, a, b, n, bins) {
  const values = new Float64Array(n);
  let minValue = Infinity;
  let maxValue = -Infinity;

  for (let i = 0; i < n; i++) {
    const x = a + ((i + 0.5) / n) * (b - a);
    const value = fn(x);

    values[i] = value;
    minValue = Math.min(minValue, value);
    maxValue = Math.max(maxValue, value);
  }

  if (maxValue === minValue) {
    return minValue * (b - a);
  }

  const counts = new Uint32Array(bins);
  const rangeWidth = (maxValue - minValue) / bins;

  for (let i = 0; i < n; i++) {
    let index = Math.floor((values[i] - minValue) / rangeWidth);
    index = Math.max(0, Math.min(bins - 1, index));
    counts[index]++;
  }

  let sum = 0;

  for (let j = 0; j < bins; j++) {
    const representativeValue = minValue + (j + 0.5) * rangeWidth;
    const estimatedMeasure = (counts[j] / n) * (b - a);

    sum += representativeValue * estimatedMeasure;
  }

  return sum;
}



function calculateIntegration() {
  const key = functionSelect.value;
  const config = functionsData[key];
  const n = Number(nSelect.value);
  const bins = Number(binsSelect.value);

  let riemann;
  let lebesgue;
  let explanation;

  if (key === "dirichlet") {
    riemann = 1;
    lebesgue = 0;

    explanation =
      "The domain grid contains rational sample points, so the naive midpoint calculation returns 1. " +
      "This is not a valid Riemann approximation: the function is discontinuous everywhere and is not Riemann-integrable. " +
      "The set where f(x) = 1 is the rationals, which has Lebesgue measure zero. " +
      "The Lebesgue integral is therefore 0. This example shows that a numerical grid cannot replace mathematical analysis.";
  } else {
    riemann = riemannMidpoint(config.fn, config.a, config.b, n);
    lebesgue = lebesgueInspired(config.fn, config.a, config.b, n, bins);

    if (key === "thomae") {
      explanation =
        "The function is Riemann-integrable and its integral is zero. " +
        "The finite grid contains rational points, so the numerical estimate can be slightly positive. " +
        "As the grid becomes finer, the contribution of points with large denominators becomes smaller. " +
        "The range partition also approximates the distribution of these small function values.";
    } else if (key === "inverseRoot") {
      explanation =
        "The integral exists, even though the function becomes unbounded near zero. " +
        "The midpoint method avoids the singular endpoint, but convergence can be slower than for bounded smooth functions. " +
        "The range-based method is sensitive to the large values near zero and to the chosen range bins.";
    } else {
      explanation =
        "Both methods approximate the same integral. The midpoint sum partitions the domain, while the range-based method groups sampled function values. " +
        "For this Riemann-integrable function, increasing the number of samples and range bins should generally bring both estimates closer to the reference value. " +
        "The two finite-resolution results need not be identical.";
    }
  }

  const exact = config.exact;
  const riemannError = Math.abs(riemann - exact);
  const lebesgueError = Math.abs(lebesgue - exact);

  $("riemannResult").textContent = formatNumber(riemann);
  $("lebesgueResult").textContent = formatNumber(lebesgue);
  $("exactResult").textContent = formatNumber(exact);

  $("riemannError").textContent = "Absolute error: " + formatNumber(riemannError);
  $("lebesgueError").textContent = "Absolute error: " + formatNumber(lebesgueError);

  $("referenceType").textContent =
    key === "sinc" ? "Numerical reference" :
    key === "dirichlet" ? "Lebesgue integral" :
    key === "thomae" ? "Lebesgue / Riemann integral" :
    "Analytical value";

  $("functionDescription").textContent = config.description;
  $("integrationAnalysis").innerHTML =
    "<h4>What do the results tell us?</h4><p>" + explanation + "</p>";

  integrationData = {
    key,
    config,
    n,
    bins,
    riemann,
    lebesgue,
    exact
  };

  drawFunctionChart();
  drawComparisonChart();
}


function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(300, rect.width);
  const height = Number(canvas.getAttribute("height")) || 220;

  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  return { ctx, width, height };
}

function drawAxes(ctx, width, height, padding, yMin, yMax) {
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  ctx.strokeStyle = "rgba(148,163,184,0.18)";
  ctx.lineWidth = 1;
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#94a3b8";

  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (plotHeight * i) / 4;

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const value = yMax - (i / 4) * (yMax - yMin);
    ctx.fillText(value.toFixed(2), 4, y + 4);
  }

  ctx.strokeStyle = "rgba(148,163,184,0.35)";
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  return { plotWidth, plotHeight };
}

function drawFunctionChart() {
  if (!integrationData) return;

  const canvas = $("functionChart");
  const { ctx, width, height } = prepareCanvas(canvas);
  const { config, key } = integrationData;

  const padding = { left: 48, right: 14, top: 16, bottom: 28 };
  const sampleCount = 400;
  const values = [];

  let yMin = Infinity;
  let yMax = -Infinity;

  for (let i = 0; i <= sampleCount; i++) {
    const x = config.a + (i / sampleCount) * (config.b - config.a);
    let value = config.fn(x);

    if (!Number.isFinite(value)) value = 0;

    value = Math.min(value, 5);

    values.push(value);
    yMin = Math.min(yMin, value);
    yMax = Math.max(yMax, value);
  }

  if (Math.abs(yMax - yMin) < 1e-12) {
    yMax += 1;
    yMin -= 1;
  }

  const margin = (yMax - yMin) * 0.12;
  yMin -= margin;
  yMax += margin;

  const { plotWidth, plotHeight } = drawAxes(
    ctx, width, height, padding, yMin, yMax
  );

  const xAt = (i) => padding.left + (i / sampleCount) * plotWidth;
  const yAt = (v) => padding.top + ((yMax - v) / (yMax - yMin)) * plotHeight;

  ctx.beginPath();

  values.forEach((value, i) => {
    const x = xAt(i);
    const y = yAt(value);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.lineTo(xAt(sampleCount), height - padding.bottom);
  ctx.lineTo(xAt(0), height - padding.bottom);
  ctx.closePath();

  ctx.fillStyle = "rgba(96,165,250,0.10)";
  ctx.fill();

  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px sans-serif";
  ctx.fillText(config.a.toFixed(2), padding.left, height - 8);
  ctx.fillText(config.b.toFixed(2), width - padding.right - 30, height - 8);

  if (key === "dirichlet") {
    ctx.fillStyle = "#c084fc";
    ctx.fillText("Grid samples are rational", padding.left + 8, padding.top + 15);
  }
}

function drawComparisonChart() {
  if (!integrationData) return;

  const canvas = $("comparisonChart");
  const { ctx, width, height } = prepareCanvas(canvas);

  const { riemann, lebesgue, exact } = integrationData;
  const values = [riemann, lebesgue, exact];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, Math.abs(max) * 0.15, 0.1);

  const yMin = min - spread * 0.25;
  const yMax = max + spread * 0.25;

  const padding = { left: 58, right: 20, top: 20, bottom: 34 };
  const { plotWidth, plotHeight } = drawAxes(
    ctx, width, height, padding, yMin, yMax
  );

  const yAt = (v) =>
    padding.top + ((yMax - v) / (yMax - yMin)) * plotHeight;

  const positions = [
    padding.left + plotWidth * 0.2,
    padding.left + plotWidth * 0.5,
    padding.left + plotWidth * 0.8
  ];

  const colors = ["#60a5fa", "#c084fc", "#5eead4"];
  const labels = ["Riemann", "Lebesgue", "Reference"];

  values.forEach((value, i) => {
    const x = positions[i];
    const y = yAt(value);

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = colors[i];
    ctx.fill();

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(labels[i], x, height - 10);

    ctx.fillStyle = "#f1f5f9";
    ctx.fillText(value.toFixed(5), x, y - 12);
  });

  ctx.textAlign = "left";
}


const SQRT_2 = Math.sqrt(2);
const SQRT_2_PI = Math.sqrt(2 * Math.PI);
const SQRT_PI = Math.sqrt(Math.PI);

function normalPdf(x) {
  return Math.exp(-0.5 * x * x) / SQRT_2_PI;
}


function simpsonCdf(x, intervals) {
  if (x === 0) return 0.5;

  const sign = x < 0 ? -1 : 1;
  const upper = Math.abs(x);
  const n = Math.max(2, intervals % 2 === 0 ? intervals : intervals + 1);
  const h = upper / n;

  let sum = normalPdf(0) + normalPdf(upper);

  for (let i = 1; i < n; i++) {
    const coefficient = i % 2 === 0 ? 2 : 4;
    sum += coefficient * normalPdf(i * h);
  }

  const area = (h / 3) * sum;
  return 0.5 + sign * area;
}



function erfSeries(z) {
  if (z === 0) return 0;

  const z2 = z * z;
  let term = z;
  let sum = term;

  for (let n = 1; n < 250; n++) {
    term *= -z2 / n;
    const addition = term / (2 * n + 1);
    sum += addition;

    if (Math.abs(addition) < 1e-16) break;
  }

  return (2 / SQRT_PI) * sum;
}

function seriesCdf(x) {
  return 0.5 * (1 + erfSeries(x / SQRT_2));
}



function erfcApprox(z) {
  const x = Math.abs(z);
  const t = 1 / (1 + 0.5 * x);

  const tau = t * Math.exp(
    -x * x - 1.26551223 +
    t * (
      1.00002368 +
      t * (
        0.37409196 +
        t * (
          0.09678418 +
          t * (
            -0.18628806 +
            t * (
              0.27886807 +
              t * (
                -1.13520398 +
                t * (
                  1.48851587 +
                  t * (
                    -0.82215223 +
                    t * 0.17087277
                  )
                )
              )
            )
          )
        )
      )
    )
  );

  return z >= 0 ? tau : 2 - tau;
}

function approximationCdf(x) {
  return 0.5 * erfcApprox(-x / SQRT_2);
}



function referenceCdf(x) {
  return simpsonCdf(x, 30000);
}

function measureTime(fn) {
  const start = performance.now();
  const result = fn();
  const elapsed = performance.now() - start;

  return { result, elapsed };
}

function calculateCdf() {
  const x = Number($("cdfInput").value);
  const intervals = Number($("simpsonSteps").value);

  if (!Number.isFinite(x) || x < -3 || x > 3) {
    $("cdfAnalysis").innerHTML =
      "<h4>Input outside the supported range</h4>" +
      "<p>Please enter a value between −3 and 3. This range keeps the power-series comparison numerically stable.</p>";
    return;
  }

  const reference = referenceCdf(x);

  const simpson = measureTime(() => simpsonCdf(x, intervals));
  const series = measureTime(() => seriesCdf(x));
  const approximation = measureTime(() => approximationCdf(x));

  const rows = [
    {
      name: "Simpson's rule",
      ...simpson
    },
    {
      name: "erf power series",
      ...series
    },
    {
      name: "erf approximation",
      ...approximation
    }
  ];

  $("cdfResults").innerHTML = rows.map((row) => {
    const error = Math.abs(row.result - reference);

    return `
      <tr>
        <td>${row.name}</td>
        <td>${row.result.toFixed(12)}</td>
        <td>${error.toExponential(3)}</td>
        <td>${row.elapsed.toFixed(4)} ms</td>
      </tr>
    `;
  }).join("");

  const best = rows.reduce((a, b) =>
    Math.abs(a.result - reference) < Math.abs(b.result - reference) ? a : b
  );

  const fastest = rows.reduce((a, b) =>
    a.elapsed < b.elapsed ? a : b
  );

  $("cdfAnalysis").innerHTML =
    "<h4>Results for x = " + x.toFixed(2) + "</h4>" +
    "<p>The high-resolution Simpson calculation used as an internal benchmark gives Φ(x) ≈ " +
    reference.toFixed(12) + ". Among the three methods, <strong>" +
    best.name + "</strong> has the smallest absolute error in this run, while <strong>" +
    fastest.name + "</strong> is the fastest. Very short execution times can fluctuate because of browser scheduling and measurement precision, so timing should be interpreted as indicative rather than as a formal benchmark.</p>" +
    "<p>Simpson's rule depends on the number of intervals. The series depends on the size of its terms and is particularly useful for moderate inputs. The polynomial approximation is fast, but introduces a small approximation error of its own.</p>";

  drawNormalChart(x);
}


function drawNormalChart(selectedX) {
  const canvas = $("normalChart");
  const { ctx, width, height } = prepareCanvas(canvas);

  const padding = { left: 48, right: 18, top: 18, bottom: 30 };
  const xMin = -4;
  const xMax = 4;
  const yMin = 0;
  const yMax = 0.43;

  const { plotWidth, plotHeight } = drawAxes(
    ctx, width, height, padding, yMin, yMax
  );

  const xAt = (x) =>
    padding.left + ((x - xMin) / (xMax - xMin)) * plotWidth;

  const yAt = (y) =>
    padding.top + ((yMax - y) / (yMax - yMin)) * plotHeight;


  const shadeEnd = Math.max(xMin, Math.min(xMax, selectedX));

  ctx.beginPath();
  ctx.moveTo(xAt(xMin), yAt(0));

  for (let i = 0; i <= 500; i++) {
    const x = xMin + (i / 500) * (shadeEnd - xMin);
    ctx.lineTo(xAt(x), yAt(normalPdf(x)));
  }

  ctx.lineTo(xAt(shadeEnd), yAt(0));
  ctx.closePath();

  ctx.fillStyle = "rgba(94,234,212,0.20)";
  ctx.fill();

  /* Draw the normal density curve. */

  ctx.beginPath();

  for (let i = 0; i <= 500; i++) {
    const x = xMin + (i / 500) * (xMax - xMin);
    const y = normalPdf(x);

    if (i === 0) ctx.moveTo(xAt(x), yAt(y));
    else ctx.lineTo(xAt(x), yAt(y));
  }

  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 2.5;
  ctx.stroke();


  ctx.beginPath();
  ctx.moveTo(xAt(selectedX), yAt(0));
  ctx.lineTo(xAt(selectedX), yAt(normalPdf(selectedX)));
  ctx.strokeStyle = "#5eead4";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "11px sans-serif";
  ctx.fillText("−4", xAt(-4), height - 8);
  ctx.fillText("0", xAt(0), height - 8);
  ctx.fillText("4", xAt(4) - 7, height - 8);
}


function formatNumber(value) {
  if (!Number.isFinite(value)) return "Not finite";
  return value.toFixed(8);
}

function updateIntegrationLabels() {
  $("nValue").textContent = Number(nSelect.value).toLocaleString("en-US");
  $("binsValue").textContent = binsSelect.value;
}

function runIntegration() {
  updateIntegrationLabels();
  calculateIntegration();
}

function runCdf() {
  calculateCdf();
}

function initialize() {
  functionSelect.addEventListener("change", runIntegration);
  nSelect.addEventListener("change", runIntegration);
  binsSelect.addEventListener("change", runIntegration);

  $("runIntegration").addEventListener("click", runIntegration);

  $("calculateCdf").addEventListener("click", runCdf);
  $("cdfInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") runCdf();
  });

  $("simpsonSteps").addEventListener("change", runCdf);

  window.addEventListener("resize", () => {
    if (integrationData) {
      drawFunctionChart();
      drawComparisonChart();
    }

    drawNormalChart(Number($("cdfInput").value) || 0);
  });

  runIntegration();
  runCdf();
}

document.addEventListener("DOMContentLoaded", initialize);

