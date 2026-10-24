# Comparaison des extracteurs (US-10)

Jeu de test : 10 dossiers fictifs, 6 champs mesurés par dossier.
Objectifs de la charte : exactitude ≥ 90 % par champ, détection des anomalies ≥ 95 %.

## Vue d'ensemble

| Extracteur | Valeurs attendues lues juste | Valeurs fausses (dont inventées) | Valeurs manquantes | Exactitude globale | Anomalies détectées | Fausses alarmes | Appels | Tokens (entrée / sortie) |
|---|---|---|---|---|---|---|---|---|
| Claude Haiku 4.5 | 31/32 (96.9 %) | 0 (dont 0) | 1 | 98.3 % | 5/5 (100 %) | 0 | 10 | 5574 / 1214 |
| Nova Lite run 2 | 31/32 (96.9 %) | 0 (dont 0) | 1 | 98.3 % | 5/5 (100 %) | 0 | 10 | 5574 / 1214 |
| Nova Lite run 3 | 31/32 (96.9 %) | 0 (dont 0) | 1 | 98.3 % | 5/5 (100 %) | 0 | 10 | 5574 / 1214 |
| Nova Lite | 31/32 (96.9 %) | 0 (dont 0) | 1 | 98.3 % | 5/5 (100 %) | 0 | 10 | 5129 / 1145 |
| Regles | 29/32 (90.6 %) | 0 (dont 0) | 3 | 95 % | 5/5 (100 %) | 0 | — | — |

*L'exactitude globale compte aussi les cases « rien à trouver », faciles à réussir : le taux de lecture des valeurs réellement présentes est plus exigeant.*
*Une valeur fausse est plus grave qu'une valeur manquante : une valeur manquante se voit dans la file de validation, une valeur fausse peut passer inaperçue.*

## Exactitude par champ

| Champ | Claude Haiku 4.5 | Nova Lite run 2 | Nova Lite run 3 | Nova Lite | Regles |
|---|---|---|---|---|---|
| beneficiaire | 100 % | 100 % | 100 % | 100 % | 90 % |
| date_soins | 90 % | 90 % | 90 % | 90 % | 90 % |
| montant_facture | 100 % | 100 % | 100 % | 100 % | 90 % |
| base_remboursement | 100 % | 100 % | 100 % | 100 % | 100 % |
| taux_RO | 100 % | 100 % | 100 % | 100 % | 100 % |
| montant_RO | 100 % | 100 % | 100 % | 100 % | 100 % |

## Objectifs de la charte

- **Claude Haiku 4.5** : exactitude par champ atteint · détection des anomalies atteint
- **Nova Lite run 2** : exactitude par champ atteint · détection des anomalies atteint
- **Nova Lite run 3** : exactitude par champ atteint · détection des anomalies atteint
- **Nova Lite** : exactitude par champ atteint · détection des anomalies atteint
- **Regles** : exactitude par champ atteint · détection des anomalies atteint

## Détail des écarts

### Claude Haiku 4.5

| Dossier | Champ | Attendu | Obtenu | Verdict |
|---|---|---|---|---|
| TC-02 | date_soins | 2026-04-02 | — | manquant |


### Nova Lite run 2

| Dossier | Champ | Attendu | Obtenu | Verdict |
|---|---|---|---|---|
| TC-02 | date_soins | 2026-04-02 | — | manquant |


### Nova Lite run 3

| Dossier | Champ | Attendu | Obtenu | Verdict |
|---|---|---|---|---|
| TC-02 | date_soins | 2026-04-02 | — | manquant |


### Nova Lite

| Dossier | Champ | Attendu | Obtenu | Verdict |
|---|---|---|---|---|
| TC-02 | date_soins | 2026-04-02 | — | manquant |


### Regles

| Dossier | Champ | Attendu | Obtenu | Verdict |
|---|---|---|---|---|
| TC-02 | beneficiaire | Hugo BERNARD | — | manquant |
| TC-02 | date_soins | 2026-04-02 | — | manquant |
| TC-02 | montant_facture | 650 | — | manquant |


## Limites de cette évaluation

- **Jeu de test minuscule et fictif** : une dizaine de dossiers générés par le même outil, à la mise en page régulière. Les résultats ne se généralisent pas à de vrais documents.
- **Résultats attendus écrits par l'auteur** : une erreur dans la référence fausse la mesure (une lacune a d'ailleurs été corrigée au cours de cette étape).
- **Une seule exécution par modèle** : un modèle d'IA peut répondre différemment d'une fois à l'autre.
- **Le type d'acte n'est pas mesuré** (texte libre) ; la lecture d'images nettes n'est pas comparée.
- **La détection des anomalies dépend aussi du code de contrôle**, pas seulement de l'extracteur.
