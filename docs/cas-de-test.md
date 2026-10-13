# Cas de test (documents synthétiques à créer)

## Règles complémentaires
- **RG-04 : bénéficiaire.** Le bénéficiaire doit figurer au contrat.
- **RG-05 : type de document.** Le document doit être reconnu (facture, décompte, devis).

(RG-01 à RG-03 : voir le glossaire.)

| ID | Document | Résultat attendu |
|---|---|---|
| TC-01 | Facture d'optique (panier 100 % Santé) | Champs extraits, aucune alerte, dossier à valider |
| TC-02 | Devis dentaire | Classé « devis », orienté vers une file spécifique (RG-05) |
| TC-03 | Consultation spécialiste : 80 €, base 30 €, RO 70 %, garantie 150 % | RO 21 €, RC 24 €, reste à charge 35 € (RG-01), aucune alerte |
| TC-04 | Décompte du RO avec remboursement partiel | Montants RO extraits, cohérents |
| TC-05 | Document illisible ou très flou | Aucune extraction automatique, alerte « illisible », traitement manuel |
| TC-06 | Montant remboursé supérieur au montant facturé | Alerte d'incohérence (RG-01) |
| TC-07 | Doublon exact d'une demande déjà déposée | Alerte « doublon » (RG-02) |
| TC-08 | Date de soins postérieure à la date de dépôt | Alerte « date incohérente » (RG-03) |
| TC-09 | Bénéficiaire absent du contrat | Alerte « bénéficiaire inconnu » (RG-04) |
| TC-10 | Document hors sujet (ni facture, ni décompte, ni devis) | Classé « non reconnu » (RG-05) |

## Principe
Pour chaque cas, on mesure : champs extraits correctement, alerte levée ou non,
décision laissée au gestionnaire.
