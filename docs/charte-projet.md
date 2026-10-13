# Charte projet : instruction assistée des remboursements santé

**Version :** 1.0 · **Chef de projet MOA :** Taha HAMMAMI

## 1. Contexte
Les gestionnaires de prestations d'une complémentaire santé lisent chaque
document de remboursement (facture, décompte) et saisissent les informations à
la main. Ce travail est long et source d'erreurs.

## 2. Objectif
Démontrer qu'une extraction par IA, associée à des contrôles de cohérence,
réduit le temps de saisie, avec validation humaine systématique.

## 3. Périmètre
- Dépôt de documents synthétiques (PDF / images)
- Extraction : bénéficiaire, date des soins, type d'acte, montant facturé,
  montant remboursé par le régime obligatoire
- Contrôles : champs manquants, incohérences de montants, doublons
- File de validation pour le gestionnaire et indicateurs de suivi

## 4. Hors périmètre
- Tarification et souscription
- Données réelles de santé
- Paiement et intégration réelle avec les flux de l'Assurance Maladie
- Décision automatique de refus

## 5. Indicateurs de succès (hypothèses à valider après les premiers tests)
- Exactitude d'extraction ≥ 90 % par champ sur le jeu de test
- ≥ 95 % des incohérences injectées détectées
- 100 % des dossiers validés par un humain

## 6. Parties prenantes (fictives)
Responsable des prestations santé (sponsor métier), gestionnaires de
prestations (utilisateurs), DSI (MOE), juriste / DPO (RGPD, IA), chef de
projet MOA.

## 7. Contraintes
Temps limité, budget AWS plafonné avec alerte, données uniquement synthétiques.

## 8. Risques principaux
| Risque : Mesure |
| L'IA se trompe sur un champ : Validation humaine, mesure du taux d'erreur |
| Documents synthétiques trop faciles : Varier mises en page, qualité, cas pièges |
| Dérive du périmètre : Respect de la liste « hors périmètre » |
| Coûts AWS imprévus : Budget avec alerte e-mail, petits volumes |
| Mauvaise compréhension du métier : Relecture par un professionnel de l'assurance |

## 9. Livrables
Charte, glossaire, carte du circuit, backlog, jeux de test, code, évaluation
de la qualité, documentation.
