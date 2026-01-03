/**
 * Dashboard ZAN - Graphiques Plotly.js
 * Tous les graphiques sont responsive avec autosize
 */

const PLOTLY_CONFIG = {
    responsive: true,
    displayModeBar: false,
    staticPlot: false
};

const COLORS = {
    blue: '#2E86AB',
    green: '#48BB78',
    orange: '#ED8936',
    purple: '#A23B72',
    red: '#F56565',
    gray: '#64748B',
    bgPrimary: '#0F172A',
    bgSecondary: '#1E293B',
    border: '#334155',
    textPrimary: '#FFFFFF',
    textSecondary: '#CBD5E0',
    textMuted: '#94A3B8'
};

function getBaseLayout() {
    return {
        autosize: true,
        margin: { l: 50, r: 30, t: 40, b: 50 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: COLORS.bgPrimary,
        font: {
            family: 'Inter, sans-serif',
            color: COLORS.textSecondary
        },
        xaxis: {
            gridcolor: COLORS.border,
            linecolor: COLORS.border,
            tickfont: { color: COLORS.textMuted }
        },
        yaxis: {
            gridcolor: COLORS.border,
            linecolor: COLORS.border,
            tickfont: { color: COLORS.textMuted }
        }
    };
}

/**
 * Graphique Trajectoire ZAN
 */
function renderTrajectoryChart(containerId, data) {
    // S'assurer que les années sont des nombres
    const annees_projection = data.annees_projection.map(a => typeof a === 'string' ? parseInt(a) : a);
    const annees_reelles = data.annees_reelles.map(a => typeof a === 'string' ? parseInt(a) : a);
    
    const traces = [
        {
            type: 'scatter',
            mode: 'lines',
            x: annees_projection,
            y: data.trajectoire_max,
            name: 'Enveloppe maximale',
            line: { color: COLORS.orange, width: 2, dash: 'dash' },
            fill: 'tozeroy',
            fillcolor: 'rgba(237, 137, 54, 0.1)'
        },
        {
            type: 'scatter',
            mode: 'lines+markers',
            x: annees_reelles,
            y: data.conso_reelle,
            name: 'Consommation réelle',
            line: { color: COLORS.blue, width: 3 },
            marker: { size: 10, color: COLORS.blue }
        }
    ];
    
    const layout = {
        ...getBaseLayout(),
        showlegend: true,
        legend: {
            x: 0.5, y: 1.1,
            xanchor: 'center',
            orientation: 'h',
            font: { size: 11, color: COLORS.textSecondary }
        },
        xaxis: {
            ...getBaseLayout().xaxis,
            title: { text: 'Année', font: { size: 12 } },
            type: 'linear',
            dtick: 1,
            tickformat: 'd'
        },
        yaxis: {
            ...getBaseLayout().yaxis,
            title: { text: 'Hectares cumulés', font: { size: 12 } },
            range: [0, Math.max(data.enveloppe * 1.1, Math.max(...data.conso_reelle) * 1.2)]
        }
    };
    
    Plotly.newPlot(containerId, traces, layout, PLOTLY_CONFIG);
}

/**
 * Graphique d'évolution annuelle - CORRIGÉ
 */
function renderEvolutionChart(containerId, data) {
    const { periodes, consommations } = data;
    const moyenne = consommations.reduce((a, b) => a + b, 0) / consommations.length;
    
    // Couleurs selon période (années 2010-2021 = bleu, 2022-2024 = rose)
    const colors = periodes.map(annee => {
        const year = parseInt(annee);
        return year <= 2021 ? COLORS.blue : COLORS.purple;
    });
    
    const traces = [
        {
            type: 'bar',
            x: periodes,
            y: consommations,
            marker: { 
                color: colors, 
                line: { color: COLORS.bgSecondary, width: 1 } 
            },
            text: consommations.map(v => `<b>${v.toFixed(1)}</b>`),
            textposition: 'outside',
            textfont: { color: COLORS.textPrimary, size: 12 },
            hovertemplate: '<b>Année %{x}</b><br>Consommation: %{y:.2f} ha<extra></extra>',
            name: 'Consommation annuelle',
            cliponaxis: false
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: periodes,
            y: Array(periodes.length).fill(moyenne),
            line: { color: '#E74C3C', width: 2, dash: 'dash' },
            name: `Moyenne: ${moyenne.toFixed(1)} ha/an`,
            hoverinfo: 'skip'
        }
    ];
    
    const layout = {
        ...getBaseLayout(),
        title: {
            text: 'ÉVOLUTION DE LA CONSOMMATION D\'ESPACES NAF',
            font: { size: 16, color: COLORS.textPrimary },
            x: 0.5
        },
        showlegend: false,
        xaxis: { 
            ...getBaseLayout().xaxis, 
            title: { text: 'Année', font: { size: 12 } },
            tickangle: 0,
            showgrid: false
        },
        yaxis: { 
            ...getBaseLayout().yaxis, 
            title: { text: 'Hectares', font: { size: 12 } }, 
            range: [0, Math.max(...consommations) * 1.35],
            gridcolor: COLORS.border
        },
        margin: { t: 100, b: 60, l: 80, r: 40 },
        annotations: [{
            x: 0.02, y: 0.98, xref: 'paper', yref: 'paper',
            text: '<b>Bleu</b>: Période référence (2010-2021) | <b>Rose</b>: Période ZAN (2022-2024)',
            showarrow: false, 
            font: { size: 11, color: COLORS.textSecondary },
            align: 'left'
        }]
    };
    
    Plotly.newPlot(containerId, traces, layout, PLOTLY_CONFIG);
}

/**
 * Graphique de répartition (donut)
 */
function renderRepartitionChart(containerId, legendId, data) {
    const labels = Object.keys(data);
    const values = Object.values(data);
    const total = values.reduce((a, b) => a + b, 0);
    const colors = [COLORS.green, COLORS.orange, COLORS.blue, COLORS.gray];
    
    const trace = {
        type: 'pie',
        labels: labels,
        values: values,
        hole: 0.5,
        marker: { colors: colors, line: { color: COLORS.bgSecondary, width: 2 } },
        textinfo: 'percent',
        textposition: 'inside',
        textfont: { color: COLORS.textPrimary, size: 14 },
        hovertemplate: '<b>%{label}</b><br>%{value:.1f} ha (%{percent})<extra></extra>',
        pull: [0.02, 0.02, 0.02, 0.02]
    };
    
    const layout = {
        ...getBaseLayout(),
        showlegend: false,
        margin: { l: 20, r: 20, t: 20, b: 20 },
        annotations: [{
            text: `<b>${total.toFixed(0)}</b><br>ha total`,
            x: 0.5, y: 0.5,
            font: { size: 20, color: COLORS.textPrimary },
            showarrow: false
        }]
    };
    
    Plotly.newPlot(containerId, [trace], layout, PLOTLY_CONFIG);
    
    const legendHtml = labels.map((label, i) => {
        const value = values[i];
        const pct = ((value / total) * 100).toFixed(1);
        return `<div class="legend-item"><div class="legend-color" style="background: ${colors[i]}"></div><span class="legend-label">${label}</span><span class="legend-value">${value.toFixed(1)} ha (${pct}%)</span></div>`;
    }).join('');
    
    document.getElementById(legendId).innerHTML = legendHtml;
}

/**
 * Graphique Top 10 communes
 */
function renderTop10Chart(containerId, data) {
    const sortedData = [...data].sort((a, b) => a.total - b.total);
    const communes = sortedData.map(d => d.commune);
    const destinations = ['habitat', 'activites', 'mixte', 'routes'];
    const destNames = ['Habitat', 'Activités', 'Mixte', 'Routes'];
    const destColors = [COLORS.green, COLORS.orange, COLORS.blue, COLORS.gray];
    
    const traces = destinations.map((dest, i) => ({
        type: 'bar',
        y: communes,
        x: sortedData.map(d => d[dest]),
        name: destNames[i],
        orientation: 'h',
        marker: { color: destColors[i], line: { color: COLORS.bgSecondary, width: 1 } },
        hovertemplate: '<b>%{y}</b><br>' + destNames[i] + ': %{x:.2f} ha<extra></extra>'
    }));
    
    const annotations = sortedData.map((d) => ({
        x: d.total, y: d.commune,
        text: `<b>${d.total.toFixed(1)} ha</b>`,
        xanchor: 'left', yanchor: 'middle', xshift: 8,
        showarrow: false, font: { size: 11, color: COLORS.textPrimary }
    }));
    
    const maxVal = Math.max(...sortedData.map(d => d.total));
    
    const layout = {
        ...getBaseLayout(),
        barmode: 'stack',
        margin: { l: 120, r: 70, t: 20, b: 40 },
        showlegend: true,
        legend: { x: 0.5, y: -0.08, xanchor: 'center', orientation: 'h', font: { size: 11, color: COLORS.textSecondary } },
        xaxis: { ...getBaseLayout().xaxis, visible: false, range: [0, maxVal * 1.25] },
        yaxis: { ...getBaseLayout().yaxis, showgrid: false, tickfont: { size: 11, color: COLORS.textPrimary } },
        annotations: annotations
    };
    
    Plotly.newPlot(containerId, traces, layout, PLOTLY_CONFIG);
}

/**
 * Graphique par typologie
 */
function renderTypologieChart(containerId, cardsId, data) {
    const typologies = data.map(d => d.typologie);
    const shortLabels = typologies.map(t => {
        if (t.includes('Pôles')) return 'Pôles';
        if (t.includes('Couronnes')) return 'Couronnes';
        if (t.includes('Petites')) return 'P/M aires';
        if (t.includes('Hors')) return 'Rural';
        return t;
    });
    
    const destinations = ['habitat', 'activites', 'mixte', 'routes'];
    const destNames = ['Habitat', 'Activités', 'Mixte', 'Routes'];
    const destColors = [COLORS.green, COLORS.orange, COLORS.blue, COLORS.gray];
    
    const traces = destinations.map((dest, i) => ({
        type: 'bar',
        x: shortLabels,
        y: data.map(d => d[dest]),
        name: destNames[i],
        marker: { color: destColors[i], line: { color: COLORS.bgSecondary, width: 1 } },
        text: data.map(d => d[dest] >= 1 ? d[dest].toFixed(0) : ''),
        textposition: 'outside',
        textfont: { size: 10, color: COLORS.textPrimary },
        hovertemplate: '<b>%{x}</b><br>' + destNames[i] + ': %{y:.1f} ha<extra></extra>'
    }));
    
    const maxVal = Math.max(...data.flatMap(d => [d.habitat, d.activites, d.mixte, d.routes]));
    
    const layout = {
        ...getBaseLayout(),
        barmode: 'group',
        showlegend: true,
        legend: { x: 0.5, y: 1.12, xanchor: 'center', orientation: 'h', font: { size: 11, color: COLORS.textSecondary } },
        xaxis: { ...getBaseLayout().xaxis, tickangle: 0 },
        yaxis: { ...getBaseLayout().yaxis, title: { text: 'Hectares', font: { size: 12 } }, range: [0, maxVal * 1.3] }
    };
    
    Plotly.newPlot(containerId, traces, layout, PLOTLY_CONFIG);
    
    const OBJECTIF_SEUIL = 200;
    const cardsHtml = data.map(d => {
        let status = d.efficience <= OBJECTIF_SEUIL ? 'conforme' : d.efficience <= 500 ? 'vigilance' : 'critique';
        let badge = status.charAt(0).toUpperCase() + status.slice(1);
        return `<div class="typo-card" data-status="${status}"><div class="typo-info"><h4>${d.typologie}</h4><p>${d.total.toFixed(0)} ha | ${d.efficience.toFixed(0)} m²/hab</p></div><span class="typo-badge ${status}">${badge}</span></div>`;
    }).join('');
    
    document.getElementById(cardsId).innerHTML = cardsHtml;
}

/**
 * Graphique Risques Communaux
 */
function renderRisquesChart(containerId, data) {
    const sortedData = [...data].sort((a, b) => a.taux - b.taux);
    
    const colors = sortedData.map(d => {
        if (d.status === 'conforme') return COLORS.green;
        if (d.status === 'vigilance') return COLORS.orange;
        return COLORS.red;
    });
    
    const trace = {
        type: 'bar',
        y: sortedData.map(d => d.commune),
        x: sortedData.map(d => d.taux),
        orientation: 'h',
        marker: { color: colors, line: { color: COLORS.bgSecondary, width: 1 } },
        text: sortedData.map(d => `${d.taux.toFixed(0)}%`),
        textposition: 'outside',
        textfont: { size: 10, color: COLORS.textPrimary },
        hovertemplate: '<b>%{y}</b><br>Taux: %{x:.1f}%<extra></extra>'
    };
    
    const layout = {
        ...getBaseLayout(),
        margin: { l: 130, r: 60, t: 40, b: 40 },
        title: { text: 'Taux de consommation de l\'enveloppe ZAN (%)', font: { size: 14, color: COLORS.textPrimary }, x: 0.5 },
        xaxis: { ...getBaseLayout().xaxis, title: { text: '% de l\'enveloppe consommée', font: { size: 11 } }, range: [0, Math.max(...sortedData.map(d => d.taux)) * 1.2] },
        yaxis: { ...getBaseLayout().yaxis, showgrid: false, tickfont: { size: 10, color: COLORS.textPrimary } },
        shapes: [
            { type: 'line', x0: 30, x1: 30, y0: -0.5, y1: sortedData.length - 0.5, line: { color: COLORS.orange, width: 2, dash: 'dash' } },
            { type: 'line', x0: 50, x1: 50, y0: -0.5, y1: sortedData.length - 0.5, line: { color: COLORS.red, width: 2, dash: 'dash' } }
        ],
        annotations: [
            { x: 30, y: sortedData.length - 0.5, text: '30%', showarrow: false, font: { size: 9, color: COLORS.orange }, yshift: 15 },
            { x: 50, y: sortedData.length - 0.5, text: '50%', showarrow: false, font: { size: 9, color: COLORS.red }, yshift: 15 }
        ]
    };
    
    Plotly.newPlot(containerId, [trace], layout, PLOTLY_CONFIG);
}

/**
 * Graphique Densification - CORRIGÉ pour correspondre à Streamlit
 */
function renderDensificationChart(containerId, data) {
    const colors = data.ratios.map(r => r <= data.objectif ? COLORS.blue : COLORS.purple);
    
    const traces = [
        {
            type: 'bar',
            x: data.periodes,
            y: data.ratios,
            marker: { 
                color: colors, 
                line: { color: COLORS.bgSecondary, width: 2 } 
            },
            text: data.ratios.map(v => `${v.toFixed(0)} m²/hab`),
            textposition: 'outside',
            textfont: { size: 14, color: COLORS.textPrimary },
            hovertemplate: '<b>%{x}</b><br>Ratio: %{y:.0f} m²/hab<extra></extra>'
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: data.periodes,
            y: Array(data.periodes.length).fill(data.objectif),
            line: { color: COLORS.green, width: 2, dash: 'dash' },
            name: `Objectif efficient (${data.objectif})`,
            hoverinfo: 'skip'
        }
    ];
    
    const maxRatio = Math.max(...data.ratios, data.objectif);
    
    const layout = {
        ...getBaseLayout(),
        showlegend: false,
        title: {
            text: 'ÉVOLUTION DE LA DENSIFICATION',
            font: { size: 16, color: COLORS.textPrimary },
            x: 0.5
        },
        xaxis: { 
            ...getBaseLayout().xaxis,
            title: { text: 'Période', font: { size: 12 } }
        },
        yaxis: { 
            ...getBaseLayout().yaxis, 
            title: { text: 'm²/habitant ajouté', font: { size: 12 } }, 
            range: [0, maxRatio * 1.3]
        },
        margin: { t: 80, b: 60, l: 80, r: 40 },
        annotations: [
            {
                x: 0.98, y: data.objectif, xref: 'paper', yref: 'y',
                text: `Objectif efficient (${data.objectif})`,
                showarrow: true,
                arrowhead: 2,
                arrowcolor: COLORS.green,
                font: { size: 10, color: COLORS.green },
                bgcolor: 'rgba(15, 23, 42, 0.8)',
                bordercolor: COLORS.green,
                borderwidth: 1
            }
        ]
    };
    
    Plotly.newPlot(containerId, traces, layout, PLOTLY_CONFIG);
}

/**
 * Graphique Benchmark Radar
 */
function renderBenchmarkChart(containerId, data) {
    const traces = [
        {
            type: 'scatterpolar',
            r: [...data.scot, data.scot[0]],
            theta: [...data.categories, data.categories[0]],
            fill: 'toself',
            name: data.scot_label,
            line: { color: COLORS.blue },
            fillcolor: 'rgba(46, 134, 171, 0.3)'
        },
        {
            type: 'scatterpolar',
            r: [...data.ccpda, data.ccpda[0]],
            theta: [...data.categories, data.categories[0]],
            fill: 'toself',
            name: data.ccpda_label,
            line: { color: COLORS.purple },
            fillcolor: 'rgba(162, 59, 114, 0.3)'
        }
    ];
    
    const layout = {
        ...getBaseLayout(),
        polar: {
            bgcolor: COLORS.bgPrimary,
            radialaxis: {
                visible: true,
                range: [0, 100],
                tickfont: { color: COLORS.textMuted, size: 10 },
                gridcolor: COLORS.border
            },
            angularaxis: {
                tickfont: { color: COLORS.textSecondary, size: 11 },
                gridcolor: COLORS.border
            }
        },
        showlegend: true,
        legend: { x: 0.5, y: -0.1, xanchor: 'center', orientation: 'h', font: { size: 12, color: COLORS.textSecondary } }
    };
    
    Plotly.newPlot(containerId, traces, layout, PLOTLY_CONFIG);
}

/**
 * Crée un SVG pie chart
 */
function createSVGPieChart(values, colors, size) {
    const total = values.reduce((a, b) => a + b, 0);
    if (total === 0) {
        return `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${COLORS.gray}" stroke="${COLORS.bgSecondary}" stroke-width="2"/></svg>`;
    }
    
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 2;
    
    let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
    let startAngle = -90; // Commencer en haut
    
    values.forEach((val, i) => {
        if (val <= 0) return;
        
        const angle = (val / total) * 360;
        const endAngle = startAngle + angle;
        
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        
        const largeArc = angle > 180 ? 1 : 0;
        const path = `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
        
        svg += `<path d="${path}" fill="${colors[i]}" stroke="${COLORS.bgSecondary}" stroke-width="1"/>`;
        startAngle = endAngle;
    });
    
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${COLORS.bgSecondary}" stroke-width="2"/>`;
    svg += '</svg>';
    
    return svg;
}

/**
 * Carte Top 10 communes avec pie charts
 */
async function renderTop10Map(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Nettoyer la carte précédente
    container.innerHTML = '';
    
    // Détruire la carte Leaflet existante si elle existe
    if (window.top10Map) {
        window.top10Map.remove();
        window.top10Map = null;
    }
    
    // Récupérer les codes INSEE
    const codesInsee = data.filter(d => d.code_insee).map(d => d.code_insee);
    
    if (codesInsee.length === 0) {
        container.innerHTML = '<p style="color: var(--color-text-muted); padding: 2rem; text-align: center;">Aucune coordonnée disponible</p>';
        return;
    }
    
    // Récupérer les coordonnées
    try {
        const params = new URLSearchParams();
        codesInsee.forEach(code => params.append('codes', code));
        
        const response = await fetch(`/api/communes-coords?${params.toString()}`);
        if (!response.ok) throw new Error('Erreur récupération coordonnées');
        
        const coordsData = await response.json();
        
        if (coordsData.length < 2) {
            container.innerHTML = '<p style="color: var(--color-text-muted); padding: 2rem; text-align: center;">Coordonnées insuffisantes pour afficher la carte</p>';
            return;
        }
        
        // Calculer le centre
        const lats = coordsData.map(c => c.lat);
        const lons = coordsData.map(c => c.lon);
        const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const centerLon = lons.reduce((a, b) => a + b, 0) / lons.length;
        
        // Créer la carte avec fond sombre
        const map = L.map(containerId, {
            center: [centerLat, centerLon],
            zoom: 9,
            zoomControl: true
        });
        
        // Stocker la référence pour pouvoir la détruire plus tard
        window.top10Map = map;
        
        // Ajouter le fond de carte sombre (CartoDB Dark Matter)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);
        
        // Couleurs des destinations
        const destNames = ['Habitat', 'Activités', 'Mixte', 'Routes'];
        const destColors = [COLORS.green, COLORS.orange, COLORS.blue, COLORS.gray];
        
        // Créer un objet pour mapper les codes aux données
        const dataMap = {};
        data.forEach(d => {
            if (d.code_insee) {
                dataMap[d.code_insee] = d;
            }
        });
        
        // Trouver le max pour la taille des marqueurs
        const maxArtif = Math.max(...data.map(d => d.total));
        
        // Ajouter les marqueurs avec pie charts
        coordsData.forEach(coord => {
            const communeData = dataMap[coord.code];
            if (!communeData) return;
            
            // Taille proportionnelle (entre 30 et 70 pixels)
            const size = Math.max(30, Math.min(70, 30 + (communeData.total / maxArtif) * 40));
            
            // Valeurs des destinations
            const values = [
                communeData.habitat || 0,
                communeData.activites || 0,
                communeData.mixte || 0,
                communeData.routes || 0
            ];
            
            // Créer le SVG pie chart
            const svgPie = createSVGPieChart(values, destColors, size);
            
            // Popup HTML
            let popupHtml = `
                <div style="font-family: Inter, sans-serif; min-width: 180px;">
                    <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: ${COLORS.textPrimary};">${communeData.commune}</div>
                    <div style="font-size: 12px; color: ${COLORS.textMuted}; margin-bottom: 6px;">Total: <b>${communeData.total.toFixed(1)} ha</b></div>
                    <hr style="margin: 6px 0; border-color: ${COLORS.border};">
            `;
            
            destNames.forEach((name, i) => {
                if (values[i] > 0) {
                    popupHtml += `
                        <div style="display: flex; align-items: center; margin: 3px 0;">
                            <span style="width: 10px; height: 10px; background: ${destColors[i]}; border-radius: 2px; margin-right: 6px;"></span>
                            <span style="flex: 1; font-size: 11px; color: ${COLORS.textSecondary};">${name}</span>
                            <span style="font-weight: bold; font-size: 11px; color: ${COLORS.textPrimary};">${values[i].toFixed(1)} ha</span>
                        </div>
                    `;
                }
            });
            
            popupHtml += '</div>';
            
            // Créer l'icône personnalisée
            const icon = L.divIcon({
                html: svgPie,
                className: 'pie-chart-marker',
                iconSize: [size, size],
                iconAnchor: [size/2, size/2]
            });
            
            // Ajouter le marqueur
            const marker = L.marker([coord.lat, coord.lon], { icon: icon })
                .addTo(map)
                .bindPopup(popupHtml)
                .bindTooltip(`${communeData.commune}: ${communeData.total.toFixed(1)} ha`);
            
            // Ajouter un label avec le nom de la commune
            const labelIcon = L.divIcon({
                html: `<div style="font-size: 10px; font-weight: bold; color: ${COLORS.textPrimary}; text-align: center; background: rgba(30, 41, 59, 0.9); padding: 2px 6px; border-radius: 3px; white-space: nowrap;">${communeData.commune}</div>`,
                className: 'commune-label',
                iconSize: [120, 20],
                iconAnchor: [60, 0]
            });
            
            L.marker([coord.lat, coord.lon], { icon: labelIcon, zIndexOffset: -1000 })
                .addTo(map);
        });
        
        // Ajouter la légende
        const legend = L.control({ position: 'bottomleft' });
        legend.onAdd = function() {
            const div = L.DomUtil.create('div', 'map-legend');
            div.innerHTML = `
                <div class="map-legend-title">DESTINATIONS</div>
                ${destNames.map((name, i) => `
                    <div class="map-legend-item">
                        <span class="map-legend-color" style="background: ${destColors[i]};"></span>
                        <span class="map-legend-label">${name}</span>
                    </div>
                `).join('')}
            `;
            return div;
        };
        legend.addTo(map);
        
    } catch (error) {
        console.error('Erreur création carte:', error);
        container.innerHTML = '<p style="color: var(--color-red); padding: 2rem; text-align: center;">Erreur lors du chargement de la carte</p>';
    }
}

// Export
window.Charts = {
    renderTrajectory: renderTrajectoryChart,
    renderEvolution: renderEvolutionChart,
    renderRepartition: renderRepartitionChart,
    renderTop10: renderTop10Chart,
    renderTop10Map: renderTop10Map,
    renderTypologie: renderTypologieChart,
    renderRisques: renderRisquesChart,
    renderDensification: renderDensificationChart,
    renderBenchmark: renderBenchmarkChart
};
