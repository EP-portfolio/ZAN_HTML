/**
 * Dashboard ZAN - Application principale
 * Gère les interactions, les appels API et les mises à jour
 */

const state = {
    perimetre: 'scot',
    currentTab: 'evolution',
    currentTab2: 'typologie2',
    loading: false,
    cache: {},
    communesData: [],
    sortColumn: 'total_ha',
    sortAsc: false
};

const elements = {
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('sidebarOverlay'),
    menuToggle: document.getElementById('menuToggle'),
    mobilePerimetre: document.getElementById('mobilePerimetre'),
    perimetreLabel: document.getElementById('perimetreLabel'),
    nbCommunes: document.getElementById('nbCommunes'),
    perimetreRadios: document.querySelectorAll('input[name="perimetre"]'),
    searchCommune: document.getElementById('searchCommune'),
    btnExport: document.getElementById('btnExport')
};

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadAllData();
});

function initEventListeners() {
    // Menu mobile
    elements.menuToggle?.addEventListener('click', toggleSidebar);
    elements.overlay?.addEventListener('click', closeSidebar);
    
    // Périmètre
    elements.perimetreRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.perimetre = e.target.value;
            state.cache = {};
            updateMobilePerimetre();
            loadAllData();
            closeSidebar();
        });
    });
    
    // Onglets section 1
    document.querySelectorAll('.charts-section:nth-of-type(1) .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab, 1));
    });
    
    // Onglets section 2
    document.querySelectorAll('.charts-section:nth-of-type(2) .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab, 2));
    });
    
    // Recherche tableau
    elements.searchCommune?.addEventListener('input', filterTable);
    
    // Export CSV
    elements.btnExport?.addEventListener('click', exportCSV);
    
    // Tri tableau
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => sortTable(th.dataset.sort));
    });
    
    // Resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCharts, 250);
    });
}

function resizeCharts() {
    ['chartTrajectory', 'chartEvolution', 'chartRepartition', 'chartTop10', 
     'chartTypologie', 'chartRisques', 'chartDensification', 'chartBenchmark'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.data) Plotly.Plots.resize(el);
    });
}

// ============================================
// SIDEBAR MOBILE
// ============================================

function toggleSidebar() {
    elements.sidebar.classList.toggle('active');
    elements.overlay.classList.toggle('active');
    elements.menuToggle.classList.toggle('active');
}

function closeSidebar() {
    elements.sidebar.classList.remove('active');
    elements.overlay.classList.remove('active');
    elements.menuToggle.classList.remove('active');
}

function updateMobilePerimetre() {
    const label = state.perimetre === 'scot' ? 'SCOT' : 'CCPDA';
    elements.mobilePerimetre.textContent = label;
}

// ============================================
// ONGLETS
// ============================================

function switchTab(tabId, section) {
    const sectionEl = document.querySelectorAll('.charts-section')[section - 1];
    if (!sectionEl) return;
    
    sectionEl.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    sectionEl.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });
    
    setTimeout(resizeCharts, 100);
}

// ============================================
// CHARGEMENT DES DONNÉES
// ============================================

async function loadAllData() {
    state.loading = true;
    
    try {
        await Promise.all([
            loadMetrics(),
            loadTrajectory(),
            loadEvolutionData(),
            loadRepartitionData(),
            loadTop10Data(),
            loadTypologieData(),
            loadRisquesData(),
            loadDensificationData(),
            loadBenchmarkData(),
            loadCommunesData()
        ]);
    } catch (error) {
        console.error('Erreur chargement:', error);
    } finally {
        state.loading = false;
    }
}

async function fetchAPI(endpoint) {
    const cacheKey = `${endpoint}?perimetre=${state.perimetre}`;
    if (state.cache[cacheKey]) return state.cache[cacheKey];
    
    const response = await fetch(`/api/${endpoint}?perimetre=${state.perimetre}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    state.cache[cacheKey] = data;
    return data;
}

// ============================================
// MÉTRIQUES ET TRAJECTOIRE
// ============================================

async function loadMetrics() {
    const data = await fetchAPI('metrics');
    
    elements.perimetreLabel.textContent = data.perimetre;
    elements.nbCommunes.textContent = `${data.nb_communes} communes`;
    
    updateKPI('kpiArtifTotal', formatNumber(data.artif_total_ha, 0));
    updateKPI('kpiPopulation', formatNumber(data.population, 0));
    updateKPI('kpiEvolutionPop', formatNumber(data.evolution_pop, 0, true));
    updateKPI('kpiConsoHab', formatNumber(data.conso_par_hab, 0));
    updateKPI('kpiEnveloppe', formatNumber(data.enveloppe_zan, 0));
    updateKPI('kpiReste', formatNumber(data.reste_disponible, 0));
    updateKPI('kpiTaux', formatNumber(data.taux_enveloppe, 0));
    
    // Info trajectory
    document.getElementById('infoConsoRef').textContent = `${data.conso_reference.toFixed(1)} ha`;
    document.getElementById('infoEnveloppe').textContent = `${data.enveloppe_zan.toFixed(1)} ha`;
    document.getElementById('infoConso2124').textContent = `${data.conso_2021_2024.toFixed(1)} ha`;
    document.getElementById('infoReste').textContent = `${data.reste_disponible.toFixed(1)} ha`;
    
    // Statut et jauge
    const taux = data.taux_enveloppe;
    let statut, color, statusText;
    
    if (taux < 30) {
        statut = 'CONFORME'; color = 'green'; statusText = 'Trajectoire maîtrisée';
    } else if (taux < 50) {
        statut = 'VIGILANCE'; color = 'orange'; statusText = 'Vigilance recommandée';
    } else {
        statut = 'ALERTE'; color = 'red'; statusText = 'Risque de dépassement';
    }
    
    updateKPI('kpiStatut', statut);
    document.getElementById('kpiStatutCard').dataset.color = color;
    
    // Jauge progression
    document.getElementById('progressValue').textContent = `${taux.toFixed(1)}%`;
    document.getElementById('progressValue').style.color = `var(--color-${color})`;
    document.getElementById('progressFill').style.width = `${Math.min(taux, 100)}%`;
    document.getElementById('progressFill').style.background = `var(--color-${color})`;
    document.getElementById('progressStatus').textContent = statusText;
}

async function loadTrajectory() {
    const data = await fetchAPI('trajectory');
    Charts.renderTrajectory('chartTrajectory', data);
}

function updateKPI(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatNumber(num, decimals = 0, showSign = false) {
    if (num === undefined || num === null) return '--';
    const formatted = Math.abs(num).toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (showSign && num > 0) return '+' + formatted;
    if (num < 0) return '-' + formatted;
    return formatted;
}

// ============================================
// GRAPHIQUES
// ============================================

async function loadEvolutionData() {
    const data = await fetchAPI('evolution');
    Charts.renderEvolution('chartEvolution', data);
}

async function loadRepartitionData() {
    const data = await fetchAPI('repartition');
    Charts.renderRepartition('chartRepartition', 'legendRepartition', data);
}

async function loadTop10Data() {
    const data = await fetchAPI('top-communes');
    Charts.renderTop10('chartTop10', data);
}

async function loadTypologieData() {
    const data = await fetchAPI('typologie');
    Charts.renderTypologie('chartTypologie', 'typologieCards', data);
}

async function loadRisquesData() {
    const data = await fetchAPI('risques');
    Charts.renderRisques('chartRisques', data);
}

async function loadDensificationData() {
    const data = await fetchAPI('densification');
    Charts.renderDensification('chartDensification', data);
}

async function loadBenchmarkData() {
    try {
        const response = await fetch('/api/benchmark');
        if (response.ok) {
            const data = await response.json();
            Charts.renderBenchmark('chartBenchmark', data);
        }
    } catch (e) {
        console.error('Benchmark error:', e);
    }
}

// ============================================
// TABLEAU DES COMMUNES
// ============================================

async function loadCommunesData() {
    const data = await fetchAPI('communes');
    state.communesData = data;
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('communesTableBody');
    if (!tbody) return;
    
    const searchTerm = elements.searchCommune?.value?.toLowerCase() || '';
    
    let filtered = state.communesData;
    if (searchTerm) {
        filtered = filtered.filter(d => d.commune.toLowerCase().includes(searchTerm));
    }
    
    // Tri
    filtered.sort((a, b) => {
        let valA = a[state.sortColumn];
        let valB = b[state.sortColumn];
        if (typeof valA === 'string') {
            return state.sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return state.sortAsc ? valA - valB : valB - valA;
    });
    
    tbody.innerHTML = filtered.map(d => `
        <tr>
            <td>${d.commune}</td>
            <td>${d.departement}</td>
            <td>${d.population.toLocaleString('fr-FR')}</td>
            <td>${d.total_ha.toFixed(2)}</td>
            <td>${d.habitat_ha.toFixed(2)}</td>
            <td>${d.activites_ha.toFixed(2)}</td>
        </tr>
    `).join('');
}

function filterTable() {
    renderTable();
}

function sortTable(column) {
    if (state.sortColumn === column) {
        state.sortAsc = !state.sortAsc;
    } else {
        state.sortColumn = column;
        state.sortAsc = true;
    }
    renderTable();
}

function exportCSV() {
    const headers = ['Commune', 'Département', 'Population', 'Total (ha)', 'Habitat (ha)', 'Activités (ha)'];
    const rows = state.communesData.map(d => [
        d.commune, d.departement, d.population, d.total_ha, d.habitat_ha, d.activites_ha
    ]);
    
    let csv = headers.join(';') + '\n';
    csv += rows.map(r => r.join(';')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `communes_${state.perimetre}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
