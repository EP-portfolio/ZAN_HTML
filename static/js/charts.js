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
    const traces = [
        {
            type: 'scatter',
            mode: 'lines',
            x: data.annees_projection,
            y: data.trajectoire_max,
            name: 'Enveloppe maximale',
            line: { color: COLORS.orange, width: 2, dash: 'dash' },
            fill: 'tozeroy',
            fillcolor: 'rgba(237, 137, 54, 0.1)'
        },
        {
            type: 'scatter',
            mode: 'lines+markers',
            x: data.annees_reelles,
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
            title: { text: 'Année', font: { size: 12 } }
        },
        yaxis: {
            ...getBaseLayout().yaxis,
            title: { text: 'Hectares cumulés', font: { size: 12 } },
            range: [0, data.enveloppe * 1.1]
        }
    };
    
    Plotly.newPlot(containerId, traces, layout, PLOTLY_CONFIG);
}

/**
 * Graphique d'évolution annuelle
 */
function renderEvolutionChart(containerId, data) {
    const { periodes, consommations } = data;
    const moyenne = consommations.reduce((a, b) => a + b, 0) / consommations.length;
    
    const colors = periodes.map(p => {
        const year = parseInt(p.split('-')[0]);
        return year >= 21 ? COLORS.purple : COLORS.blue;
    });
    
    const traces = [
        {
            type: 'bar',
            x: periodes,
            y: consommations,
            marker: { color: colors, line: { color: COLORS.bgSecondary, width: 1 } },
            text: consommations.map(v => v.toFixed(1)),
            textposition: 'outside',
            textfont: { color: COLORS.textPrimary, size: 10 },
            hovertemplate: '<b>%{x}</b><br>%{y:.1f} ha<extra></extra>'
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: periodes,
            y: Array(periodes.length).fill(moyenne),
            line: { color: COLORS.orange, width: 2, dash: 'dash' },
            name: `Moyenne: ${moyenne.toFixed(1)} ha`,
            hoverinfo: 'skip'
        }
    ];
    
    const layout = {
        ...getBaseLayout(),
        showlegend: true,
        legend: { x: 0.5, y: 1.1, xanchor: 'center', orientation: 'h', font: { size: 11, color: COLORS.textSecondary } },
        xaxis: { ...getBaseLayout().xaxis, tickangle: -45 },
        yaxis: { ...getBaseLayout().yaxis, title: { text: 'Hectares', font: { size: 12 } }, range: [0, Math.max(...consommations) * 1.3] },
        annotations: [{
            x: 0.02, y: 0.98, xref: 'paper', yref: 'paper',
            text: '<b>Bleu</b>: Réf. 2010-2021 | <b>Rose</b>: ZAN 2022-2024',
            showarrow: false, font: { size: 10, color: COLORS.textMuted }
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
 * Graphique Densification
 */
function renderDensificationChart(containerId, data) {
    const colors = data.efficiences.map(e => e <= data.objectif ? COLORS.green : e <= 500 ? COLORS.orange : COLORS.red);
    
    const traces = [
        {
            type: 'bar',
            x: data.periodes,
            y: data.efficiences,
            marker: { color: colors, line: { color: COLORS.bgSecondary, width: 1 } },
            text: data.efficiences.map(v => `${v.toFixed(0)}`),
            textposition: 'outside',
            textfont: { size: 12, color: COLORS.textPrimary },
            hovertemplate: '<b>%{x}</b><br>%{y:.0f} m²/hab<extra></extra>'
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: data.periodes,
            y: Array(data.periodes.length).fill(data.objectif),
            line: { color: COLORS.green, width: 2, dash: 'dash' },
            name: `Objectif: ${data.objectif} m²/hab`
        }
    ];
    
    const layout = {
        ...getBaseLayout(),
        showlegend: true,
        legend: { x: 0.5, y: 1.1, xanchor: 'center', orientation: 'h', font: { size: 11, color: COLORS.textSecondary } },
        title: { text: 'Évolution de l\'efficience (m²/habitant ajouté)', font: { size: 14, color: COLORS.textPrimary }, x: 0.5 },
        xaxis: { ...getBaseLayout().xaxis },
        yaxis: { ...getBaseLayout().yaxis, title: { text: 'm²/habitant', font: { size: 11 } }, range: [0, Math.max(...data.efficiences) * 1.3] }
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

// Export
window.Charts = {
    renderTrajectory: renderTrajectoryChart,
    renderEvolution: renderEvolutionChart,
    renderRepartition: renderRepartitionChart,
    renderTop10: renderTop10Chart,
    renderTypologie: renderTypologieChart,
    renderRisques: renderRisquesChart,
    renderDensification: renderDensificationChart,
    renderBenchmark: renderBenchmarkChart
};
