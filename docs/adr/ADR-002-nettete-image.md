# ADR-002 : détecter les images illisibles par une mesure de netteté

**Statut :** accepté · **Sprint :** 1 · **User story :** US-04

## Contexte
Un document flou ne doit produire aucune extraction automatique : une valeur lue
sur une image illisible serait une valeur devinée. On veut aussi éviter de payer
un appel à un modèle d'IA (US-12) sur une image inutilisable.

## Décision
- Avant toute extraction, un **triage** contrôle le document :
  PDF = extraction automatique ; image PNG floue = alerte `ILLISIBLE` ; image PNG nette
  ou autre format = traitement manuel (pas d'OCR dans ce prototype).
- La netteté est mesurée par l'**intensité des contours les plus marqués** :
  niveaux de gris, réduction de moitié, variation entre pixels voisins,
  99,5e percentile. Seuil : **60**.

## Pourquoi pas la mesure classique (variance du Laplacien) ?
Testée en premier, elle a échoué : le bruit de l'image TC-05 gonfle sa valeur
(2 989) au-dessus de celle des documents nets (1 248 à 2 376). Le flou lui-même
la fait chuter, mais le bruit la fausse. La réduction de moitié atténue le bruit.

## Calibration (documents synthétiques)
| Image | Score |
|---|---|
| Documents nets (72 à 110 dpi) | 110 à 214 |
| Net avec bruit ajouté | ~170 |
| Flou léger (sigma 1,5) | ~73 |
| Net mais pâle (contraste × 0,4) | ~68 |
| Flou moyen (sigma 2) | ~51 |
| TC-05 (flou + bruit) | ~41 |
| Flou fort (sigma 6) | ~21 |

## Limites connues
- Calibré sur des données synthétiques : à recalibrer sur de vrais scans.
- Un document net mais très pâle approche le seuil : il peut être écarté à tort.
  Ce choix est volontaire (on préfère le traitement manuel à une valeur douteuse).
- Seul le format PNG est évalué. Les JPEG et les PDF scannés (sans texte) ne le sont pas.
- Aucune lecture des images nettes (pas d'OCR) : prévue avec un modèle d'IA (US-12).
