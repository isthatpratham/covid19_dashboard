// static/js/country_analytics.js

const themeColors = {
    primary: '#4f46e5',
    danger: '#ef4444',
    success: '#10b981',
    info: '#06b6d4',
    primaryGradient: 'rgba(79, 70, 229, 0.2)',
    dangerGradient: 'rgba(239, 68, 68, 0.2)',
    successGradient: 'rgba(16, 185, 129, 0.2)',
    infoGradient: 'rgba(6, 182, 212, 0.2)'
};

let chartInstances = {};
let countrySelector;
const isDark = () => document.body.classList.contains('dark-mode');

document.addEventListener("DOMContentLoaded", () => {
    initLayout();
    initTheme();
    initCountrySelector();
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

async function initCountrySelector() {
    try {
        const response = await fetch('/api/all-countries-list');
        const countries = await response.json();

        countrySelector = new TomSelect("#countrySelector", {
            options: countries.map(c => ({ value: c, text: c })),
            create: false,
            placeholder: "Search and select a country...",
            onChange: (value) => {
                if (value) loadCountryData(value);
            }
        });

    } catch (error) {
        console.error("Failed to load country list:", error);
    }
}

async function loadCountryData(country) {
    // Show charts, hide placeholder
    document.getElementById('chartsContainer').classList.remove('hidden');
    document.getElementById('selectionPlaceholder').classList.add('hidden');

    // Show loaders
    document.querySelectorAll('.loader-overlay').forEach(l => l.classList.remove('hidden'));

    try {
        const response = await fetch(`/api/country-data?country=${encodeURIComponent(country)}`);
        const data = await response.json();

        renderKPIs(data.kpis);
        renderCharts(data.trends);

    } catch (error) {
        console.error("Error loading country data:", error);
    } finally {
        document.querySelectorAll('.loader-overlay').forEach(l => l.classList.add('hidden'));
    }
}

function renderKPIs(kpis) {
    animateCounter('country-confirmed', kpis.total_cases);
    animateCounter('country-deaths', kpis.total_deaths);
    document.getElementById('country-recovery-rate').textContent = kpis.recovery_rate + '%';
    document.getElementById('country-mortality-rate').textContent = kpis.mortality_rate + '%';
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const duration = 1500;
    const startTime = performance.now();
    const step = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        el.textContent = Math.floor(progress * target).toLocaleString();
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString();
    };
    requestAnimationFrame(step);
}

function getCommonOptions() {
    const dark = isDark();
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
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
                ticks: { color: dark ? '#94a3b8' : '#64748b', maxRotation: 45, minRotation: 45 }
            },
            y: {
                grid: { color: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                ticks: {
                    color: dark ? '#94a3b8' : '#64748b',
                    callback: v => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v.toLocaleString()
                }
            }
        },
        animation: { duration: 1500, easing: 'easeOutQuart' }
    };
}

function renderCharts(trends) {
    const datasets = [
        { id: 'countryCasesChart', label: 'Cases', data: trends.cases, color: themeColors.primary, bg: themeColors.primaryGradient },
        { id: 'countryDeathsChart', label: 'Deaths', data: trends.deaths, color: themeColors.danger, bg: themeColors.dangerGradient },
        { id: 'countryRecoveryChart', label: 'Recoveries', data: trends.recovered, color: themeColors.success, bg: themeColors.successGradient },
        { id: 'countryGrowthChart', label: 'Daily Growth', data: trends.growth, color: themeColors.info, bg: themeColors.infoGradient }
    ];

    datasets.forEach(ds => {
        if (chartInstances[ds.id]) chartInstances[ds.id].destroy();

        chartInstances[ds.id] = new Chart(document.getElementById(ds.id), {
            type: 'line',
            data: {
                labels: trends.dates,
                datasets: [{
                    label: ds.label,
                    data: ds.data,
                    borderColor: ds.color,
                    backgroundColor: ds.bg,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0
                }]
            },
            options: getCommonOptions()
        });
    });
}
