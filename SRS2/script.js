// Global state
let experiments = [];
let concentrationChart, resultsChart1, resultsChart2, resultsChart3;

// Initialize on load
document.addEventListener("DOMContentLoaded", function () {
  initCharts();
  setupEventListeners();
  updateCalculations();
});

// Mobile menu toggle
document.getElementById("mobileMenuBtn").addEventListener("click", function () {
  document.getElementById("navMenu").classList.toggle("hidden");
});

// Initialize charts
function initCharts() {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Время (мин)",
        },
      },
      y: {
        title: {
          display: true,
          text: "Концентрация (%)",
        },
        beginAtZero: true,
        max: 100,
      },
    },
  };

  // Concentration chart (real-time)
  const ctx1 = document.getElementById("concentrationChart").getContext("2d");
  concentrationChart = new Chart(ctx1, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "C(t)",
          data: [],
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: chartOptions,
  });

  // Results chart 1
  const ctx2 = document.getElementById("resultsChart1").getContext("2d");
  resultsChart1 = new Chart(ctx2, {
    type: "line",
    data: {
      labels: [],
      datasets: [],
    },
    options: chartOptions,
  });

  // Results chart 2 (bar)
  const ctx3 = document.getElementById("resultsChart2").getContext("2d");
  resultsChart2 = new Chart(ctx3, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Концентрация C(t)",
          data: [],
          backgroundColor: "rgba(59, 130, 246, 0.7)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Эксперимент",
          },
        },
        y: {
          title: {
            display: true,
            text: "Концентрация (%)",
          },
          beginAtZero: true,
          max: 100,
        },
      },
    },
  });

  // Results chart 3 (energy)
  const ctx4 = document.getElementById("resultsChart3").getContext("2d");
  resultsChart3 = new Chart(ctx4, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Энергозатраты E",
          data: [],
          backgroundColor: "rgba(147, 51, 234, 0.7)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Эксперимент",
          },
        },
        y: {
          title: {
            display: true,
            text: "Энергозатраты (усл.ед.)",
          },
          beginAtZero: true,
        },
      },
    },
  });
}

// Setup event listeners
function setupEventListeners() {
  // Sync sliders and inputs
  const pairs = [
    ["volume", "volumeInput", "volumeValue"],
    ["speed", "speedInput", "speedValue"],
    ["time", "timeInput", "timeValue"],
    ["c0", "c0Input", "c0Value"],
    ["cInf", "cInfInput", "cInfValue"],
  ];

  pairs.forEach(([slider, input, display]) => {
    document.getElementById(slider).addEventListener("input", function () {
      document.getElementById(input).value = this.value;
      document.getElementById(display).textContent = this.value;
      updateCalculations();
    });

    document.getElementById(input).addEventListener("input", function () {
      document.getElementById(slider).value = this.value;
      document.getElementById(display).textContent = this.value;
      updateCalculations();
    });
  });

  // Coefficient inputs
  ["a1", "a2"].forEach((id) => {
    document.getElementById(id).addEventListener("input", updateCalculations);
  });

  // Buttons
  document
    .getElementById("runExperiment")
    .addEventListener("click", runSingleExperiment);
  document
    .getElementById("runSeries")
    .addEventListener("click", runSeriesExperiments);
  document
    .getElementById("clearExperiments")
    .addEventListener("click", clearExperiments);
  document
    .getElementById("runOptimization")
    .addEventListener("click", runOptimization);
  document
    .getElementById("saveConclusion")
    .addEventListener("click", saveConclusion);

  // Navigation active state
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", function () {
      document
        .querySelectorAll(".nav-link")
        .forEach((l) => l.classList.remove("active"));
      this.classList.add("active");
    });
  });
}

// Validate inputs
function validateInputs() {
  const volume = parseFloat(document.getElementById("volume").value);
  const speed = parseFloat(document.getElementById("speed").value);
  const time = parseFloat(document.getElementById("time").value);
  const c0 = parseFloat(document.getElementById("c0").value);
  const cInf = parseFloat(document.getElementById("cInf").value);
  const a1 = parseFloat(document.getElementById("a1").value);
  const a2 = parseFloat(document.getElementById("a2").value);

  const errorDiv = document.getElementById("errorMsg");
  errorDiv.classList.add("hidden");

  if (volume <= 0) return showError("Объём должен быть положительным");
  if (speed < 100 || speed > 500)
    return showError("Скорость мешалки должна быть от 100 до 500 об/мин");
  if (time < 1 || time > 20)
    return showError("Время должно быть от 1 до 20 мин");
  if (c0 < 0 || c0 > 100)
    return showError("Начальная концентрация должна быть от 0 до 100%");
  if (cInf < 50 || cInf > 100)
    return showError("Равновесная концентрация должна быть от 50 до 100%");
  if (c0 >= cInf) return showError("C₀ должно быть меньше C∞");
  if (a1 <= 0 || a2 <= 0)
    return showError("Коэффициенты A₁ и A₂ должны быть положительными");

  return { volume, speed, time, c0, cInf, a1, a2 };
}

function showError(msg) {
  const errorDiv = document.getElementById("errorMsg");
  errorDiv.textContent = msg;
  errorDiv.classList.remove("hidden");
  return null;
}

// Calculate concentration
function calculateConcentration(c0, cInf, k, t) {
  return c0 * Math.exp(-k * t) + cInf * (1 - Math.exp(-k * t));
}

// Calculate derivative
function calculateDerivative(c0, cInf, k, t) {
  return (cInf - c0) * k * Math.exp(-k * t);
}

// Update calculations in real-time
function updateCalculations() {
  const params = validateInputs();
  if (!params) return;

  const { speed, time, c0, cInf, a1, a2 } = params;

  // Calculate k
  const k = a1 * speed + a2;

  // Calculate C(t)
  const ct = calculateConcentration(c0, cInf, k, time);

  // Calculate derivative
  const dcdt = calculateDerivative(c0, cInf, k, time);

  // Update display
  document.getElementById("kValue").textContent = k.toFixed(4);
  document.getElementById("ctValue").textContent = ct.toFixed(2);
  document.getElementById("dcdtValue").textContent = dcdt.toFixed(2);

  // Update chart
  updateConcentrationChart(c0, cInf, k, time);
}

// Update concentration chart
function updateConcentrationChart(c0, cInf, k, maxTime) {
  const labels = [];
  const data = [];

  for (let t = 0; t <= maxTime; t += 0.5) {
    labels.push(t.toFixed(1));
    data.push(calculateConcentration(c0, cInf, k, t));
  }

  concentrationChart.data.labels = labels;
  concentrationChart.data.datasets[0].data = data;
  concentrationChart.update();
}

// Run single experiment
function runSingleExperiment() {
  const params = validateInputs();
  if (!params) return;

  const { volume, speed, time, c0, cInf, a1, a2 } = params;
  const k = a1 * speed + a2;
  const ct = calculateConcentration(c0, cInf, k, time);
  const dcdt = calculateDerivative(c0, cInf, k, time);
  const energy = 0.001 * Math.pow(speed, 2) * time;

  experiments.push({
    id: experiments.length + 1,
    volume,
    speed,
    time,
    c0,
    cInf,
    k,
    ct,
    dcdt,
    energy,
  });

  updateExperimentsTable();
  updateResultsCharts();
  updateConclusions();
}

// Run series of 5 experiments
function runSeriesExperiments() {
  const baseParams = validateInputs();
  if (!baseParams) return;

  const speeds = [150, 250, 350, 400, 450];
  const times = [5, 8, 10, 12, 15];

  speeds.forEach((speed, i) => {
    const time = times[i];
    const { volume, c0, cInf, a1, a2 } = baseParams;
    const k = a1 * speed + a2;
    const ct = calculateConcentration(c0, cInf, k, time);
    const dcdt = calculateDerivative(c0, cInf, k, time);
    const energy = 0.001 * Math.pow(speed, 2) * time;

    experiments.push({
      id: experiments.length + 1,
      volume,
      speed,
      time,
      c0,
      cInf,
      k,
      ct,
      dcdt,
      energy,
    });
  });

  updateExperimentsTable();
  updateResultsCharts();
  updateConclusions();
}

// Update experiments table
function updateExperimentsTable() {
  const tbody = document.getElementById("experimentsTable");

  if (experiments.length === 0) {
    tbody.innerHTML =
      '<tr class="text-gray-500"><td colspan="9" class="p-4 text-center">Нет данных. Проведите эксперимент.</td></tr>';
    return;
  }

  tbody.innerHTML = experiments
    .map(
      (exp) => `
                <tr class="hover:bg-blue-50">
                    <td class="p-3 border">${exp.id}</td>
                    <td class="p-3 border">${exp.volume}</td>
                    <td class="p-3 border">${exp.speed}</td>
                    <td class="p-3 border">${exp.time}</td>
                    <td class="p-3 border">${exp.c0}</td>
                    <td class="p-3 border">${exp.cInf}</td>
                    <td class="p-3 border">${exp.k.toFixed(4)}</td>
                    <td class="p-3 border font-bold">${exp.ct.toFixed(2)}</td>
                    <td class="p-3 border">${exp.dcdt.toFixed(2)}</td>
                </tr>
            `,
    )
    .join("");
}

// Clear experiments
function clearExperiments() {
  experiments = [];
  updateExperimentsTable();
  updateResultsCharts();
  document.getElementById("conclusions").innerHTML =
    "<p>Проведите вычислительные эксперименты для формирования выводов.</p>";
}

// Update results charts
function updateResultsCharts() {
  if (experiments.length === 0) return;

  // Chart 1: Multiple lines
  const colors = [
    "rgb(59, 130, 246)",
    "rgb(239, 68, 68)",
    "rgb(34, 197, 94)",
    "rgb(234, 179, 8)",
    "rgb(168, 85, 247)",
  ];
  const datasets = experiments.slice(0, 5).map((exp, i) => {
    const labels = [];
    const data = [];
    for (let t = 0; t <= exp.time; t += 0.5) {
      labels.push(t.toFixed(1));
      data.push(calculateConcentration(exp.c0, exp.cInf, exp.k, t));
    }
    return {
      label: `Эксп. ${exp.id} (n=${exp.speed})`,
      data: data,
      borderColor: colors[i % colors.length],
      backgroundColor: colors[i % colors.length]
        .replace("rgb", "rgba")
        .replace(")", ", 0.1)"),
      fill: false,
      tension: 0.4,
    };
  });

  resultsChart1.data.labels =
    datasets[0]?.data.map((_, i) => (i * 0.5).toFixed(1)) || [];
  resultsChart1.data.datasets = datasets;
  resultsChart1.update();

  // Chart 2: Bar chart of final concentrations
  resultsChart2.data.labels = experiments.map((e) => `#${e.id}`);
  resultsChart2.data.datasets[0].data = experiments.map((e) => e.ct);
  resultsChart2.update();

  // Chart 3: Energy costs
  resultsChart3.data.labels = experiments.map((e) => `#${e.id}`);
  resultsChart3.data.datasets[0].data = experiments.map((e) => e.energy);
  resultsChart3.update();
}

// Run optimization
function runOptimization() {
  const cMin = parseFloat(document.getElementById("cMin").value);
  const cMax = parseFloat(document.getElementById("cMax").value);
  const tMin = parseFloat(document.getElementById("tMin").value);
  const tMax = parseFloat(document.getElementById("tMax").value);
  const c0 = parseFloat(document.getElementById("optC0").value);
  const cInf = parseFloat(document.getElementById("optCInf").value);
  const a1 = parseFloat(document.getElementById("a1").value);
  const a2 = parseFloat(document.getElementById("a2").value);

  const errorDiv = document.getElementById("optError");
  errorDiv.classList.add("hidden");

  if (cMin >= cMax) return showOptError("C_min должно быть меньше C_max");
  if (tMin >= tMax) return showOptError("t_min должно быть меньше t_max");
  if (c0 >= cInf) return showOptError("C₀ должно быть меньше C∞");

  let bestResult = null;
  let minEnergy = Infinity;

  // Grid search
  for (let n = 100; n <= 500; n += 10) {
    for (let t = tMin; t <= tMax; t += 0.5) {
      const k = a1 * n + a2;
      const ct = calculateConcentration(c0, cInf, k, t);
      const energy = 0.001 * Math.pow(n, 2) * t;

      if (ct >= cMin && ct <= cMax && energy < minEnergy) {
        minEnergy = energy;
        bestResult = { n, t, ct, energy };
      }
    }
  }

  const resultsDiv = document.getElementById("optimizationResults");

  if (bestResult) {
    document.getElementById("optN").textContent = bestResult.n;
    document.getElementById("optT").textContent = bestResult.t.toFixed(1);
    document.getElementById("optC").textContent = bestResult.ct.toFixed(2);
    document.getElementById("optE").textContent = bestResult.energy.toFixed(2);
    resultsDiv.classList.remove("hidden");
  } else {
    showOptError(
      "Не найдено решение, удовлетворяющее ограничениям. Попробуйте расширить диапазоны.",
    );
    resultsDiv.classList.add("hidden");
  }
}

function showOptError(msg) {
  const errorDiv = document.getElementById("optError");
  errorDiv.textContent = msg;
  errorDiv.classList.remove("hidden");
}

// Update conclusions
function updateConclusions() {
  if (experiments.length === 0) return;

  const avgCt =
    experiments.reduce((sum, e) => sum + e.ct, 0) / experiments.length;
  const avgEnergy =
    experiments.reduce((sum, e) => sum + e.energy, 0) / experiments.length;
  const maxCt = Math.max(...experiments.map((e) => e.ct));
  const minCt = Math.min(...experiments.map((e) => e.ct));

  const conclusions = document.getElementById("conclusions");
  conclusions.innerHTML = `
                <p><strong>Анализ проведённых экспериментов:</strong></p>
                <ul class="list-disc list-inside space-y-2">
                    <li>Проведено ${experiments.length} вычислительных экспериментов</li>
                    <li>Средняя достигнутая концентрация: <strong>${avgCt.toFixed(2)}%</strong></li>
                    <li>Диапазон концентраций: от <strong>${minCt.toFixed(2)}%</strong> до <strong>${maxCt.toFixed(2)}%</strong></li>
                    <li>Средние энергозатраты: <strong>${avgEnergy.toFixed(2)}</strong> усл.ед.</li>
                    <li>Оптимальный режим по энергозатратам: <strong>Эксперимент #${experiments.indexOf(experiments.reduce((min, e) => (e.energy < min.energy ? e : min))) + 1}</strong></li>
                </ul>
                <p class="mt-4"><strong>Вывод:</strong> С увеличением скорости вращения мешалки возрастает коэффициент интенсивности смешивания k, что приводит к более быстрому достижению равновесной концентрации. Однако это также увеличивает энергозатраты пропорционально n². Необходимо находить баланс между качеством смешивания и энергопотреблением.</p>
            `;
}

// Save conclusion
function saveConclusion() {
  const text = document.getElementById("userConclusion").value;
  if (!text.trim()) return;

  document.getElementById("conclusionText").textContent = text;
  document.getElementById("savedConclusion").classList.remove("hidden");
}
