"use strict";


const THEORETICAL_MEAN = 5;
const THEORETICAL_VARIANCE = 10;


const hackersInput = document.getElementById("hackersInput");
const systemsInput = document.getElementById("systemsInput");
const seedInput = document.getElementById("seedInput");
const hackersValue = document.getElementById("hackersValue");
const systemsValue = document.getElementById("systemsValue");
const runButton = document.getElementById("runButton");

const meanEstimate = document.getElementById("meanEstimate");
const varianceEstimate = document.getElementById("varianceEstimate");
const meanError = document.getElementById("meanError");
const varianceError = document.getElementById("varianceError");
const runStatus = document.getElementById("runStatus");

const tableMean = document.getElementById("tableMean");
const tableVariance = document.getElementById("tableVariance");
const tableMeanError = document.getElementById("tableMeanError");
const tableVarianceError = document.getElementById("tableVarianceError");

const simulationExplanation = document.getElementById(
  "simulationExplanation"
);


function createRandomGenerator(seed) {
  let state = seed >>> 0;

  return function () {
    state += 0x6D2B79F5;

    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


function generateScore(random) {
  return Math.floor(random() * 11);
}


function updateWelford(state, x) {
  state.n++;

  const delta = x - state.mean;

  state.mean += delta / state.n;

  state.M2 += delta * (x - state.mean);
}

function getSampleVariance(state) {
  if (state.n < 2) {
    return 0;
  }

  return state.M2 / (state.n - 1);
}


function formatNumber(value, decimals = 4) {
  return Number(value).toFixed(decimals);
}

function updateInputLabels() {
  const m = Number(hackersInput.value);
  const n = Number(systemsInput.value);

  hackersValue.textContent = m.toLocaleString("en-US");
  systemsValue.textContent = n.toLocaleString("en-US");
}

hackersInput.addEventListener("input", updateInputLabels);
systemsInput.addEventListener("input", updateInputLabels);


function runSimulation() {
  const m = Number(hackersInput.value);
  const n = Number(systemsInput.value);

  let seed = Number(seedInput.value);

  if (!Number.isFinite(seed) || seed < 0) {
    seed = 2026;
    seedInput.value = seed;
  }

  seed = Math.floor(seed);

  const random = createRandomGenerator(seed);

  const samplingMeans = [];
  const samplingVariances = [];

  const checkpoints = [];

  const checkpointCount = 12;
  const checkpointSet = new Set();

  for (let i = 1; i <= checkpointCount; i++) {
    const value = Math.max(
      2,
      Math.round(2 * Math.pow(n / 2, i / checkpointCount))
    );

    checkpointSet.add(Math.min(n, value));
  }

  checkpointSet.add(n);

  const checkpointValues = Array.from(checkpointSet)
    .sort((a, b) => a - b);

  const checkpointSums = checkpointValues.map(() => ({
    mean: 0,
    variance: 0
  }));

  for (let hacker = 0; hacker < m; hacker++) {
    const state = {
      n: 0,
      mean: 0,
      M2: 0
    };

    let checkpointIndex = 0;

    for (let system = 1; system <= n; system++) {
      const score = generateScore(random);

      updateWelford(state, score);

      if (
        checkpointIndex < checkpointValues.length &&
        system === checkpointValues[checkpointIndex]
      ) {
        checkpointSums[checkpointIndex].mean += state.mean;
        checkpointSums[checkpointIndex].variance +=
          getSampleVariance(state);

        checkpointIndex++;
      }
    }

    samplingMeans.push(state.mean);
    samplingVariances.push(getSampleVariance(state));
  }

  const averageMean =
    samplingMeans.reduce((sum, value) => sum + value, 0) / m;

  const averageVariance =
    samplingVariances.reduce((sum, value) => sum + value, 0) / m;

  for (let i = 0; i < checkpointValues.length; i++) {
    checkpointSums[i].mean /= m;
    checkpointSums[i].variance /= m;
  }

  const absoluteMeanError = Math.abs(
    averageMean - THEORETICAL_MEAN
  );

  const absoluteVarianceError = Math.abs(
    averageVariance - THEORETICAL_VARIANCE
  );

  displayResults({
    m,
    n,
    averageMean,
    averageVariance,
    absoluteMeanError,
    absoluteVarianceError
  });

  drawHistogram(
    "meansChart",
    samplingMeans,
    0,
    10,
    THEORETICAL_MEAN,
    "mean"
  );

  drawHistogram(
    "variancesChart",
    samplingVariances,
    0,
    30,
    THEORETICAL_VARIANCE,
    "variance"
  );

  drawConvergenceChart(
    "convergenceChart",
    checkpointValues,
    checkpointSums
  );

  updateInterpretation({
    m,
    n,
    averageMean,
    averageVariance,
    absoluteMeanError,
    absoluteVarianceError
  });
}


function displayResults(results) {
  const {
    m,
    n,
    averageMean,
    averageVariance,
    absoluteMeanError,
    absoluteVarianceError
  } = results;

  meanEstimate.textContent = formatNumber(averageMean);
  varianceEstimate.textContent = formatNumber(averageVariance);

  meanError.textContent =
    "Absolute error: " + formatNumber(absoluteMeanError);

  varianceError.textContent =
    "Absolute error: " + formatNumber(absoluteVarianceError);

  tableMean.textContent = formatNumber(averageMean);
  tableVariance.textContent = formatNumber(averageVariance);

  tableMeanError.textContent = formatNumber(absoluteMeanError);
  tableVarianceError.textContent = formatNumber(absoluteVarianceError);

  runStatus.textContent =
    m.toLocaleString("en-US") +
    " hackers · " +
    n.toLocaleString("en-US") +
    " systems each";
}


function updateInterpretation(results) {
  const {
    m,
    n,
    averageMean,
    averageVariance,
    absoluteMeanError,
    absoluteVarianceError
  } = results;

  let meanComment;

  if (absoluteMeanError < 0.05) {
    meanComment =
      "The average sample mean is very close to the theoretical mean.";
  } else if (absoluteMeanError < 0.15) {
    meanComment =
      "The average sample mean is reasonably close to the theoretical mean.";
  } else {
    meanComment =
      "The average sample mean differs somewhat from the theoretical mean. " +
      "This can happen because of random sampling variation.";
  }

  let varianceComment;

  if (absoluteVarianceError < 0.1) {
    varianceComment =
      "The average sample variance is very close to the theoretical variance.";
  } else if (absoluteVarianceError < 0.4) {
    varianceComment =
      "The average sample variance is reasonably close to the theoretical variance.";
  } else {
    varianceComment =
      "The average sample variance differs somewhat from the theoretical value. " +
      "Random variation is expected in a finite simulation.";
  }

  simulationExplanation.textContent =
    `The experiment simulated ${m.toLocaleString("en-US")} hackers, ` +
    `each attempting ${n.toLocaleString("en-US")} systems. ` +
    `The average sample mean is ${formatNumber(averageMean)}, compared ` +
    `with the theoretical value 5. Its absolute error is ` +
    `${formatNumber(absoluteMeanError)}. ${meanComment} ` +
    `The average sample variance is ${formatNumber(averageVariance)}, ` +
    `compared with the theoretical value 10. Its absolute error is ` +
    `${formatNumber(absoluteVarianceError)}. ${varianceComment} ` +
    `Increasing the number of systems per hacker generally makes each ` +
    `individual estimate more stable. Increasing the number of hackers ` +
    `makes the averages across hackers more stable.`;
}


function prepareCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  const rect = canvas.getBoundingClientRect();

  const width = Math.max(300, rect.width);
  const height = Math.max(180, rect.height);

  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);

  const ctx = canvas.getContext("2d");

  ctx.setTransform(
    pixelRatio,
    0,
    0,
    pixelRatio,
    0,
    0
  );

  ctx.clearRect(0, 0, width, height);

  return {
    canvas,
    ctx,
    width,
    height
  };
}


function drawHistogram(
  canvasId,
  values,
  minValue,
  maxValue,
  theoreticalValue,
  type
) {
  const { ctx, width, height } = prepareCanvas(canvasId);

  const margin = {
    top: 18,
    right: 18,
    bottom: 35,
    left: 38
  };

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const numberOfBins = 30;
  const bins = new Array(numberOfBins).fill(0);

  const binWidth = (maxValue - minValue) / numberOfBins;

  // Count observations in each interval.
  values.forEach(value => {
    let index = Math.floor((value - minValue) / binWidth);

    index = Math.max(
      0,
      Math.min(numberOfBins - 1, index)
    );

    bins[index]++;
  });

  const maxCount = Math.max(...bins, 1);

  ctx.strokeStyle = "rgba(157,180,210,0.12)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i++) {
    const y = margin.top + (chartHeight * i) / 4;

    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + chartWidth, y);
    ctx.stroke();
  }

  const barGap = 2;
  const barWidth = chartWidth / numberOfBins;

  const barColor =
    type === "mean" ? "#72e0c0" : "#79a9ff";

  ctx.fillStyle = barColor;

  bins.forEach((count, index) => {
    const barHeight = (count / maxCount) * chartHeight;

    const x = margin.left + index * barWidth;
    const y = margin.top + chartHeight - barHeight;

    ctx.fillRect(
      x + barGap / 2,
      y,
      Math.max(1, barWidth - barGap),
      barHeight
    );
  });

  const referenceX =
    margin.left +
    ((theoreticalValue - minValue) / (maxValue - minValue)) *
      chartWidth;

  ctx.save();

  ctx.strokeStyle = "#f3c969";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);

  ctx.beginPath();
  ctx.moveTo(referenceX, margin.top);
  ctx.lineTo(referenceX, margin.top + chartHeight);
  ctx.stroke();

  ctx.restore();

  ctx.fillStyle = "#9aabc2";
  ctx.font = '10px "DM Mono", monospace';
  ctx.textAlign = "center";

  for (let i = 0; i <= 5; i++) {
    const value = minValue + (maxValue - minValue) * i / 5;
    const x = margin.left + chartWidth * i / 5;

    ctx.fillText(
      value.toFixed(0),
      x,
      height - 12
    );
  }

  ctx.textAlign = "left";
  ctx.fillText(
    "Frequency",
    margin.left,
    11
  );

  ctx.textAlign = "right";
  ctx.fillStyle = "#f3c969";

  ctx.fillText(
    "Theoretical: " + theoreticalValue,
    width - margin.right,
    11
  );
}


function drawConvergenceChart(
  canvasId,
  checkpointValues,
  checkpointSums
) {
  const { ctx, width, height } = prepareCanvas(canvasId);

  const margin = {
    top: 25,
    right: 18,
    bottom: 38,
    left: 48
  };

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const meanValues = checkpointSums.map(item => item.mean);
  const varianceValues = checkpointSums.map(item => item.variance);

  const minY = 0;
  const maxY = 12;

  function xPosition(index) {
    if (checkpointValues.length === 1) {
      return margin.left + chartWidth / 2;
    }

    return (
      margin.left +
      (index / (checkpointValues.length - 1)) * chartWidth
    );
  }

  function yPosition(value) {
    return (
      margin.top +
      chartHeight -
      ((value - minY) / (maxY - minY)) * chartHeight
    );
  }

  ctx.strokeStyle = "rgba(157,180,210,0.13)";
  ctx.fillStyle = "#9aabc2";
  ctx.font = '10px "DM Mono", monospace';
  ctx.textAlign = "right";

  for (let i = 0; i <= 6; i++) {
    const value = i * 2;
    const y = yPosition(value);

    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + chartWidth, y);
    ctx.stroke();

    ctx.fillText(
      value.toFixed(0),
      margin.left - 9,
      y + 3
    );
  }

  ctx.save();

  ctx.strokeStyle = "rgba(114,224,192,0.4)";
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.moveTo(margin.left, yPosition(5));
  ctx.lineTo(margin.left + chartWidth, yPosition(5));
  ctx.stroke();

  ctx.restore();

  ctx.save();

  ctx.strokeStyle = "rgba(121,169,255,0.4)";
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.moveTo(margin.left, yPosition(10));
  ctx.lineTo(margin.left + chartWidth, yPosition(10));
  ctx.stroke();

  ctx.restore();

  function drawSeries(values, color) {
    if (values.length === 0) {
      return;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();

    values.forEach((value, index) => {
      const x = xPosition(index);
      const y = yPosition(value);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    values.forEach((value, index) => {
      const x = xPosition(index);
      const y = yPosition(value);

      ctx.fillStyle = color;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawSeries(meanValues, "#72e0c0");
  drawSeries(varianceValues, "#79a9ff");

  ctx.fillStyle = "#9aabc2";
  ctx.font = '10px "DM Mono", monospace';
  ctx.textAlign = "center";

  const labelCount = Math.min(5, checkpointValues.length);

  for (let i = 0; i < labelCount; i++) {
    const index = Math.round(
      i * (checkpointValues.length - 1) /
      Math.max(1, labelCount - 1)
    );

    ctx.fillText(
      checkpointValues[index].toLocaleString("en-US"),
      xPosition(index),
      height - 12
    );
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#9aabc2";
  ctx.fillText("Estimate", margin.left, 12);
}


runButton.addEventListener("click", () => {
  runButton.disabled = true;
  runButton.textContent = "Running simulation...";

  requestAnimationFrame(() => {
    try {
      runSimulation();
    } catch (error) {
      console.error("Simulation error:", error);

      simulationExplanation.textContent =
        "An error occurred while running the simulation. " +
        "Please check the browser console for details.";
    } finally {
      runButton.disabled = false;
      runButton.innerHTML = 'Run simulation <span>↗</span>';
    }
  });
});


window.addEventListener("resize", () => {
  if (window.lastSimulationData) {
    // Charts are redrawn by running a new simulation
    // only when the user clicks the button.
  }
});

updateInputLabels();
