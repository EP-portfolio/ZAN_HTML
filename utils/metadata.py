# -*- coding: utf-8 -*-
"""
Module de métadonnées des données
"""

from pathlib import Path
from datetime import datetime
import os


# Source des données
DATA_SOURCE = "Observatoire de l'artificialisation des sols"
DATA_SOURCE_URL = "https://artificialisation.biodiversite.gouv.fr"
DATA_DESCRIPTION = "Fichier national de consommation d'espaces NAF (Naturels, Agricoles et Forestiers)"
DATA_PERIOD = "2009-2024"


def get_data_last_update() -> str:
    """
    Récupère la date de dernière mise à jour du fichier de données
    
    Returns:
        Date au format DD/MM/YYYY
    """
    base_path = Path(__file__).parent.parent
    # Chercher dans data/
    data_file = base_path / "data" / "data_scot_rives_du_rhone.csv"
    
    if data_file.exists():
        # Récupérer la date de modification
        timestamp = os.path.getmtime(data_file)
        date_obj = datetime.fromtimestamp(timestamp)
        return date_obj.strftime("%d/%m/%Y")
    else:
        # Date par défaut si fichier non trouvé
        return datetime.now().strftime("%d/%m/%Y")


def get_data_source_text() -> str:
    """
    Retourne le texte de source des données pour les graphiques
    
    Returns:
        Texte formaté avec source et date
    """
    last_update = get_data_last_update()
    return f"Source: {DATA_SOURCE} | Données: {DATA_PERIOD} | Dernière mise à jour: {last_update}"


def get_footer_text() -> str:
    """
    Retourne le texte du footer avec toutes les informations
    
    Returns:
        Texte complet du footer
    """
    last_update = get_data_last_update()
    return (
        f"Données: {DATA_SOURCE} ({DATA_PERIOD}) | "
        f"Dernière récolte: {last_update} | "
        f"Plus d'infos: {DATA_SOURCE_URL}"
    )

