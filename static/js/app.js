/**
 * Dashboard ZAN - Application principale
 * Gère les interactions, les appels API et les mises à jour
 */

// État de l'application
const state = {
    perimetre: 'scot',
    currentTab: 'evolution',
    loading: false,
    cache: {}
};

// Éléments DOM
const elements = {
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('sidebarOverlay'),
    menuToggle: document.getElementById('menuToggle'),
    mobilePerimetre: document.getElementById('mobilePerimetre'),
    perimetreLabel: document.getElementById('perimetreLabel'),
    nbCommunes: document.getElementById('nbCommunes'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanels: document.querySelectorAll('.tab-panel'),
    perimetreRadios: document.querySelectorAll('input[name="perimetre"]')
};

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadData();
});

function initEventListeners() {
    // Menu mobile
    elements.menuToggle?.addEventListener('click', toggleSidebar);
    elements.overlay?.addEventListener('click', closeSidebar);
    
    // Changement de périmètre
    elements.perimetreRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.perimetre = e.target.value;
            updateMobilePerimetre();
            loadData();
            closeSidebar();
        });
    });
    
    // Navigation par onglets
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Resize pour re-render les graphiques
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            Plotly.Plots.resize(document.getElementById('chartEvolution'));
            Plotly.Plots.resize(document.getElementById('chartRepartition'));
            Plotly.Plots.resize(document.getElementById('chartTop10'));
            Plotly.Plots.resize(document.getElementById('chartTypologie'));
        }, 250);
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
// NAVIGATION ONGLETS
// ============================================

function switchTab(tabId) {
    state.currentTab = tabId;
    
    // Mettre à jour les boutons
    elements.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    // Mettre à jour les panneaux
    elements.tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });
    
    // Re-render le graphique actif (pour responsive)
    setTimeout(() => {
        const chartId = {
            'evolution': 'chartEvolution',
            'repartition': 'chartRepartition',
            'top10': 'chartTop10',
            'typologie': 'chartTypologie'
        }[tabId];
        
        if (chartId) {
            Plotly.Plots.resize(document.getElementById(chartId));
        }
    }, 100);
}

// ============================================
// CHARGEMENT DES DONNÉES
// ============================================

async function loadData() {
    state.loading = true;
    
    try {
        // Charger les métriques
        await loadMetrics();
        
        // Charger les données des graphiques
        await Promise.all([
            loadEvolutionData(),
            loadRepartitionData(),
            loadTop10Data(),
            loadTypologieData()
        ]);
        
    } catch (error) {
        console.error('Erreur chargement données:', error);
    } finally {
        state.loading = false;
    }
}

async function fetchAPI(endpoint) {
    const cacheKey = `${endpoint}?perimetre=${state.perimetre}`;
    
    // Vérifier le cache
    if (state.cache[cacheKey]) {
        return state.cache[cacheKey];
    }
    
    const response = await fetch(`/api/${endpoint}?perimetre=${state.perimetre}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    state.cache[cacheKey] = data;
    
    return data;
}

// ============================================
// MISE À JOUR DES KPIs
// ============================================

async function loadMetrics() {
    const data = await fetchAPI('metrics');
    
    // Mettre à jour le header
    elements.perimetreLabel.textContent = data.perimetre;
    elements.nbCommunes.textContent = `${data.nb_communes} communes`;
    
    // Mettre à jour les KPIs
    updateKPI('kpiArtifTotal', formatNumber(data.artif_total_ha, 0));
    updateKPI('kpiPopulation', formatNumber(data.population, 0));
    updateKPI('kpiEvolutionPop', formatNumber(data.evolution_pop, 0, true));
    updateKPI('kpiConsoHab', formatNumber(data.conso_par_hab, 0));
    updateKPI('kpiEnveloppe', formatNumber(data.enveloppe_zan, 0));
    updateKPI('kpiReste', formatNumber(data.reste_disponible, 0));
    updateKPI('kpiTaux', formatNumber(data.taux_enveloppe, 0));
    
    // Statut trajectoire
    const taux = data.taux_enveloppe;
    let statut, color;
    
    if (taux < 30) {
        statut = 'CONFORME';
        color = 'green';
    } else if (taux < 50) {
        statut = 'VIGILANCE';
        color = 'orange';
    } else {
        statut = 'ALERTE';
        color = 'red';
    }
    
    updateKPI('kpiStatut', statut);
    document.getElementById('kpiStatutCard').dataset.color = color;
}

function updateKPI(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatNumber(num, decimals = 0, showSign = false) {
    if (num === undefined || num === null) return '--';
    
    const formatted = Math.abs(num).toLocaleString('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
    
    if (showSign && num > 0) return '+' + formatted;
    if (num < 0) return '-' + formatted;
    return formatted;
}

// ============================================
// CHARGEMENT DES GRAPHIQUES
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

// ============================================
// UTILITAIRES
// ============================================

// Invalider le cache lors du changement de périmètre
function invalidateCache() {
    state.cache = {};
}

// Observer pour invalidation du cache
const originalSetPerimetre = state.perimetre;
Object.defineProperty(state, 'perimetre', {
    get() { return this._perimetre || 'scot'; },
    set(value) {
        if (this._perimetre !== value) {
            this._perimetre = value;
            invalidateCache();
        }
    }
});

