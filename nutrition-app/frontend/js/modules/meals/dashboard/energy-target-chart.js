import { getApiUrl } from "../../../config.js";
import { getSettings, saveSetting } from "../../settings.js";
import { MAINTENANCE_RESULT_EVENT, getDailyTargetKcal } from "./maintenance.js";

let activeRange = "daily";

export function initEnergyTargetChart() {
    document.getElementById("energyTargetDailyBtn")?.addEventListener("click", () => setRange("daily"));
    document.getElementById("energyTargetWeeklyBtn")?.addEventListener("click", () => setRange("weekly"));

    const confidenceToggle = document.getElementById("energyTargetConfidenceToggle");
    if (confidenceToggle) {
        confidenceToggle.checked = Boolean(getSettings().calorieConfidence);
        confidenceToggle.addEventListener("change", event => {
            saveSetting("calorieConfidence", event.target.checked);
            renderEnergyTargetChart();
        });
    }

    window.addEventListener(MAINTENANCE_RESULT_EVENT, renderEnergyTargetChart);

    updateRangeButtons();
    renderEnergyTargetChart();
}

function setRange(range) {
    if (range === activeRange) return;
    activeRange = range;
    updateRangeButtons();
    renderEnergyTargetChart();
}

function updateRangeButtons() {
    const dailyBtn = document.getElementById("energyTargetDailyBtn");
    const weeklyBtn = document.getElementById("energyTargetWeeklyBtn");
    dailyBtn?.classList.toggle("active", activeRange === "daily");
    weeklyBtn?.classList.toggle("active", activeRange === "weekly");
}

async function renderEnergyTargetChart() {
    const canvas = document.getElementById("energyTargetChart");
    if (!canvas) return;

    try {
        if (activeRange === "daily") {
            await renderDailyChart(canvas);
        } else {
            await renderWeeklyChart(canvas);
        }
    } catch (error) {
        console.warn("Unable to render energy target chart:", error);
    }
}

async function renderDailyChart(canvas) {
    const today = isoDate(new Date());
    const response = await fetch(`${getApiUrl()}/intake/?intake_date=${today}`);
    const entries = response.ok ? await response.json() : [];

    const sorted = [...entries].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const points = [{ x: 0, y: 0 }];
    let cumulative = 0;
    sorted.forEach(entry => {
        const hour = hourOfDay(entry.created_at);
        cumulative += Number(entry.calories || 0);
        points.push({ x: hour, y: cumulative });
    });
    points.push({ x: 24, y: cumulative });

    const targetKcal = getDailyTargetKcal();
    const targetLine = [{ x: 0, y: targetKcal }, { x: 24, y: targetKcal }];

    const datasets = [
        {
            label: "Consumed (cumulative)",
            data: points,
            stepped: true,
            borderColor: "#0d6efd",
            backgroundColor: "rgba(13, 110, 253, 0.15)",
            pointRadius: 3,
            order: 1
        },
        {
            label: "Target",
            data: targetLine,
            borderColor: "#adb5bd",
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            order: 2
        }
    ];

    addConfidenceBand(datasets, targetKcal, [{ x: 0 }, { x: 24 }]);

    buildChart(canvas, {
        type: "line",
        data: { datasets },
        options: {
            scales: {
                x: {
                    type: "linear",
                    min: 0,
                    max: 24,
                    ticks: { stepSize: 4 },
                    title: { display: true, text: "Hour of day" }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: "kcal" }
                }
            }
        }
    });
}

async function renderWeeklyChart(canvas) {
    const today = new Date();
    const start = addDays(today, -3);
    const end = addDays(today, 3);

    const response = await fetch(
        `${getApiUrl()}/intake/range?start_date=${isoDate(start)}&end_date=${isoDate(end)}`
    );
    const days = response.ok ? await response.json() : [];

    const todayIso = isoDate(today);
    const labels = days.map(day => formatDayLabel(day.intake_date));
    const consumed = days.map(day => (day.intake_date > todayIso ? null : day.total_calories));

    const targetKcal = getDailyTargetKcal();
    const targetLine = labels.map(() => targetKcal);

    const datasets = [
        {
            type: "bar",
            label: "Consumed",
            data: consumed,
            backgroundColor: "rgba(13, 110, 253, 0.75)",
            order: 2
        },
        {
            type: "line",
            label: "Target",
            data: targetLine,
            borderColor: "#adb5bd",
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            order: 1
        }
    ];

    addConfidenceBand(datasets, targetKcal, labels.map(() => null), true);

    buildChart(canvas, {
        type: "bar",
        data: { labels, datasets },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: "kcal" }
                }
            }
        }
    });
}

function addConfidenceBand(datasets, targetKcal, positions, byIndex = false) {
    const settings = getSettings();
    if (!settings.calorieConfidence) return;

    const width = Number(settings.confidenceIntervalKcal || 0);
    if (width <= 0) return;

    const lowerData = byIndex
        ? positions.map(() => targetKcal - width)
        : positions.map(pos => ({ x: pos.x, y: targetKcal - width }));
    const upperData = byIndex
        ? positions.map(() => targetKcal + width)
        : positions.map(pos => ({ x: pos.x, y: targetKcal + width }));

    datasets.push({
        type: datasets[0]?.type,
        label: "Confidence range (lower)",
        data: lowerData,
        borderColor: "transparent",
        pointRadius: 0,
        fill: false,
        order: 3
    });
    datasets.push({
        type: datasets[0]?.type,
        label: "Confidence range",
        data: upperData,
        borderColor: "transparent",
        backgroundColor: "rgba(13, 110, 253, 0.12)",
        pointRadius: 0,
        fill: "-1",
        order: 3
    });
}

function buildChart(canvas, config) {
    if (window.energyTargetChart instanceof Chart) {
        window.energyTargetChart.destroy();
    }

    window.energyTargetChart = new Chart(canvas.getContext("2d"), {
        ...config,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            ...config.options
        }
    });
}

function isoDate(date) {
    return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

function hourOfDay(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 0;
    return date.getHours() + date.getMinutes() / 60;
}

function formatDayLabel(intakeDate) {
    const date = new Date(`${intakeDate}T00:00:00`);
    return date.toLocaleDateString([], { weekday: "short", day: "numeric" });
}
