
const sampleSizeSlider = document.getElementById("sampleSize");
const repetitionsSlider = document.getElementById("repetitions");

const sampleSizeLabel = document.getElementById("sampleSizeLabel");
const repetitionsLabel = document.getElementById("repetitionsLabel");

const runSimulationButton = document.getElementById("runSimulation");
const cltCanvas = document.getElementById("cltCanvas");

const theoreticalMeanElement =
  document.getElementById("theoreticalMean");

const simulatedMeanElement =
  document.getElementById("simulatedMean");

const theoreticalSEElement =
  document.getElementById("theoreticalSE");

const simulatedSDElement =
  document.getElementById("simulatedSD");

let lastSimulation = null;



function generateSampleMean(n) {
  let sum = 0;

  for (let i = 0; i < n; i++) {
    sum += Math.random();
  }

  return sum / n;
}



function calculateMean(values) {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0)
    / values.length;
}


function calculateSD(values) {
  if (values.length < 2) return 0;

  const mean = calculateMean(values);

  const squaredDifferences = values.map(
    value => (value - mean) ** 2
  );

  const variance = squaredDifferences.reduce(
    (sum, value) => sum + value, 0
  ) / (values.length - 1);

  return Math.sqrt(variance);
}



function runCLTSimulation() {
  const n = Number(sampleSizeSlider.value);
  const repetitions = Number(repetitionsSlider.value);

  const means = [];

  for (let i = 0; i < repetitions; i++) {
    means.push(generateSampleMean(n));
  }

  const simulatedMean = calculateMean(means);
  const simulatedSD = calculateSD(means);

  const theoreticalMean = 0.5;
  const theoreticalVariance = 1 / 12;
  const theoreticalSE = Math.sqrt(theoreticalVariance / n);

  lastSimulation = {
    n,
    repetitions,
    means,
    simulatedMean,
    simulatedSD,
    theoreticalMean,
    theoreticalSE
  };

  sampleSizeLabel.textContent = n;
  repetitionsLabel.textContent =
    repetitions.toLocaleString();

  theoreticalMeanElement.textContent =
    theoreticalMean.toFixed(4);

  simulatedMeanElement.textContent =
    simulatedMean.toFixed(4);

  theoreticalSEElement.textContent =
    theoreticalSE.toFixed(4);

  simulatedSDElement.textContent =
    simulatedSD.toFixed(4);

  drawHistogram();

}



function drawHistogram() {
  if (!lastSimulation) return;

  const canvas = cltCanvas;
  const ctx = canvas.getContext("2d");

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (!width || !height) return;

  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const margin = {
    top: 20,
    right: 15,
    bottom: 40,
    left: 48
  };

  const plotWidth =
    width - margin.left - margin.right;

  const plotHeight =
    height - margin.top - margin.bottom;

  const xMin = 0;
  const xMax = 1;

  const bins = 30;
  const binWidth = (xMax - xMin) / bins;

  const counts = new Array(bins).fill(0);

  lastSimulation.means.forEach(value => {
    let index = Math.floor(
      (value - xMin) / binWidth
    );

    if (index < 0) index = 0;
    if (index >= bins) index = bins - 1;

    counts[index]++;
  });

 
  const densities = counts.map(
    count => count /
      (lastSimulation.repetitions * binWidth)
  );

  const n = lastSimulation.n;

  const mu = 0.5;
  const sigma = Math.sqrt(1 / (12 * n));


  function normalPDF(x) {
    const z = (x - mu) / sigma;

    return Math.exp(-0.5 * z * z)
      / (sigma * Math.sqrt(2 * Math.PI));
  }

  let maxDensity = Math.max(...densities);

  for (let i = 0; i <= 300; i++) {
    const x = xMin + (xMax - xMin) * i / 300;
    maxDensity = Math.max(maxDensity, normalPDF(x));
  }

  maxDensity *= 1.15;


  function xToPixel(x) {
    return margin.left +
      (x - xMin) / (xMax - xMin) * plotWidth;
  }

  function yToPixel(y) {
    return margin.top +
      plotHeight -
      (y / maxDensity) * plotHeight;
  }


  ctx.clearRect(0, 0, width, height);

  /* Grid */

  ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  ctx.lineWidth = 1;

  ctx.fillStyle = "#8494aa";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "right";

  const yTicks = 4;

  for (let i = 0; i <= yTicks; i++) {
    const value = maxDensity * i / yTicks;
    const y = yToPixel(value);

    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + plotWidth, y);
    ctx.stroke();

    ctx.fillText(
      value.toFixed(1),
      margin.left - 8,
      y + 4
    );
  }


  ctx.textAlign = "center";

  for (let i = 0; i <= 5; i++) {
    const x = i / 5;
    const px = xToPixel(x);

    ctx.fillText(
      x.toFixed(1),
      px,
      margin.top + plotHeight + 22
    );
  }


  const barGap = 2;

  counts.forEach((count, i) => {
    const density = densities[i];

    const x = xToPixel(
      xMin + i * binWidth
    );

    const barWidth =
      plotWidth / bins - barGap;

    const y = yToPixel(density);

    const barHeight =
      margin.top + plotHeight - y;

    ctx.fillStyle = "rgba(45, 212, 191, 0.55)";

    ctx.beginPath();

    ctx.roundRect(
      x + barGap / 2,
      y,
      barWidth,
      Math.max(0, barHeight),
      [3, 3, 0, 0]
    );

    ctx.fill();
  });


  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 2.5;

  ctx.beginPath();

  for (let i = 0; i <= 300; i++) {
    const x = xMin + (xMax - xMin) * i / 300;
    const y = normalPDF(x);

    const px = xToPixel(x);
    const py = yToPixel(y);

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.stroke();


  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px sans-serif";

  ctx.textAlign = "center";

  ctx.fillText(
    "Sample mean",
    margin.left + plotWidth / 2,
    height - 5
  );

  ctx.save();

  ctx.translate(13, margin.top + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);

  ctx.fillText("Density", 0, 0);

  ctx.restore();

}



sampleSizeSlider.addEventListener(
  "input",
  () => {
    sampleSizeLabel.textContent =
      sampleSizeSlider.value;
  }
);

repetitionsSlider.addEventListener(
  "input",
  () => {
    repetitionsLabel.textContent =
      Number(repetitionsSlider.value)
        .toLocaleString();
  }
);

runSimulationButton.addEventListener(
  "click",
  runCLTSimulation
);



window.addEventListener("resize", () => {
  drawHistogram();
});



runCLTSimulation();



const prevalenceSlider =
  document.getElementById("prevalence");

const sensitivitySlider =
  document.getElementById("sensitivity");

const specificitySlider =
  document.getElementById("specificity");


const prevalenceLabel =
  document.getElementById("prevalenceLabel");

const sensitivityLabel =
  document.getElementById("sensitivityLabel");

const specificityLabel =
  document.getElementById("specificityLabel");


const posteriorValue =
  document.getElementById("posteriorValue");

const posteriorBar =
  document.getElementById("posteriorBar");

const posteriorExplanation =
  document.getElementById("posteriorExplanation");


const priorResult =
  document.getElementById("priorResult");

const likelihoodResult =
  document.getElementById("likelihoodResult");

const falsePositiveResult =
  document.getElementById("falsePositiveResult");

const positiveProbability =
  document.getElementById("positiveProbability");


const populationTable =
  document.getElementById("bayesPopulationTable");

const bayesInterpretation =
  document.getElementById("bayesInterpretation");



function formatPercent(value, decimals = 2) {
  return (value * 100).toFixed(decimals) + "%";
}



function formatCount(value) {
  return Math.round(value).toLocaleString();
}



function updateBayesCalculator() {

  const prevalence =
    Number(prevalenceSlider.value) / 100;

  const sensitivity =
    Number(sensitivitySlider.value) / 100;

  const specificity =
    Number(specificitySlider.value) / 100;

  const falsePositiveRate =
    1 - specificity;


  const probabilityPositive =
    sensitivity * prevalence
    + falsePositiveRate * (1 - prevalence);


  const posterior =
    probabilityPositive > 0
      ? (sensitivity * prevalence)
        / probabilityPositive
      : 0;



  prevalenceLabel.textContent =
    Number(prevalenceSlider.value) + "%";

  sensitivityLabel.textContent =
    Number(sensitivitySlider.value) + "%";

  specificityLabel.textContent =
    Number(specificitySlider.value) + "%";



  posteriorValue.textContent =
    formatPercent(posterior, 2);

  posteriorBar.style.width =
    (posterior * 100) + "%";

  posteriorExplanation.textContent =
    "Probability of disease given a positive result";



  priorResult.textContent =
    formatPercent(prevalence, 2);

  likelihoodResult.textContent =
    formatPercent(sensitivity, 2);

  falsePositiveResult.textContent =
    formatPercent(falsePositiveRate, 2);

  positiveProbability.textContent =
    formatPercent(probabilityPositive, 2);



  const population = 10000;

  const diseaseCount =
    population * prevalence;

  const noDiseaseCount =
    population * (1 - prevalence);

  const truePositive =
    diseaseCount * sensitivity;

  const falseNegative =
    diseaseCount * (1 - sensitivity);

  const falsePositive =
    noDiseaseCount * falsePositiveRate;

  const trueNegative =
    noDiseaseCount * specificity;

  const totalPositive =
    truePositive + falsePositive;

  const totalNegative =
    falseNegative + trueNegative;



  populationTable.innerHTML = `
    <tr>
      <td>With disease</td>
      <td>${formatCount(truePositive)}</td>
      <td>${formatCount(falseNegative)}</td>
      <td>${formatCount(diseaseCount)}</td>
    </tr>

    <tr>
      <td>Without disease</td>
      <td>${formatCount(falsePositive)}</td>
      <td>${formatCount(trueNegative)}</td>
      <td>${formatCount(noDiseaseCount)}</td>
    </tr>

    <tr>
      <td><strong>Total</strong></td>
      <td class="total-cell">${formatCount(totalPositive)}</td>
      <td class="total-cell">${formatCount(totalNegative)}</td>
      <td class="total-cell">${formatCount(population)}</td>
    </tr>
  `;



  if (posterior < 0.1) {

    bayesInterpretation.textContent =
      "Even after a positive test, the probability of disease " +
      "remains relatively low. This illustrates how a low prior " +
      "prevalence can limit the posterior probability, even when " +
      "the test performs well.";

  } else if (posterior < 0.5) {

    bayesInterpretation.textContent =
      "A positive result increases the probability of disease, " +
      "but the probability remains below 50%. The prior prevalence " +
      "and the false positive rate still have an important influence.";

  } else {

    bayesInterpretation.textContent =
      "A positive result makes disease more likely than not " +
      "under the selected parameters. The posterior probability " +
      "combines the prior prevalence and the diagnostic accuracy " +
      "of the test.";
  }

}



prevalenceSlider.addEventListener(
  "input",
  updateBayesCalculator
);

sensitivitySlider.addEventListener(
  "input",
  updateBayesCalculator
);

specificitySlider.addEventListener(
  "input",
  updateBayesCalculator
);


updateBayesCalculator();
