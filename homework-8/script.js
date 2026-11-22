
const sampleSizeInput = document.getElementById("sampleSize");
const repetitionsInput = document.getElementById("repetitions");

const sampleSizeValue = document.getElementById("sampleSizeValue");
const repetitionsValue = document.getElementById("repetitionsValue");

const theoreticalMeanElement =
    document.getElementById("theoreticalMean");

const simulatedMeanElement =
    document.getElementById("simulatedMean");

const theoreticalSEElement =
    document.getElementById("theoreticalSE");

const simulatedSDElement =
    document.getElementById("simulatedSD");

const runSimulationButton =
    document.getElementById("runSimulation");

const chartCanvas =
    document.getElementById("cltChart");

const chartContext =
    chartCanvas.getContext("2d");


const populationMean = 0.5;
const populationVariance = 1 / 12;
const populationSD = Math.sqrt(populationVariance);


function updateSimulationControls() {

    sampleSizeValue.textContent =
        sampleSizeInput.value;

    repetitionsValue.textContent =
        repetitionsInput.value;
}


sampleSizeInput.addEventListener(
    "input",
    updateSimulationControls
);

repetitionsInput.addEventListener(
    "input",
    updateSimulationControls
);


function randomUniform() {

    return Math.random();
}


function generateSampleMean(n) {

    let sum = 0;

    for (let i = 0; i < n; i++) {

        sum += randomUniform();

    }

    return sum / n;
}


function calculateMean(values) {

    const sum = values.reduce(
        (accumulator, value) => accumulator + value,
        0
    );

    return sum / values.length;
}


function calculateStandardDeviation(values) {

    const mean = calculateMean(values);

    const squaredDifferences = values.map(
        value => Math.pow(value - mean, 2)
    );

    const variance = calculateMean(squaredDifferences);

    return Math.sqrt(variance);
}


function normalPDF(x, mean, standardDeviation) {

    const exponent = -0.5 *
        Math.pow(
            (x - mean) / standardDeviation,
            2
        );

    return (
        1 /
        (standardDeviation * Math.sqrt(2 * Math.PI))
    ) * Math.exp(exponent);
}


function runCLTSimulation() {

    const n = Number(sampleSizeInput.value);

    const repetitions = Number(repetitionsInput.value);

    const sampleMeans = [];

    for (let i = 0; i < repetitions; i++) {

        sampleMeans.push(
            generateSampleMean(n)
        );

    }

    const simulatedMean =
        calculateMean(sampleMeans);

    const simulatedSD =
        calculateStandardDeviation(sampleMeans);

    const theoreticalSE =
        populationSD / Math.sqrt(n);

    simulatedMeanElement.textContent =
        simulatedMean.toFixed(4);

    theoreticalSEElement.textContent =
        theoreticalSE.toFixed(4);

    simulatedSDElement.textContent =
        simulatedSD.toFixed(4);

    drawHistogram(
        sampleMeans,
        n,
        theoreticalSE
    );
}


function drawHistogram(
    values,
    n,
    theoreticalSE
) {

    const canvas = chartCanvas;

    const context = chartContext;

    const rect = canvas.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);

    canvas.height = Math.round(rect.height * dpr);

    context.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );

    const width = rect.width;

    const height = rect.height;

    const margin = {
        top: 25,
        right: 25,
        bottom: 45,
        left: 55
    };

    const plotWidth =
        width - margin.left - margin.right;

    const plotHeight =
        height - margin.top - margin.bottom;



    context.clearRect(
        0,
        0,
        width,
        height
    );


    const numberOfBins = 30;

    const minX = 0;

    const maxX = 1;

    const binWidth =
        (maxX - minX) / numberOfBins;

    const bins = Array(numberOfBins).fill(0);


    values.forEach(value => {

        let binIndex = Math.floor(
            (value - minX) / binWidth
        );

        if (binIndex < 0) {
            binIndex = 0;
        }

        if (binIndex >= numberOfBins) {
            binIndex = numberOfBins - 1;
        }

        bins[binIndex]++;

    });



    const densities = bins.map(
        count => count / (values.length * binWidth)
    );



    const curvePoints = [];

    const curveSteps = 300;

    for (let i = 0; i <= curveSteps; i++) {

        const x =
            minX + (maxX - minX) *
            (i / curveSteps);

        const density = normalPDF(
            x,
            populationMean,
            theoreticalSE
        );

        curvePoints.push({
            x,
            y: density
        });

    }


    const maximumDensity = Math.max(
        ...densities,
        ...curvePoints.map(point => point.y)
    );



    function xToPixel(x) {

        return margin.left +
            ((x - minX) / (maxX - minX)) *
            plotWidth;

    }

    function yToPixel(y) {

        return margin.top +
            plotHeight -
            (y / maximumDensity) *
            plotHeight;

    }



    context.strokeStyle = "#e8edf5";

    context.lineWidth = 1;

    context.font = "12px Arial";

    context.fillStyle = "#718096";

    context.textAlign = "right";

    context.textBaseline = "middle";


    for (let i = 0; i <= 4; i++) {

        const value =
            maximumDensity * i / 4;

        const y =
            yToPixel(value);

        context.beginPath();

        context.moveTo(
            margin.left,
            y
        );

        context.lineTo(
            margin.left + plotWidth,
            y
        );

        context.stroke();

        context.fillText(
            value.toFixed(2),
            margin.left - 8,
            y
        );

    }



    context.textAlign = "center";

    context.textBaseline = "top";

    for (let x = 0; x <= 1.0001; x += 0.1) {

        const pixelX =
            xToPixel(x);

        context.fillText(
            x.toFixed(1),
            pixelX,
            margin.top + plotHeight + 10
        );

    }



    const barPixelWidth =
        plotWidth / numberOfBins;

    context.fillStyle = "#8ca7ed";

    context.globalAlpha = 0.8;

    bins.forEach((count, index) => {

        const density =
            densities[index];

        const barHeight =
            (density / maximumDensity) *
            plotHeight;

        const x =
            margin.left +
            index * barPixelWidth;

        const y =
            margin.top +
            plotHeight -
            barHeight;

        context.fillRect(
            x + 1,
            y,
            Math.max(0, barPixelWidth - 2),
            barHeight
        );

    });

    context.globalAlpha = 1;


    context.beginPath();

    curvePoints.forEach(
        (point, index) => {

            const x =
                xToPixel(point.x);

            const y =
                yToPixel(point.y);

            if (index === 0) {

                context.moveTo(x, y);

            } else {

                context.lineTo(x, y);

            }

        }
    );

    context.strokeStyle = "#d85b60";

    context.lineWidth = 2.5;

    context.stroke();



    context.strokeStyle = "#94a3b8";

    context.lineWidth = 1.2;

    context.beginPath();

    context.moveTo(
        margin.left,
        margin.top
    );

    context.lineTo(
        margin.left,
        margin.top + plotHeight
    );

    context.lineTo(
        margin.left + plotWidth,
        margin.top + plotHeight
    );

    context.stroke();



    const legendY = 13;

    context.font = "12px Arial";

    context.textAlign = "left";

    context.textBaseline = "middle";

    context.fillStyle = "#718096";

    context.fillRect(
        margin.left + 5,
        legendY - 4,
        12,
        12
    );

    context.fillText(
        "Sample means",
        margin.left + 23,
        legendY
    );

    context.strokeStyle = "#d85b60";

    context.lineWidth = 2.5;

    context.beginPath();

    context.moveTo(
        margin.left + 130,
        legendY
    );

    context.lineTo(
        margin.left + 148,
        legendY
    );

    context.stroke();

    context.fillText(
        "Normal approximation",
        margin.left + 155,
        legendY
    );

}



runSimulationButton.addEventListener(
    "click",
    runCLTSimulation
);


window.addEventListener(
    "resize",
    () => {

        const n =
            Number(sampleSizeInput.value);

        const theoreticalSE =
            populationSD / Math.sqrt(n);



        if (simulatedMeanElement.textContent !== "—") {

            runCLTSimulation();

        }

    }
);



updateSimulationControls();

runCLTSimulation();


const prevalenceInput =
    document.getElementById("prevalence");

const sensitivityInput =
    document.getElementById("sensitivity");

const specificityInput =
    document.getElementById("specificity");


const prevalenceValue =
    document.getElementById("prevalenceValue");

const sensitivityValue =
    document.getElementById("sensitivityValue");

const specificityValue =
    document.getElementById("specificityValue");


const posteriorResult =
    document.getElementById("posteriorResult");

const posteriorBar =
    document.getElementById("posteriorBar");


const priorResult =
    document.getElementById("priorResult");

const likelihoodResult =
    document.getElementById("likelihoodResult");

const positiveResult =
    document.getElementById("positiveResult");


const truePositiveCount =
    document.getElementById("truePositiveCount");

const falsePositiveCount =
    document.getElementById("falsePositiveCount");

const totalPositiveCount =
    document.getElementById("totalPositiveCount");

const populationExplanation =
    document.getElementById("populationExplanation");


function formatPercent(value) {

    return (value * 100).toFixed(2) + "%";

}


function updateBayesCalculator() {

    const prevalence =
        Number(prevalenceInput.value) / 100;

    const sensitivity =
        Number(sensitivityInput.value) / 100;

    const specificity =
        Number(specificityInput.value) / 100;


    const falsePositiveRate =
        1 - specificity;



    const probabilityPositive =
        sensitivity * prevalence +
        falsePositiveRate * (1 - prevalence);


    const posterior =
        probabilityPositive > 0
        ? (
            sensitivity * prevalence /
            probabilityPositive
        )
        : 0;



    prevalenceValue.textContent =
        Number(prevalenceInput.value).toFixed(1) + "%";

    sensitivityValue.textContent =
        sensitivityInput.value + "%";

    specificityValue.textContent =
        specificityInput.value + "%";



    posteriorResult.textContent =
        formatPercent(posterior);

    posteriorBar.style.width =
        (posterior * 100) + "%";


    priorResult.textContent =
        formatPercent(prevalence);

    likelihoodResult.textContent =
        formatPercent(sensitivity);

    positiveResult.textContent =
        formatPercent(probabilityPositive);



    const population = 10000;

    const affected =
        population * prevalence;

    const unaffected =
        population - affected;


    const truePositives =
        affected * sensitivity;

    const falsePositives =
        unaffected * falsePositiveRate;

    const totalPositives =
        truePositives + falsePositives;


    truePositiveCount.textContent =
        Math.round(truePositives).toLocaleString();

    falsePositiveCount.textContent =
        Math.round(falsePositives).toLocaleString();

    totalPositiveCount.textContent =
        Math.round(totalPositives).toLocaleString();



    populationExplanation.textContent =
        "Among " +
        population.toLocaleString() +
        " people, approximately " +
        Math.round(truePositives).toLocaleString() +
        " would test positive and actually have the condition, " +
        "while " +
        Math.round(falsePositives).toLocaleString() +
        " would test positive without having it. " +
        "The probability that a positive result corresponds " +
        "to the condition is therefore approximately " +
        formatPercent(posterior) +
        ".";

}



prevalenceInput.addEventListener(
    "input",
    updateBayesCalculator
);

sensitivityInput.addEventListener(
    "input",
    updateBayesCalculator
);

specificityInput.addEventListener(
    "input",
    updateBayesCalculator
);



updateBayesCalculator();
