# Dashboard ZAN - Version Flask Responsive

Dashboard de suivi de l'artificialisation des sols avec interface HTML/CSS/JS responsive.

## 🎯 Fonctionnalités

- **KPIs** : Indicateurs clés (artificialisation, population, enveloppe ZAN)
- **Graphiques interactifs** : Évolution, répartition, top communes, typologie
- **Filtres** : SCOT Rives du Rhône / CC Porte DrômArdèche
- **100% Responsive** : Mobile, tablette, desktop
- **API REST** : Endpoints pour données dynamiques

## 📁 Structure

```
DASHBOARD_HTML/
├── app.py                    # Serveur Flask + API
├── requirements.txt          # Dépendances Python
├── render.yaml               # Configuration Render
├── templates/
│   └── index.html            # Page principale
├── static/
│   ├── css/
│   │   └── styles.css        # Styles responsive
│   └── js/
│       ├── app.js            # Logique frontend
│       └── charts.js         # Graphiques Plotly.js
├── data/
│   ├── data_scot_rives_du_rhone.csv
│   └── data_cc_porte_dromeardeche.csv
└── utils/
    └── __init__.py
```

## 🚀 Déploiement sur Render

### Option 1 : Déploiement automatique (recommandé)

1. **Créer un dépôt GitHub** avec ce dossier
2. **Connecter à Render** :
   - Aller sur [render.com](https://render.com)
   - "New" → "Web Service"
   - Connecter votre dépôt GitHub
3. **Configuration** :
   - Name: `dashboard-zan`
   - Runtime: `Python`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`
   - Plan: `Free`
4. **Déployer**

### Option 2 : Avec render.yaml

Le fichier `render.yaml` configure automatiquement le service. Il suffit de :
1. Pousser le code sur GitHub
2. Dans Render : "New" → "Blueprint" → Sélectionner le dépôt

## 💻 Développement local

```bash
# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur
python app.py

# Ouvrir http://localhost:5000
```

## 🔌 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Page principale |
| `GET /api/metrics?perimetre=scot` | Métriques KPIs |
| `GET /api/evolution?perimetre=scot` | Données évolution annuelle |
| `GET /api/repartition?perimetre=scot` | Répartition par destination |
| `GET /api/top-communes?perimetre=scot&n=10` | Top N communes |
| `GET /api/typologie?perimetre=scot` | Analyse par typologie |

Paramètre `perimetre` : `scot` ou `ccpda`

## 📱 Responsive Design

Le design utilise des **unités relatives** :

| Unité | Usage |
|-------|-------|
| `%` | Largeurs de conteneurs |
| `vw/vh` | Dimensions viewport |
| `rem` | Tailles de texte |
| `clamp()` | Valeurs fluides min/max |

### Breakpoints

- **Mobile** : < 768px (menu hamburger, 1 colonne)
- **Tablette** : 768-1024px (sidebar réduite, 2 colonnes)
- **Desktop** : > 1024px (layout complet)

## 📊 Technologies

- **Backend** : Flask 3.0
- **Frontend** : HTML5, CSS3, JavaScript ES6
- **Graphiques** : Plotly.js
- **Données** : Pandas, NumPy
- **Serveur prod** : Gunicorn

## 📄 Source des données

- **Observatoire de l'artificialisation des sols**
- **Période** : 2009-2024
- **URL** : https://artificialisation.developpement-durable.gouv.fr

