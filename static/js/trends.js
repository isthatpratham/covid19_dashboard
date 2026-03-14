// static/js/trends.js

const trendColors = {
    primary: '#4f46e5',
    danger: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#06b6d4',
    primaryGradient: 'rgba(79, 70, 229, 0.2)',
    warningGradient: 'rgba(245, 158, 11, 0.2)',
    infoGradient: 'rgba(6, 182, 212, 0.2)'
};

let chartInstances = {};
let raceData = [];
let currentMonthIndex = 0;
let raceInterval = null;

const isDark = () => document.body.classList.contains('dark-mode');

document.addEventListener("DOMContentLoaded", () => {
    initLayout();
    initTheme();
    loadTrendData();
});

function initLayout() {
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('collapseSidebar');
    if (collapseBtn) {
        collapseBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    }
}

function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const dark = isDark();
            localStorage.setItem('theme', dark ? 'dark' : 'light');
            themeToggle.innerHTML = dark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            refreshCharts();
        });
    }
}

function refreshCharts() {
    const dark = isDark();
    Object.values(chartInstances).forEach(chart => {
        if (chart.options.scales) {
            if (chart.options.scales.x) chart.options.scales.x.grid.color = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
            if (chart.options.scales.y) chart.options.scales.y.grid.color = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        }
        chart.update();
    });
}

function getCommonOptions() {
    const dark = isDark();
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
                labels: { color: dark ? '#94a3b8' : '#1e293b' }
            },
            tooltip: {
                backgroundColor: dark ? '#1e293b' : '#ffffff',
                titleColor: dark ? '#f1f5f9' : '#1e293b',
                bodyColor: dark ? '#94a3b8' : '#64748b',
                borderColor: dark ? '#334155' : '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8
            }
        },
        scales: {
            x: {
                grid: { color: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                ticks: { color: dark ? '#94a3b8' : '#64748b' }
            },
            y: {
                grid: { color: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                ticks: {
                    color: dark ? '#94a3b8' : '#64748b',
                    callback: v => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v.toLocaleString()
                }
            }
        }
    };
}

async function loadTrendData() {
    try {
        const [monthly, growth, ma, race] = await Promise.all([
            fetch('/api/monthly-trend').then(res => res.json()),
            fetch('/api/growth-rate').then(res => res.json()),
            fetch('/api/moving-average').then(res => res.json()),
            fetch('/api/bar-race').then(res => res.json())
        ]);

        renderMonthlyTrend(monthly);
        renderGrowthRate(growth);
        renderMovingAverage(ma);
        initRaceChart(race);

        hideLoaders();

    } catch (error) {
        console.error("Error loading trend data:", error);
    }
}

function renderMonthlyTrend(data) {
    chartInstances.monthly = new Chart(document.getElementById('monthlyTrendChart'), {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Global Cases',
                data: data.cases,
                backgroundColor: trendColors.primary,
                borderRadius: 6
            }]
        },
        options: getCommonOptions()
    });
}

function renderGrowthRate(data) {
    chartInstances.growth = new Chart(document.getElementById('growthRateChart'), {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Growth Rate (%)',
                data: data.growth_rate,
                borderColor: trendColors.warning,
                backgroundColor: trendColors.warningGradient,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            ...getCommonOptions(),
            scales: {
                ...getCommonOptions().scales,
                y: {
                    ...getCommonOptions().scales.y,
                    ticks: { callback: v => v.toFixed(1) + '%' }
                }
            }
        }
    });
}

function renderMovingAverage(data) {
    chartInstances.ma = new Chart(document.getElementById('movingAverageChart'), {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: '7-Day MA New Cases',
                    data: data.ma_cases,
                    borderColor: trendColors.primary,
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.3
                },
                {
                    label: '7-Day MA New Deaths',
                    data: data.ma_deaths,
                    borderColor: trendColors.danger,
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.3,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            ...getCommonOptions(),
            scales: {
                x: getCommonOptions().scales.x,
                y: {
                    ...getCommonOptions().scales.y,
                    title: { display: true, text: 'New Cases MA' }
                },
                y1: {
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: trendColors.danger },
                    title: { display: true, text: 'New Deaths MA' }
                }
            }
        }
    });
}

function initRaceChart(data) {
    raceData = data;
    const initial = data[0];

    chartInstances.race = new Chart(document.getElementById('barRaceChart'), {
        type: 'bar',
        data: {
            labels: initial.data.map(d => d.country),
            datasets: [{
                label: 'Total Cases',
                data: initial.data.map(d => d.value),
                backgroundColor: trendColors.danger,
                borderRadius: 4
            }]
        },
        options: {
            ...getCommonOptions(),
            indexAxis: 'y',
            animation: {
                duration: 500,
                easing: 'linear'
            }
        }
    });

    document.getElementById('racePlay').addEventListener('click', startRace);
    document.getElementById('racePause').addEventListener('click', stopRace);
    document.getElementById('raceRestart').addEventListener('click', restartRace);
}

function startRace() {
    if (raceInterval) return;
    document.getElementById('racePlay').disabled = true;
    document.getElementById('racePause').disabled = false;

    raceInterval = setInterval(() => {
        currentMonthIndex++;
        if (currentMonthIndex >= raceData.length) {
            stopRace();
            return;
        }
        updateRace(currentMonthIndex);
    }, 1000);
}

function stopRace() {
    clearInterval(raceInterval);
    raceInterval = null;
    document.getElementById('racePlay').disabled = false;
    document.getElementById('racePause').disabled = true;
}

function restartRace() {
    stopRace();
    currentMonthIndex = 0;
    updateRace(0);
}

function updateRace(index) {
    const item = raceData[index];
    document.getElementById('raceTimer').textContent = item.month;

    chartInstances.race.data.labels = item.data.map(d => d.country);
    chartInstances.race.data.datasets[0].data = item.data.map(d => d.value);
    chartInstances.race.update();
}

function hideLoaders() {
    document.querySelectorAll('.loader-overlay').forEach(l => l.style.display = 'none');
}
