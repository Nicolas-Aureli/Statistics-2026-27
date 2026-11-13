
"use strict";


const $ = (id) => document.getElementById(id);

const studyDataset = `StudyMethod,ExamResult
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Fail
Individual,Fail
Individual,Fail
Individual,Fail
Group,Pass
Group,Pass
Group,Pass
Group,Pass
Group,Pass
Group,Pass
Group,Pass
Group,Pass
Group,Fail
Group,Fail
Group,Fail
Group,Fail
Group,Fail
Group,Fail
Group,Fail
Group,Fail
Group,Fail
Group,Fail
Group,Fail
Group,Fail`;

const deviceDataset = `Device,Purchase
Mobile,Yes
Mobile,Yes
Mobile,Yes
Mobile,Yes
Mobile,Yes
Mobile,Yes
Mobile,Yes
Mobile,Yes
Mobile,Yes
Mobile,Yes
Mobile,Yes
Mobile,Yes
Mobile,No
Mobile,No
Mobile,No
Mobile,No
Mobile,No
Mobile,No
Mobile,No
Mobile,No
Desktop,Yes
Desktop,Yes
Desktop,Yes
Desktop,Yes
Desktop,Yes
Desktop,No
Desktop,No
Desktop,No
Desktop,No
Desktop,No
Desktop,No
Desktop,No
Desktop,No
Desktop,No
Desktop,No
Desktop,No
Desktop,No
Desktop,No
Desktop,No
Desktop,No`;


const criticalValues = {
  1: 3.841,
  2: 5.991,
  3: 7.815,
  4: 9.488,
  5: 11.070,
  6: 12.592,
  7: 14.067,
  8: 15.507,
  9: 16.919,
  10: 18.307,
  12: 21.026,
  15: 24.996,
  20: 31.410,
  24: 36.415,
  30: 43.773,
  40: 55.758,
  60: 79.082,
  120: 145.461
};


function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return replacements[character];
  });
}

function formatNumber(value, digits = 3) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatPercent(value) {
  return (value * 100).toFixed(1) + "%";
}


function parseCSVLine(line, delimiter) {
  const fields = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const character = line[i];

    if (character === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (character === delimiter && !insideQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  if (insideQuotes) {
    throw new Error("A quoted field was not closed correctly.");
  }

  fields.push(current.trim());
  return fields;
}


function parseDataset(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length < 2) {
    throw new Error(
      "Please provide a header and at least one observation."
    );
  }

  const firstLine = lines[0];

  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ",";

  if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = "\t";
  } else if (semicolonCount > commaCount) {
    delimiter = ";";
  }

  const headers = parseCSVLine(lines[0], delimiter);

  if (headers.length !== 2 || !headers[0] || !headers[1]) {
    throw new Error(
      "The first line must contain exactly two column names."
    );
  }

  const observations = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i], delimiter);

    if (fields.length !== 2) {
      throw new Error(
        "Line " + (i + 1) +
        " must contain exactly two values. Check the delimiter."
      );
    }

    if (!fields[0] || !fields[1]) {
      throw new Error(
        "Line " + (i + 1) +
        " contains an empty value. Each observation needs two categories."
      );
    }

    observations.push([fields[0], fields[1]]);
  }

  return {
    xName: headers[0],
    fName: headers[1],
    observations
  };
}


function buildContingency(data) {
  const xCategories = [...new Set(
    data.observations.map(row => row[0])
  )];

  const fCategories = [...new Set(
    data.observations.map(row => row[1])
  )];

  const rowTotals = new Array(xCategories.length).fill(0);
  const columnTotals = new Array(fCategories.length).fill(0);

  const counts = Array.from(
    { length: xCategories.length },
    () => new Array(fCategories.length).fill(0)
  );

  const xIndex = new Map(
    xCategories.map((value, index) => [value, index])
  );

  const fIndex = new Map(
    fCategories.map((value, index) => [value, index])
  );

  for (const [xValue, fValue] of data.observations) {
    const i = xIndex.get(xValue);
    const j = fIndex.get(fValue);

    counts[i][j]++;
    rowTotals[i]++;
    columnTotals[j]++;
  }

  return {
    xCategories,
    fCategories,
    counts,
    rowTotals,
    columnTotals,
    total: data.observations.length
  };
}


function calculateExpected(table) {
  const expected = table.counts.map((row, i) =>
    row.map((_, j) =>
      (table.rowTotals[i] * table.columnTotals[j]) / table.total
    )
  );

  return expected;
}


function calculateChiSquare(observed, expected) {
  let statistic = 0;
  const contributions = [];

  for (let i = 0; i < observed.length; i++) {
    const row = [];

    for (let j = 0; j < observed[i].length; j++) {
      const difference = observed[i][j] - expected[i][j];
      const contribution = (difference * difference) / expected[i][j];

      row.push(contribution);
      statistic += contribution;
    }

    contributions.push(row);
  }

  return {
    statistic,
    contributions
  };
}


function renderObservedTable(table, xName, fName) {
  const headers = table.fCategories.map(category =>
    `<th>${escapeHTML(category)}</th>`
  ).join("");

  const body = table.xCategories.map((category, i) => {
    const cells = table.counts[i].map(value =>
      `<td>${value}</td>`
    ).join("");

    return `
      <tr>
        <th>${escapeHTML(category)}</th>
        ${cells}
        <td class="total-cell">${table.rowTotals[i]}</td>
      </tr>
    `;
  }).join("");

  $("observedTable").innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>${escapeHTML(xName)} \\ ${escapeHTML(fName)}</th>
          ${headers}
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${body}
        <tr>
          <th>Total</th>
          ${table.columnTotals.map(value =>
            `<td class="total-cell">${value}</td>`
          ).join("")}
          <td class="total-cell">${table.total}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function renderMarginalTables(table) {
  const xRows = table.xCategories.map((category, i) => `
    <tr>
      <td>${escapeHTML(category)}</td>
      <td>${table.rowTotals[i]}</td>
      <td>${formatPercent(table.rowTotals[i] / table.total)}</td>
    </tr>
  `).join("");

  const fRows = table.fCategories.map((category, j) => `
    <tr>
      <td>${escapeHTML(category)}</td>
      <td>${table.columnTotals[j]}</td>
      <td>${formatPercent(table.columnTotals[j] / table.total)}</td>
    </tr>
  `).join("");

  $("marginalTables").innerHTML = `
    <div class="marginal-block">
      <h5>${escapeHTML("Variable X")}</h5>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr><th>Category</th><th>Count</th><th>Relative frequency</th></tr>
          </thead>
          <tbody>${xRows}</tbody>
        </table>
      </div>
    </div>

    <div class="marginal-block">
      <h5>${escapeHTML("Variable F")}</h5>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr><th>Category</th><th>Count</th><th>Relative frequency</th></tr>
          </thead>
          <tbody>${fRows}</tbody>
        </table>
      </div>
    </div>
  `;
}


function renderConditionalTables(table, xName, fName) {
  const fHeaders = table.fCategories.map(category =>
    `<th>${escapeHTML(category)}</th>`
  ).join("");

  const rowConditional = table.xCategories.map((category, i) => {
    const cells = table.counts[i].map(value =>
      `<td>${formatPercent(value / table.rowTotals[i])}</td>`
    ).join("");

    return `
      <tr>
        <th>${escapeHTML(category)}</th>
        ${cells}
      </tr>
    `;
  }).join("");

  const xHeaders = table.xCategories.map(category =>
    `<th>${escapeHTML(category)}</th>`
  ).join("");

  const columnConditional = table.fCategories.map((category, j) => {
    const cells = table.xCategories.map((_, i) =>
      `<td>${formatPercent(table.counts[i][j] / table.columnTotals[j])}</td>`
    ).join("");

    return `
      <tr>
        <th>${escapeHTML(category)}</th>
        ${cells}
      </tr>
    `;
  }).join("");

  $("conditionalTable").innerHTML = `
    <div class="marginal-block">
      <h5>P(${escapeHTML(fName)} | ${escapeHTML(xName)}) — Row percentages</h5>
      <table class="data-table">
        <thead>
          <tr>
            <th>${escapeHTML(xName)}</th>
            ${fHeaders}
          </tr>
        </thead>
        <tbody>${rowConditional}</tbody>
      </table>
    </div>

    <div class="marginal-block">
      <h5>P(${escapeHTML(xName)} | ${escapeHTML(fName)}) — Column percentages</h5>
      <table class="data-table">
        <thead>
          <tr>
            <th>${escapeHTML(fName)}</th>
            ${xHeaders}
          </tr>
        </thead>
        <tbody>${columnConditional}</tbody>
      </table>
    </div>
  `;
}

function renderExpectedTable(table, expected) {
  const headers = table.fCategories.map(category =>
    `<th>${escapeHTML(category)}</th>`
  ).join("");

  const body = table.xCategories.map((category, i) => {
    const cells = expected[i].map(value =>
      `<td>${formatNumber(value, 2)}</td>`
    ).join("");

    return `
      <tr>
        <th>${escapeHTML(category)}</th>
        ${cells}
        <td class="total-cell">${formatNumber(table.rowTotals[i], 2)}</td>
      </tr>
    `;
  }).join("");

  $("expectedTable").innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Expected counts</th>
          ${headers}
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${body}
        <tr>
          <th>Total</th>
          ${table.columnTotals.map(value =>
            `<td class="total-cell">${formatNumber(value, 2)}</td>`
          ).join("")}
          <td class="total-cell">${table.total}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function renderContributionTable(table, contributions) {
  const headers = table.fCategories.map(category =>
    `<th>${escapeHTML(category)}</th>`
  ).join("");

  const body = table.xCategories.map((category, i) => {
    const cells = contributions[i].map(value =>
      `<td>${formatNumber(value, 4)}</td>`
    ).join("");

    return `
      <tr>
        <th>${escapeHTML(category)}</th>
        ${cells}
      </tr>
    `;
  }).join("");

  $("contributionTable").innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Cell contribution</th>
          ${headers}
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}


function getCriticalValue(df) {
  if (criticalValues[df] !== undefined) {
    return criticalValues[df];
  }

  const knownDegrees = Object.keys(criticalValues)
    .map(Number)
    .sort((a, b) => a - b);

  const lower = knownDegrees.filter(value => value < df).pop();
  const upper = knownDegrees.find(value => value > df);

  if (lower === undefined || upper === undefined) {
    return null;
  }

  const lowerValue = criticalValues[lower];
  const upperValue = criticalValues[upper];

  return lowerValue +
    ((df - lower) / (upper - lower)) * (upperValue - lowerValue);
}

function assessExpectedCounts(expected) {
  const allValues = expected.flat();
  const belowFive = allValues.filter(value => value < 5).length;
  const belowOne = allValues.filter(value => value < 1).length;
  const proportionBelowFive = belowFive / allValues.length;

  return {
    belowFive,
    belowOne,
    proportionBelowFive,
    reliable: belowOne === 0 && proportionBelowFive <= 0.20
  };
}

function renderDecision(statistic, df, critical, expectedCheck) {
  const panel = $("decisionPanel");
  const title = $("decisionTitle");
  const text = $("decisionText");

  panel.classList.remove("reject", "retain");

  if (critical === null) {
    title.textContent = "Critical value not available";
    text.textContent =
      "The degrees of freedom are outside the range of the available critical-value table. " +
      "The Chi-square statistic has still been calculated, but an automatic decision at the 5% level is not provided.";
    return;
  }

  const reject = statistic > critical;

  if (reject) {
    panel.classList.add("reject");
    title.textContent = "Reject the null hypothesis of independence";

    text.textContent =
      "The calculated Chi-square statistic (" + formatNumber(statistic, 4) +
      ") is greater than the critical value (" + formatNumber(critical, 3) +
      ") for " + df + " degree(s) of freedom at α = 0.05. " +
      "There is sufficient statistical evidence to suggest an association between the two variables.";
  } else {
    panel.classList.add("retain");
    title.textContent = "Do not reject the null hypothesis of independence";

    text.textContent =
      "The calculated Chi-square statistic (" + formatNumber(statistic, 4) +
      ") does not exceed the critical value (" + formatNumber(critical, 3) +
      ") for " + df + " degree(s) of freedom at α = 0.05. " +
      "The sample does not provide sufficient evidence of an association. " +
      "This does not prove that the variables are independent.";
  }

  if (!expectedCheck.reliable) {
    text.textContent +=
      " However, some expected frequencies are small, so the usual Chi-square approximation may not be reliable.";
  }
}

function renderExpectedWarning(check) {
  const warning = $("expectedWarning");

  if (check.reliable) {
    warning.hidden = true;
    warning.textContent = "";
    return;
  }

  warning.hidden = false;

  warning.textContent =
    "Expected-frequency warning: " + check.belowFive +
    " of " + (check.belowFive === 1 ? "cell has" : "cells have") +
    " an expected count below 5, and " + check.belowOne +
    " cell(s) have an expected count below 1. " +
    "The common guideline is that no expected count should be below 1 " +
    "and no more than 20% should be below 5. " +
    "The Chi-square approximation should therefore be interpreted cautiously.";
}


function analyzeDataset() {
  const errorBox = $("errorMessage");
  const results = $("results");

  errorBox.hidden = true;
  errorBox.textContent = "";

  try {
    const data = parseDataset($("datasetInput").value);
    const table = buildContingency(data);

    if (table.xCategories.length < 2 || table.fCategories.length < 2) {
      throw new Error(
        "The Chi-square test requires at least two observed categories in each variable."
      );
    }

    const expected = calculateExpected(table);
    const chi = calculateChiSquare(table.counts, expected);

    const rows = table.xCategories.length;
    const columns = table.fCategories.length;
    const df = (rows - 1) * (columns - 1);

    const critical = getCriticalValue(df);
    const expectedCheck = assessExpectedCounts(expected);

    $("datasetTitle").textContent =
      data.xName + " vs " + data.fName;

    $("sampleCount").textContent = "N = " + table.total;
    $("variableX").textContent = data.xName;
    $("variableF").textContent = data.fName;
    $("totalObservations").textContent = table.total;

    $("chiSquareValue").textContent = formatNumber(chi.statistic, 4);
    $("degreesFreedom").textContent =
      "Degrees of freedom: " + df;

    $("criticalValue").textContent =
      critical === null ? "Not available" : formatNumber(critical, 3);

    renderObservedTable(table, data.xName, data.fName);
    renderMarginalTables(table);
    renderConditionalTables(table, data.xName, data.fName);
    renderExpectedTable(table, expected);
    renderContributionTable(table, chi.contributions);

    renderDecision(chi.statistic, df, critical, expectedCheck);
    renderExpectedWarning(expectedCheck);

    results.hidden = false;

    $("inputStatus").textContent =
      table.total + " observations successfully analyzed";

    results.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    results.hidden = true;
    errorBox.hidden = false;
    errorBox.textContent = error.message;
    $("inputStatus").textContent = "Please check the dataset";
  }
}


function selectPreset(buttonId) {
  $("studyPreset").classList.remove("active");
  $("devicePreset").classList.remove("active");
  $(buttonId).classList.add("active");
}

function loadStudyPreset() {
  $("datasetInput").value = studyDataset;
  selectPreset("studyPreset");
  $("inputStatus").textContent = "Study example loaded";
  analyzeDataset();
}

function loadDevicePreset() {
  $("datasetInput").value = deviceDataset;
  selectPreset("devicePreset");
  $("inputStatus").textContent = "Device example loaded";
  analyzeDataset();
}


function initialize() {
  $("studyPreset").addEventListener("click", loadStudyPreset);
  $("devicePreset").addEventListener("click", loadDevicePreset);
  $("analyzeButton").addEventListener("click", analyzeDataset);

  $("datasetInput").value = studyDataset;

  analyzeDataset();
}

document.addEventListener("DOMContentLoaded", initialize);
