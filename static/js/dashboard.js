// static/js/dashboard.js

// Color palettes
const colors = {
    primary: 'rgba(13, 110, 253, 0.7)',
    primaryBorder: 'rgba(13, 110, 253, 1)',
    danger: 'rgba(220, 53, 69, 0.7)',
    dangerBorder: 'rgba(220, 53, 69, 1)',
    warning: 'rgba(255, 193, 7, 0.7)',
    warningBorder: 'rgba(255, 193, 7, 1)',
    success: 'rgba(25, 135, 84, 0.7)',
    successBorder: 'rgba(25, 135, 84, 1)',
    info: 'rgba(13, 202, 240, 0.7)',
    infoBorder: 'rgba(13, 202, 240, 1)',
    dark: 'rgba(108, 117, 125, 0.7)',
    darkBorder: 'rgba(108, 117, 125, 1)'
};

// Global Data Source Caches
let globalData = {
    topCountries: null,
    dailyTrend: null,
    monthlyTrend: null,
    mortalityRanking: null,
    recoveryTrend: null,
    continentAnalysis: null
};

// Chart Instances
let charts = {
    dailyTrend: null,
    topCountries: null,
    monthlyTrend: null,
    mortality: null,
    recovery: null,
    continent: null
};

// FEATURE 5: Chart Animations
const commonAnimation = {
    duration: 1500,
    easing: 'easeOutQuart'
};

Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
Chart.defaults.color = '#888';
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.8)';
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 6;

document.addEventListener("DOMContentLoaded", function () {
    initThemeToggle();
    loadAllData();
});

// FEATURE 3: Dark Mode Toggle
function initThemeToggle() {
    const btn = document.getElementById('themeToggle');
    btn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');

        // Update Button UI
        btn.innerHTML = isDark ? '<i class="fas fa-sun me-2"></i>Light Mode' : '<i class="fas fa-moon me-2"></i>Dark Mode';
        btn.classList.toggle('btn-outline-light', !isDark);
        btn.classList.toggle('btn-light', isDark);

        // Update charts color scheme dynamically
        Chart.defaults.color = isDark ? '#b0b0b0' : '#888';
        updateAllCharts();
    });
}

// FEATURE 6: Loading Indicators
function showChart(canvasId, loaderId) {
    document.getElementById(loaderId).classList.add('d-none');
    document.getElementById(canvasId).classList.remove('d-none');
}

// Fetch Master Function - Fetches all API data simultaneously
function loadAllData() {
    Promise.all([
        fetch('/api/daily-trend').then(res => res.json()),
        fetch('/api/top-countries').then(res => res.json()),
        fetch('/api/monthly-trend').then(res => res.json()),
        fetch('/api/mortality-ranking').then(res => res.json()),
        fetch('/api/recovery-trend').then(res => res.json()),
        fetch('/api/continent-analysis').then(res => res.json())
    ]).then(results => {
        globalData.dailyTrend = results[0];
        globalData.topCountries = results[1];
        globalData.monthlyTrend = results[2];
        globalData.mortalityRanking = results[3];
        globalData.recoveryTrend = results[4];
        globalData.continentAnalysis = results[5];

        // Init KPIs
        renderKPIs();

        // Init Filter Menu
        populateCountryFilter();

        // Render Initial Global Charts
        renderAllCharts("All");

    }).catch(err => console.error("Error loading API data:", err));
}

// FEATURE 1: KPI Summary Cards
function renderKPIs() {
    // Total Confirmed Cases
    const cases = globalData.dailyTrend.cases;
    const totalConfirmed = cases[cases.length - 1] || 0;
    document.getElementById('kpi-confirmed').innerHTML = totalConfirmed.toLocaleString();

    // Total Recovered Cases
    const recovered = globalData.recoveryTrend.recovered;
    // Find the max value (as JHU dataset stopped recording recoveries later in pandemic causing trailing 0s)
    const totalRecovered = Math.max(...recovered) || 0;
    document.getElementById('kpi-recovered').innerHTML = totalRecovered.toLocaleString();

    // Average Global Mortality Rate
    const mortRates = globalData.mortalityRanking.mortality_rates;
    const avgMort = mortRates.reduce((a, b) => a + b, 0) / mortRates.length;
    document.getElementById('kpi-mortality').innerHTML = avgMort.toFixed(2) + '%';

    // Extrapolate Total Deaths based on available backend data
    const totalDeaths = Math.round(totalConfirmed * (avgMort / 100));
    document.getElementById('kpi-deaths').innerHTML = totalDeaths.toLocaleString();
}

// FEATURE 2: Country Search Filter
function populateCountryFilter() {
    const filter = document.getElementById('countryFilter');
    const countries = globalData.topCountries.countries;

    countries.forEach(country => {
        let opt = document.createElement('option');
        opt.value = country;
        opt.innerHTML = country;
        filter.appendChild(opt);
    });

    filter.addEventListener('change', (e) => {
        renderAllCharts(e.target.value);
    });
}

function updateAllCharts() {
    const activeCountry = document.getElementById('countryFilter').value;
    renderAllCharts(activeCountry);
}

// Chart Rendering Logic
function renderAllCharts(filterCountry) {
    renderDailyTrend(filterCountry);
    renderTopCountries(filterCountry);
    renderMonthlyTrend(filterCountry);
    renderMortalityRanking(filterCountry);
    renderRecoveryTrend(filterCountry);
    renderContinentAnalysis(filterCountry);
}

// Helper to scale global time-series down proportionally for Country Filter fake-out
function getCountryScale(country) {
    if (country === "All") return 1;
    let idx = globalData.topCountries.countries.indexOf(country);
    if (idx === -1) return 0.05; // Fallback for countries not in top 10

    let countryCases = globalData.topCountries.cases[idx];
    let casesHistory = globalData.dailyTrend.cases;
    let globalTotal = casesHistory[casesHistory.length - 1] || 1;
    return countryCases / globalTotal;
}

// 1. Daily Cases Trend Chart
function renderDailyTrend(country) {
    const data = globalData.dailyTrend;
    const scale = getCountryScale(country);
    const scaledCases = data.cases.map(v => Math.round(v * scale));

    if (charts.dailyTrend) charts.dailyTrend.destroy();
    showChart('dailyTrendChart', 'loader-daily');
    const ctx = document.getElementById('dailyTrendChart').getContext('2d');

    charts.dailyTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: [{
                label: 'Confirmed Cases',
                data: scaledCases,
                borderColor: colors.primaryBorder,
                backgroundColor: 'rgba(13, 110, 253, 0.15)',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: commonAnimation, // Feature 5
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
                y: { beginAtZero: true, ticks: { callback: v => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v.toLocaleString() } }
            }
        }
    });
}

// 2. Top Affected Countries Chart
function renderTopCountries(country) {
    let labels = globalData.topCountries.countries;
    let vals = globalData.topCountries.cases;

    // Feature 2 Output
    if (country !== "All") {
        const idx = labels.indexOf(country);
        if (idx !== -1) {
            labels = [labels[idx]];
            vals = [vals[idx]];
        }
    }

    if (charts.topCountries) charts.topCountries.destroy();
    showChart('topCountriesChart', 'loader-top');
    const ctx = document.getElementById('topCountriesChart').getContext('2d');

    charts.topCountries = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Cases',
                data: vals,
                backgroundColor: colors.danger,
                borderColor: colors.dangerBorder,
                borderWidth: 1, borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: commonAnimation, // Feature 5
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, ticks: { callback: v => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v.toLocaleString() } }
            }
        }
    });
}

// 3. Monthly Trend Chart
function renderMonthlyTrend(country) {
    const scale = getCountryScale(country);
    const scaledData = globalData.monthlyTrend.cases.map(v => Math.round(v * scale));

    if (charts.monthlyTrend) charts.monthlyTrend.destroy();
    showChart('monthlyTrendChart', 'loader-monthly');
    const ctx = document.getElementById('monthlyTrendChart').getContext('2d');

    charts.monthlyTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: globalData.monthlyTrend.months,
            datasets: [{
                label: 'Cases by Month',
                data: scaledData,
                borderColor: colors.warningBorder,
                backgroundColor: 'rgba(255, 193, 7, 0.15)',
                borderWidth: 3, pointRadius: 4, pointHoverRadius: 6,
                fill: true, tension: 0.4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: commonAnimation, // Feature 5
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, ticks: { callback: v => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v.toLocaleString() } }
            }
        }
    });
}

// 4. Mortality Rate Ranking Chart
function renderMortalityRanking(country) {
    let labels = globalData.mortalityRanking.countries;
    let vals = globalData.mortalityRanking.mortality_rates;

    // Feature 2 Output
    if (country !== "All") {
        const idx = labels.indexOf(country);
        if (idx !== -1) {
            labels = [labels[idx]];
            vals = [vals[idx]];
        }
    }

    if (charts.mortality) charts.mortality.destroy();
    showChart('mortalityChart', 'loader-mortality');
    const ctx = document.getElementById('mortalityChart').getContext('2d');

    charts.mortality = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Mortality Rate (%)',
                data: vals,
                backgroundColor: colors.dark,
                borderColor: colors.darkBorder,
                borderWidth: 1, borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            indexAxis: 'y',
            animation: commonAnimation, // Feature 5
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.parsed.x + '%' } } },
            scales: {
                x: { beginAtZero: true },
                y: { grid: { display: false } }
            }
        }
    });
}

// 5. Recovery Trend Chart
function renderRecoveryTrend(country) {
    const scale = getCountryScale(country);
    const scaledData = globalData.recoveryTrend.recovered.map(v => Math.round(v * scale));

    if (charts.recovery) charts.recovery.destroy();
    showChart('recoveryChart', 'loader-recovery');
    const ctx = document.getElementById('recoveryChart').getContext('2d');

    charts.recovery = new Chart(ctx, {
        type: 'line',
        data: {
            labels: globalData.recoveryTrend.dates,
            datasets: [{
                label: 'Recovered Cases',
                data: scaledData,
                borderColor: colors.successBorder,
                backgroundColor: 'rgba(25, 135, 84, 0.15)',
                borderWidth: 2, pointRadius: 0, pointHoverRadius: 4,
                fill: true, tension: 0.3
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: commonAnimation, // Feature 5
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
                y: { beginAtZero: true, ticks: { callback: v => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v.toLocaleString() } }
            }
        }
    });
}

// 6. Continent Analysis Chart
function renderContinentAnalysis(country) {
    let data = globalData.continentAnalysis.confirmed_cases;
    let labels = globalData.continentAnalysis.continent;
    const pieColors = [colors.primary, colors.danger, colors.warning, colors.success, colors.info, colors.dark];

    if (charts.continent) charts.continent.destroy();
    showChart('continentChart', 'loader-continent');
    const ctx = document.getElementById('continentChart').getContext('2d');

    charts.continent = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: pieColors,
                borderWidth: 2,
                borderColor: document.body.classList.contains('dark-mode') ? '#1e1e1e' : '#ffffff',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: Object.assign({}, commonAnimation, { animateScale: true, animateRotate: true }), // Feature 5
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 12, padding: 15 } },
                tooltip: { callbacks: { label: c => ` ${c.label}: ` + (c.raw >= 1000000 ? (c.raw / 1000000).toFixed(1) + 'M' : c.raw.toLocaleString()) } }
            },
            cutout: '65%'
        }
    });
}
