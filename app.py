# -*- coding: utf-8 -*-
"""
Dashboard ZAN - Version Flask responsive
Application Web Service pour déploiement sur Render
"""

from flask import Flask, render_template, jsonify, request
import pandas as pd
import numpy as np
from pathlib import Path

app = Flask(__name__)

# ============================================
# CHARGEMENT DES DONNÉES
# ============================================

def load_data():
    """Charge les données des deux périmètres"""
    base_path = Path(__file__).parent / "data"
    
    df_scot = pd.read_csv(base_path / "data_scot_rives_du_rhone.csv", sep=";", encoding="utf-8-sig", low_memory=False)
    df_cc = pd.read_csv(base_path / "data_cc_porte_dromeardeche.csv", sep=";", encoding="utf-8-sig", low_memory=False)
    
    df_scot = prepare_data(df_scot)
    df_cc = prepare_data(df_cc)
    
    return df_scot, df_cc


def prepare_data(df):
    """Prépare et nettoie les données"""
    numeric_cols = [
        "naf09art24", "art09act24", "art09hab24", "art09mix24",
        "art09rou24", "art09fer24", "art09inc24",
        "pop15", "pop21", "pop1521",
        "men15", "men21", "men1521",
        "emp15", "emp21", "emp1521",
        "surfcom2024",
    ]
    
    # Colonnes annuelles
    for year_start in range(9, 24):
        for year_end in range(10, 25):
            if year_end == year_start + 1:
                col = f"naf{year_start:02d}art{year_end:02d}"
                if col not in numeric_cols:
                    numeric_cols.append(col)
    
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    
    if "artif_total_ha" not in df.columns:
        df["artif_total_ha"] = df.get("naf09art24", 0) / 10000
    
    return df


# Charger les données au démarrage
try:
    DF_SCOT, DF_CC = load_data()
    DATA_LOADED = True
except Exception as e:
    print(f"Erreur chargement données: {e}")
    DF_SCOT, DF_CC = None, None
    DATA_LOADED = False


# ============================================
# FONCTIONS DE CALCUL
# ============================================

def calculate_metrics(df):
    """Calcule les métriques principales"""
    metrics = {}
    
    # Artificialisation totale
    metrics["artif_total_ha"] = df["naf09art24"].sum() / 10000
    
    # Par destination
    metrics["artif_habitat_ha"] = df.get("art09hab24", pd.Series([0])).sum() / 10000
    metrics["artif_activites_ha"] = df.get("art09act24", pd.Series([0])).sum() / 10000
    metrics["artif_mixte_ha"] = df.get("art09mix24", pd.Series([0])).sum() / 10000
    metrics["artif_routes_ha"] = df.get("art09rou24", pd.Series([0])).sum() / 10000
    
    # Population
    metrics["population"] = int(df["pop21"].sum())
    metrics["evolution_pop"] = int(df["pop1521"].sum())
    
    # Efficience
    if metrics["evolution_pop"] > 0:
        metrics["conso_par_hab"] = (metrics["artif_total_ha"] * 10000) / metrics["evolution_pop"]
    else:
        metrics["conso_par_hab"] = 0
    
    # Enveloppe ZAN
    cols_ref = ["naf11art12", "naf12art13", "naf13art14", "naf14art15", "naf15art16",
                "naf16art17", "naf17art18", "naf18art19", "naf19art20", "naf20art21"]
    
    conso_ref = sum(df[col].sum() / 10000 for col in cols_ref if col in df.columns)
    metrics["conso_reference"] = conso_ref
    metrics["enveloppe_zan"] = conso_ref * 0.5
    
    # Consommation récente
    cols_recent = ["naf21art22", "naf22art23", "naf23art24"]
    conso_recent = sum(df[col].sum() / 10000 for col in cols_recent if col in df.columns)
    metrics["conso_2021_2024"] = conso_recent
    metrics["reste_disponible"] = max(0, metrics["enveloppe_zan"] - conso_recent)
    
    # Taux
    if metrics["enveloppe_zan"] > 0:
        metrics["taux_enveloppe"] = (conso_recent / metrics["enveloppe_zan"]) * 100
    else:
        metrics["taux_enveloppe"] = 0
    
    # Nombre de communes
    metrics["nb_communes"] = len(df)
    
    return metrics


def get_evolution_data(df):
    """Données pour le graphique d'évolution annuelle"""
    periodes = []
    consommations = []
    
    cols_evolution = [
        ("naf09art10", "2009-10"), ("naf10art11", "2010-11"), ("naf11art12", "2011-12"),
        ("naf12art13", "2012-13"), ("naf13art14", "2013-14"), ("naf14art15", "2014-15"),
        ("naf15art16", "2015-16"), ("naf16art17", "2016-17"), ("naf17art18", "2017-18"),
        ("naf18art19", "2018-19"), ("naf19art20", "2019-20"), ("naf20art21", "2020-21"),
        ("naf21art22", "2021-22"), ("naf22art23", "2022-23"), ("naf23art24", "2023-24"),
    ]
    
    for col, label in cols_evolution:
        if col in df.columns:
            val = df[col].sum() / 10000
            periodes.append(label)
            consommations.append(round(val, 2))
    
    return {"periodes": periodes, "consommations": consommations}


def get_repartition_data(df):
    """Données pour le graphique de répartition par destination"""
    data = {
        "Habitat": round(df.get("art09hab24", pd.Series([0])).sum() / 10000, 2),
        "Activités": round(df.get("art09act24", pd.Series([0])).sum() / 10000, 2),
        "Mixte": round(df.get("art09mix24", pd.Series([0])).sum() / 10000, 2),
        "Routes": round(df.get("art09rou24", pd.Series([0])).sum() / 10000, 2),
    }
    return data


def get_top_communes(df, n=10):
    """Top N communes les plus artificialisées"""
    df_top = df.nlargest(n, "artif_total_ha")[["idcomtxt", "artif_total_ha", "art09hab24", "art09act24", "art09mix24", "art09rou24"]].copy()
    
    for col in ["art09hab24", "art09act24", "art09mix24", "art09rou24"]:
        if col in df_top.columns:
            if df_top[col].max() > 1000:
                df_top[col] = df_top[col] / 10000
    
    result = []
    for _, row in df_top.iterrows():
        result.append({
            "commune": row["idcomtxt"],
            "total": round(row["artif_total_ha"], 2),
            "habitat": round(row.get("art09hab24", 0), 2),
            "activites": round(row.get("art09act24", 0), 2),
            "mixte": round(row.get("art09mix24", 0), 2),
            "routes": round(row.get("art09rou24", 0), 2),
        })
    
    return result


def get_typologie_data(df):
    """Données par typologie territoriale"""
    typo_labels = {
        "11": "Pôles principaux",
        "12": "Couronnes grandes aires",
        "20": "Petites/moyennes aires",
        "30": "Hors attraction (rural)",
    }
    
    df_copy = df.copy()
    df_copy["typo_label"] = df_copy["aav2020_typo"].astype(str).map(typo_labels).fillna("Autre")
    
    agg = df_copy.groupby("typo_label").agg({
        "naf09art24": "sum",
        "art09hab24": "sum",
        "art09act24": "sum",
        "art09mix24": "sum",
        "art09rou24": "sum",
        "pop1521": "sum",
    }).reset_index()
    
    # Conversion en hectares
    for col in ["naf09art24", "art09hab24", "art09act24", "art09mix24", "art09rou24"]:
        agg[col] = agg[col] / 10000
    
    # Efficience
    agg["efficience"] = np.where(
        agg["pop1521"] > 0,
        agg["naf09art24"] * 10000 / agg["pop1521"],
        0
    )
    
    result = []
    for _, row in agg.iterrows():
        result.append({
            "typologie": row["typo_label"],
            "total": round(row["naf09art24"], 2),
            "habitat": round(row["art09hab24"], 2),
            "activites": round(row["art09act24"], 2),
            "mixte": round(row["art09mix24"], 2),
            "routes": round(row["art09rou24"], 2),
            "efficience": round(row["efficience"], 0),
        })
    
    return result


def get_trajectory_data(df):
    """Données pour le graphique de trajectoire ZAN"""
    cols_evolution = [
        ("naf21art22", "2021-22"), ("naf22art23", "2022-23"), ("naf23art24", "2023-24"),
    ]
    
    # Consommation cumulée depuis 2021
    cumul = 0
    annees = ["2021"]
    conso_reelle = [0]
    
    for col, label in cols_evolution:
        if col in df.columns:
            cumul += df[col].sum() / 10000
            annees.append(label.split("-")[1])
            conso_reelle.append(round(cumul, 2))
    
    # Projection jusqu'en 2031
    metrics = calculate_metrics(df)
    enveloppe = metrics["enveloppe_zan"]
    
    # Trajectoire linéaire théorique
    trajectoire = [round(enveloppe * i / 10, 2) for i in range(11)]
    annees_projection = [str(2021 + i) for i in range(11)]
    
    return {
        "annees_reelles": annees,
        "conso_reelle": conso_reelle,
        "annees_projection": annees_projection,
        "trajectoire_max": trajectoire,
        "enveloppe": round(enveloppe, 2)
    }


def get_risques_communes(df, n=15):
    """Données pour la jauge ZAN par commune"""
    df_calc = df.copy()
    
    # Calcul de l'enveloppe individuelle par commune
    cols_ref = ["naf11art12", "naf12art13", "naf13art14", "naf14art15", "naf15art16",
                "naf16art17", "naf17art18", "naf18art19", "naf19art20", "naf20art21"]
    cols_recent = ["naf21art22", "naf22art23", "naf23art24"]
    
    df_calc["conso_ref"] = 0
    for col in cols_ref:
        if col in df_calc.columns:
            df_calc["conso_ref"] += df_calc[col] / 10000
    
    df_calc["enveloppe_commune"] = df_calc["conso_ref"] * 0.5
    
    df_calc["conso_2124"] = 0
    for col in cols_recent:
        if col in df_calc.columns:
            df_calc["conso_2124"] += df_calc[col] / 10000
    
    # Taux de consommation
    df_calc["taux_conso"] = np.where(
        df_calc["enveloppe_commune"] > 0,
        (df_calc["conso_2124"] / df_calc["enveloppe_commune"]) * 100,
        0
    )
    
    # Top communes à risque
    df_risque = df_calc.nlargest(n, "taux_conso")[["idcomtxt", "enveloppe_commune", "conso_2124", "taux_conso"]].copy()
    
    result = []
    for _, row in df_risque.iterrows():
        taux = row["taux_conso"]
        if taux < 30:
            status = "conforme"
        elif taux < 50:
            status = "vigilance"
        else:
            status = "critique"
        
        result.append({
            "commune": row["idcomtxt"],
            "enveloppe": round(row["enveloppe_commune"], 2),
            "consomme": round(row["conso_2124"], 2),
            "taux": round(taux, 1),
            "status": status
        })
    
    return result


def get_densification_data(df):
    """Données pour l'évolution de la densification"""
    # Périodes
    periodes = ["2011-2015", "2015-2018", "2018-2021", "2021-2024"]
    
    # Calcul par période
    cols_periodes = [
        (["naf11art12", "naf12art13", "naf13art14", "naf14art15"], ["pop15"]),
        (["naf15art16", "naf16art17", "naf17art18"], ["pop15", "pop21"]),
        (["naf18art19", "naf19art20", "naf20art21"], ["pop21"]),
        (["naf21art22", "naf22art23", "naf23art24"], ["pop21"]),
    ]
    
    efficiences = []
    for artif_cols, pop_cols in cols_periodes:
        artif = sum(df[col].sum() / 10000 for col in artif_cols if col in df.columns)
        pop = df[pop_cols[-1]].sum() if pop_cols else 0
        
        # Estimation évolution pop par période
        if len(pop_cols) == 2:
            evol = df[pop_cols[1]].sum() - df[pop_cols[0]].sum()
        else:
            evol = df["pop1521"].sum() / 2  # Approximation
        
        if evol > 0:
            eff = (artif * 10000) / evol
        else:
            eff = 0
        
        efficiences.append(round(eff, 0))
    
    return {
        "periodes": periodes,
        "efficiences": efficiences,
        "objectif": 200  # Seuil ZAN recommandé
    }


def get_benchmark_data():
    """Données pour le radar benchmark SCOT vs CCPDA"""
    if DF_SCOT is None or DF_CC is None:
        return None
    
    metrics_scot = calculate_metrics(DF_SCOT)
    metrics_cc = calculate_metrics(DF_CC)
    
    # Normalisation pour radar (0-100)
    def normalize(val, max_val):
        return min(100, (val / max_val) * 100) if max_val > 0 else 0
    
    # Critères
    max_artif = max(metrics_scot["artif_total_ha"], metrics_cc["artif_total_ha"])
    max_pop = max(metrics_scot["population"], metrics_cc["population"])
    max_eff = max(metrics_scot["conso_par_hab"], metrics_cc["conso_par_hab"])
    max_taux = max(metrics_scot["taux_enveloppe"], metrics_cc["taux_enveloppe"])
    
    categories = ["Artificialisation", "Population", "Efficience", "Taux ZAN", "Reste disponible"]
    
    scot_values = [
        normalize(metrics_scot["artif_total_ha"], max_artif),
        normalize(metrics_scot["population"], max_pop),
        100 - normalize(metrics_scot["conso_par_hab"], max_eff),  # Inversé (moins = mieux)
        100 - normalize(metrics_scot["taux_enveloppe"], 100),  # Inversé
        normalize(metrics_scot["reste_disponible"], metrics_scot["enveloppe_zan"]) if metrics_scot["enveloppe_zan"] > 0 else 0,
    ]
    
    cc_values = [
        normalize(metrics_cc["artif_total_ha"], max_artif),
        normalize(metrics_cc["population"], max_pop),
        100 - normalize(metrics_cc["conso_par_hab"], max_eff),
        100 - normalize(metrics_cc["taux_enveloppe"], 100),
        normalize(metrics_cc["reste_disponible"], metrics_cc["enveloppe_zan"]) if metrics_cc["enveloppe_zan"] > 0 else 0,
    ]
    
    return {
        "categories": categories,
        "scot": [round(v, 1) for v in scot_values],
        "ccpda": [round(v, 1) for v in cc_values],
        "scot_label": "SCoT Rives du Rhône",
        "ccpda_label": "CC Porte DrômArdèche"
    }


def get_communes_table(df):
    """Données pour le tableau des communes"""
    cols = ["idcomtxt", "iddeptxt", "pop21", "artif_total_ha", "art09hab24", "art09act24"]
    df_table = df[cols].copy()
    
    # Conversion
    for col in ["art09hab24", "art09act24"]:
        if col in df_table.columns:
            if df_table[col].max() > 1000:
                df_table[col] = df_table[col] / 10000
    
    df_table = df_table.rename(columns={
        "idcomtxt": "commune",
        "iddeptxt": "departement",
        "pop21": "population",
        "artif_total_ha": "total_ha",
        "art09hab24": "habitat_ha",
        "art09act24": "activites_ha"
    })
    
    # Arrondir
    for col in ["total_ha", "habitat_ha", "activites_ha"]:
        df_table[col] = df_table[col].round(2)
    
    df_table["population"] = df_table["population"].astype(int)
    
    return df_table.sort_values("total_ha", ascending=False).to_dict("records")


# ============================================
# ROUTES
# ============================================

@app.route("/")
def index():
    """Page principale"""
    return render_template("index.html", data_loaded=DATA_LOADED)


@app.route("/api/metrics")
def api_metrics():
    """API: Métriques principales"""
    perimetre = request.args.get("perimetre", "scot")
    df = DF_SCOT if perimetre == "scot" else DF_CC
    
    if df is None:
        return jsonify({"error": "Données non disponibles"}), 500
    
    metrics = calculate_metrics(df)
    metrics["perimetre"] = "SCoT des Rives du Rhône" if perimetre == "scot" else "CC Porte de DrômArdèche"
    
    return jsonify(metrics)


@app.route("/api/evolution")
def api_evolution():
    """API: Données d'évolution annuelle"""
    perimetre = request.args.get("perimetre", "scot")
    df = DF_SCOT if perimetre == "scot" else DF_CC
    
    if df is None:
        return jsonify({"error": "Données non disponibles"}), 500
    
    return jsonify(get_evolution_data(df))


@app.route("/api/repartition")
def api_repartition():
    """API: Répartition par destination"""
    perimetre = request.args.get("perimetre", "scot")
    df = DF_SCOT if perimetre == "scot" else DF_CC
    
    if df is None:
        return jsonify({"error": "Données non disponibles"}), 500
    
    return jsonify(get_repartition_data(df))


@app.route("/api/top-communes")
def api_top_communes():
    """API: Top communes"""
    perimetre = request.args.get("perimetre", "scot")
    n = int(request.args.get("n", 10))
    df = DF_SCOT if perimetre == "scot" else DF_CC
    
    if df is None:
        return jsonify({"error": "Données non disponibles"}), 500
    
    return jsonify(get_top_communes(df, n))


@app.route("/api/typologie")
def api_typologie():
    """API: Données par typologie"""
    perimetre = request.args.get("perimetre", "scot")
    df = DF_SCOT if perimetre == "scot" else DF_CC
    
    if df is None:
        return jsonify({"error": "Données non disponibles"}), 500
    
    return jsonify(get_typologie_data(df))


@app.route("/api/trajectory")
def api_trajectory():
    """API: Trajectoire ZAN"""
    perimetre = request.args.get("perimetre", "scot")
    df = DF_SCOT if perimetre == "scot" else DF_CC
    
    if df is None:
        return jsonify({"error": "Données non disponibles"}), 500
    
    return jsonify(get_trajectory_data(df))


@app.route("/api/risques")
def api_risques():
    """API: Risques communaux"""
    perimetre = request.args.get("perimetre", "scot")
    n = int(request.args.get("n", 15))
    df = DF_SCOT if perimetre == "scot" else DF_CC
    
    if df is None:
        return jsonify({"error": "Données non disponibles"}), 500
    
    return jsonify(get_risques_communes(df, n))


@app.route("/api/densification")
def api_densification():
    """API: Évolution densification"""
    perimetre = request.args.get("perimetre", "scot")
    df = DF_SCOT if perimetre == "scot" else DF_CC
    
    if df is None:
        return jsonify({"error": "Données non disponibles"}), 500
    
    return jsonify(get_densification_data(df))


@app.route("/api/benchmark")
def api_benchmark():
    """API: Benchmark radar SCOT vs CCPDA"""
    data = get_benchmark_data()
    
    if data is None:
        return jsonify({"error": "Données non disponibles"}), 500
    
    return jsonify(data)


@app.route("/api/communes")
def api_communes():
    """API: Tableau des communes"""
    perimetre = request.args.get("perimetre", "scot")
    df = DF_SCOT if perimetre == "scot" else DF_CC
    
    if df is None:
        return jsonify({"error": "Données non disponibles"}), 500
    
    return jsonify(get_communes_table(df))


# ============================================
# POINT D'ENTRÉE
# ============================================

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

