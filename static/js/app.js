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
    sortAsc: false,
    filters: {
        departements: [],
        communes: [],
        typologies: []
    },
    filterOptions: {
        departements: [],
        communes: [],
        typologies: []
    }
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
    loadLastUpdate();
    loadFilterOptions();
    loadAllData();
});

function initEventListeners() {
    // Menu mobile
    elements.menuToggle?.addEventListener('click', toggleSidebar);
    elements.overlay?.addEventListener('click', closeSidebar);
    
    // Périmètre
    elements.perimetreRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newPerimetre = e.target.value;
            if (state.perimetre !== newPerimetre) {
                state.perimetre = newPerimetre;
                state.cache = {};
                state.filters = { departements: [], communes: [], typologies: [] };
                
                // Fermer tous les menus déroulants
                document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
                document.querySelectorAll('.dropdown-toggle.active').forEach(t => t.classList.remove('active'));
                
                updateMobilePerimetre();
                loadFilterOptions();
                loadAllData();
                closeSidebar();
            }
        });
    });
    
    // Filtres - Menus déroulants personnalisés
    initDropdown('dropdownDepartements', 'menuDepartements', 'optionsDepartements', 'searchDepartements', 'departements');
    initDropdown('dropdownCommunes', 'menuCommunes', 'optionsCommunes', 'searchCommunes', 'communes');
    initDropdown('dropdownTypologies', 'menuTypologies', 'optionsTypologies', 'searchTypologies', 'typologies');
    
    // Onglets - méthode plus robuste
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const tabId = btn.dataset.tab;
            if (!tabId) return;
            
            const section = btn.closest('.charts-section');
            if (section) {
                switchTabInSection(section, tabId);
            } else {
                console.warn('Section non trouvée pour l\'onglet:', tabId);
            }
        });
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

function switchTabInSection(sectionEl, tabId) {
    if (!sectionEl || !tabId) {
        console.warn('switchTabInSection: paramètres manquants', { sectionEl, tabId });
        return;
    }
    
    // Désactiver tous les onglets de cette section
    const allBtns = sectionEl.querySelectorAll('.tab-btn');
    allBtns.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activer l'onglet cliqué
    const activeBtn = sectionEl.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    } else {
        console.warn(`Onglet non trouvé: ${tabId} dans la section`);
        return;
    }
    
    // Masquer tous les panneaux de cette section
    const allPanels = sectionEl.querySelectorAll('.tab-panel');
    allPanels.forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Afficher le panneau correspondant
    const activePanel = sectionEl.querySelector(`#tab-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
        
        // Re-render le graphique si nécessaire
        setTimeout(() => {
            resizeCharts();
            // Charger les données (forcer le rechargement si les filtres ont changé)
            const chartContainer = activePanel.querySelector('.chart-container');
            if (chartContainer) {
                const chartId = chartContainer.id;
                const chartEl = document.getElementById(chartId);
                // Toujours recharger pour s'assurer que les filtres sont appliqués
                loadChartData(tabId, true);
            }
            
            // Pour la carte Top 10, vérifier si elle existe
            const mapContainer = activePanel.querySelector('#mapTop10');
            if (mapContainer && tabId === 'top10') {
                // Recharger la carte si nécessaire
                loadTop10Data();
            }
        }, 150);
    } else {
        console.warn(`Panneau non trouvé: #tab-${tabId}`);
    }
}

async function loadChartData(tabId, forceReload = false) {
    const chartEl = document.querySelector(`#tab-${tabId} .chart-container`);
    if (!chartEl) return;
    
    // Vérifier si le graphique existe déjà (sauf si on force le rechargement)
    if (!forceReload && chartEl.data && chartEl.data.length > 0) {
        return; // Déjà chargé
    }
    
    // Charger les données selon l'onglet
    try {
        switch(tabId) {
            case 'evolution':
                await loadEvolutionData();
                break;
            case 'repartition':
                await loadRepartitionData();
                break;
            case 'top10':
                await loadTop10Data();
                break;
            case 'typologie2':
                await loadTypologieData();
                break;
            case 'risques':
                await loadRisquesData();
                break;
            case 'densification':
                await loadDensificationData();
                break;
        }
    } catch (error) {
        console.error(`Erreur chargement graphique ${tabId}:`, error);
    }
}

// ============================================
// CHARGEMENT DES DONNÉES
// ============================================

async function loadAllData() {
    state.loading = true;
    
    try {
        // Charger les métriques et trajectoire en premier
        await loadMetrics();
        await loadTrajectory();
        
        // Charger TOUS les graphiques pour éviter les problèmes de cache
        await Promise.all([
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
    // Construire l'URL avec filtres
    const params = new URLSearchParams();
    params.append('perimetre', state.perimetre);
    
    if (state.filters.departements.length > 0) {
        state.filters.departements.forEach(d => params.append('departements', d));
    }
    if (state.filters.communes.length > 0) {
        state.filters.communes.forEach(c => params.append('communes', c));
    }
    if (state.filters.typologies.length > 0) {
        state.filters.typologies.forEach(t => params.append('typologies', t));
    }
    
    const cacheKey = `${endpoint}?${params.toString()}`;
    if (state.cache[cacheKey]) return state.cache[cacheKey];
    
    const response = await fetch(`/api/${endpoint}?${params.toString()}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    state.cache[cacheKey] = data;
    return data;
}

async function loadFilterOptions() {
    try {
        const params = new URLSearchParams();
        params.append('perimetre', state.perimetre);
        state.filters.departements.forEach(d => params.append('departements', d));
        
        const response = await fetch(`/api/filter-options?${params.toString()}`);
        if (response.ok) {
            const options = await response.json();
            state.filterOptions = options;
            updateFilterSelects();
        }
    } catch (error) {
        console.error('Erreur chargement options filtres:', error);
    }
}

// ============================================
// MENUS DÉROULANTS PERSONNALISÉS
// ============================================

function initDropdown(toggleId, menuId, optionsId, searchId, filterKey) {
    const toggle = document.getElementById(toggleId);
    const menu = document.getElementById(menuId);
    const optionsContainer = document.getElementById(optionsId);
    const searchInput = document.getElementById(searchId);
    
    if (!toggle || !menu || !optionsContainer) return;
    
    // Toggle menu
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.contains('show');
        
        // Fermer tous les autres menus
        document.querySelectorAll('.dropdown-menu.show').forEach(m => {
            if (m !== menu) m.classList.remove('show');
        });
        document.querySelectorAll('.dropdown-toggle.active').forEach(t => {
            if (t !== toggle) t.classList.remove('active');
        });
        
        // Toggle ce menu
        if (isOpen) {
            menu.classList.remove('show');
            toggle.classList.remove('active');
        } else {
            menu.classList.add('show');
            toggle.classList.add('active');
        }
    });
    
    // Recherche
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const options = optionsContainer.querySelectorAll('.dropdown-option');
            options.forEach(opt => {
                const text = opt.textContent.toLowerCase();
                opt.style.display = text.includes(query) ? 'flex' : 'none';
            });
        });
    }
    
    // Fermer au clic extérieur
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !toggle.contains(e.target)) {
            menu.classList.remove('show');
            toggle.classList.remove('active');
        }
    });
}

function updateFilterSelects() {
    updateDropdown('optionsDepartements', 'dropdownDepartements', state.filterOptions.departements, 'departements', 'Tous les départements');
    updateDropdown('optionsCommunes', 'dropdownCommunes', state.filterOptions.communes, 'communes', 'Toutes les communes');
    updateDropdown('optionsTypologies', 'dropdownTypologies', state.filterOptions.typologies, 'typologies', 'Toutes les typologies');
}

function updateDropdown(optionsId, toggleId, options, filterKey, defaultText) {
    const optionsContainer = document.getElementById(optionsId);
    const toggle = document.getElementById(toggleId);
    
    if (!optionsContainer || !toggle) return;
    
    // Filtrer les valeurs sélectionnées qui ne sont plus disponibles
    state.filters[filterKey] = state.filters[filterKey].filter(v => options.includes(v));
    
    // Créer les options avec option "Tout" en premier
    if (options.length === 0) {
        optionsContainer.innerHTML = '<div class="dropdown-option" style="color: var(--color-text-muted); cursor: default;">Aucune option disponible</div>';
    } else {
        // Option "Tout" pour réinitialiser les filtres
        const allSelected = state.filters[filterKey].length === 0;
        const allOptions = [
            `<div class="dropdown-option ${allSelected ? 'selected' : ''}" data-value="__ALL__" style="font-weight: bold; border-bottom: 1px solid var(--color-border); margin-bottom: 4px;">
                <input type="checkbox" id="check_${filterKey}_ALL" ${allSelected ? 'checked' : ''}>
                <label for="check_${filterKey}_ALL">Tout</label>
            </div>`
        ];
        
        // Ajouter les autres options
        allOptions.push(...options.map(opt => {
            const isSelected = state.filters[filterKey].includes(opt);
            const safeId = opt.replace(/[^a-zA-Z0-9]/g, '_');
            return `
                <div class="dropdown-option ${isSelected ? 'selected' : ''}" data-value="${opt}">
                    <input type="checkbox" id="check_${filterKey}_${safeId}" ${isSelected ? 'checked' : ''}>
                    <label for="check_${filterKey}_${safeId}">${opt}</label>
                </div>
            `;
        }));
        
        optionsContainer.innerHTML = allOptions.join('');
    }
    
    // Gérer les clics sur les options
    optionsContainer.querySelectorAll('.dropdown-option[data-value]').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkbox = option.querySelector('input[type="checkbox"]');
            const value = option.dataset.value;
            
            if (!value) return; // Ignorer les options sans valeur
            
            // Gérer l'option "Tout"
            if (value === '__ALL__') {
                if (checkbox.checked) {
                    // Désélectionner "Tout" = sélectionner toutes les options
                    state.filters[filterKey] = [...options];
                    // Mettre à jour toutes les checkboxes
                    optionsContainer.querySelectorAll('.dropdown-option[data-value]').forEach(opt => {
                        if (opt.dataset.value !== '__ALL__') {
                            const optCheckbox = opt.querySelector('input[type="checkbox"]');
                            optCheckbox.checked = true;
                            opt.classList.add('selected');
                        }
                    });
                } else {
                    // Sélectionner "Tout" = désélectionner toutes les options
                    state.filters[filterKey] = [];
                    // Mettre à jour toutes les checkboxes
                    optionsContainer.querySelectorAll('.dropdown-option[data-value]').forEach(opt => {
                        const optCheckbox = opt.querySelector('input[type="checkbox"]');
                        optCheckbox.checked = false;
                        opt.classList.remove('selected');
                    });
                    checkbox.checked = true; // "Tout" reste coché
                }
            } else {
                // Gestion normale d'une option
                checkbox.checked = !checkbox.checked;
                
                if (checkbox.checked) {
                    if (!state.filters[filterKey].includes(value)) {
                        state.filters[filterKey].push(value);
                    }
                    option.classList.add('selected');
                } else {
                    state.filters[filterKey] = state.filters[filterKey].filter(v => v !== value);
                    option.classList.remove('selected');
                }
                
                // Si une option spécifique est sélectionnée, décocher "Tout"
                const allOption = optionsContainer.querySelector('.dropdown-option[data-value="__ALL__"]');
                if (allOption) {
                    const allCheckbox = allOption.querySelector('input[type="checkbox"]');
                    allCheckbox.checked = state.filters[filterKey].length === 0;
                    if (state.filters[filterKey].length === 0) {
                        allOption.classList.add('selected');
                    } else {
                        allOption.classList.remove('selected');
                    }
                }
            }
            
            // Mettre à jour le texte du toggle
            updateToggleText(toggleId, filterKey, defaultText);
            
            // Si changement de départements, recharger les communes
            if (filterKey === 'departements') {
                reloadCommunesOptions();
            }
            
            // Appliquer les filtres
            applyFilters();
        });
    });
    
    // Mettre à jour le texte du toggle
    updateToggleText(toggleId, filterKey, defaultText);
}

function updateToggleText(toggleId, filterKey, defaultText) {
    const toggle = document.getElementById(toggleId);
    if (!toggle) return;
    
    const selected = state.filters[filterKey];
    const textSpan = toggle.querySelector('.dropdown-text');
    
    if (selected.length === 0) {
        textSpan.textContent = defaultText;
    } else if (selected.length === 1) {
        textSpan.textContent = selected[0];
    } else {
        textSpan.textContent = `${selected.length} sélectionné${selected.length > 1 ? 's' : ''}`;
    }
}

async function reloadCommunesOptions() {
    const params = new URLSearchParams();
    params.append('perimetre', state.perimetre);
    state.filters.departements.forEach(d => params.append('departements', d));
    
    try {
        const response = await fetch(`/api/filter-options?${params.toString()}`);
        if (response.ok) {
            const options = await response.json();
            state.filterOptions.communes = options.communes;
            
            // Réinitialiser la sélection de communes si elles ne sont plus disponibles
            state.filters.communes = state.filters.communes.filter(c => 
                options.communes.includes(c)
            );
            
            updateDropdown('optionsCommunes', 'dropdownCommunes', options.communes, 'communes', 'Toutes les communes');
        }
    } catch (error) {
        console.error('Erreur rechargement communes:', error);
    }
}

function applyFilters() {
    // Invalider le cache
    state.cache = {};
    
    // Réinitialiser les graphiques pour forcer le rechargement
    document.querySelectorAll('.chart-container').forEach(container => {
        // Supprimer les données Plotly pour forcer le rechargement
        if (container.data) {
            Plotly.purge(container);
        }
    });
    
    // Réinitialiser la carte
    if (window.top10Map) {
        try {
            window.top10Map.remove();
        } catch (e) {
            console.warn('Erreur suppression carte:', e);
        }
        window.top10Map = null;
    }
    
    // Recharger toutes les données
    loadAllData();
}

async function loadLastUpdate() {
    try {
        const response = await fetch('/api/last-update');
        if (response.ok) {
            const data = await response.json();
            document.getElementById('lastUpdate').textContent = data.last_update;
        }
    } catch (error) {
        console.error('Erreur chargement date:', error);
    }
    
    // Date de consultation
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    document.getElementById('consultDate').textContent = dateStr;
}

// ============================================
// MÉTRIQUES ET TRAJECTOIRE
// ============================================

async function loadMetrics() {
    const data = await fetchAPI('metrics');
    
    elements.perimetreLabel.textContent = data.perimetre;
    elements.nbCommunes.textContent = `${data.nb_communes_filtrees || data.nb_communes} communes`;
    
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
    
    // Résumé de sélection
    if (data.nb_communes_filtrees !== undefined) {
        document.getElementById('summaryNbCommunes').textContent = data.nb_communes_filtrees;
        document.getElementById('summaryPop').textContent = formatNumber(data.pop_filtree, 0);
        document.getElementById('summaryArtif').textContent = `${data.artif_filtree.toFixed(1)} ha`;
    }
    
    // Statut et jauge
    const taux = data.taux_enveloppe;
    let statut, color, statusText;
    
    if (taux < 30) {
        statut = 'CONFORME'; color = 'green'; statusText = 'Trajectoire maîtrisée';
    } else if (taux < 50) {
        statut = 'VIGILANCE'; color = 'orange'; statusText = 'Vigilance recommandée';
    } else {
        statut = 'ALERTE'; color = 'red'; statusText = 'Attention : risque de dépassement';
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
    // Charger la carte avec les pie charts
    await Charts.renderTop10Map('mapTop10', data);
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
