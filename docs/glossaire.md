# Glossaire métier

## Acteurs et régimes
- **Régime obligatoire (RO)** : Assurance Maladie de base, qui rembourse une première part des soins.
- **Complémentaire santé (RC)** : mutuelle, assureur ou institution de prévoyance ; rembourse tout ou partie du reste selon le contrat.
- **Gestionnaire de prestations** : personne qui instruit les demandes de remboursement.
- **MOA / MOE** : maîtrise d'ouvrage (le besoin métier) / maîtrise d'œuvre (la réalisation technique).

## Calcul du remboursement
- **Base de remboursement (BR)** : tarif de référence de la Sécurité sociale.
- **Ticket modérateur** : part restant à la charge de l'assuré après le RO.
- **Dépassement d'honoraires** : partie facturée au-delà de la base de remboursement.
- **Garantie / niveau de garantie** : ce que le contrat rembourse, souvent en pourcentage de la base (ex. 150 %).
- **Forfait / plafond** : montant maximal remboursé pour un poste de soins sur une période.
- **Délai de carence** : période après la souscription où une garantie ne s'applique pas encore.

## Circuit et documents
- **Tiers payant** : le patient n'avance pas les frais ; le professionnel est payé directement.
- **Télétransmission** : envoi électronique des feuilles de soins au RO.
- **Flux Noemie** : échange d'informations du RO vers la complémentaire.
- **Décompte** : document récapitulatif des remboursements.
- **100 % Santé** : panier de soins (optique, dentaire, audiologie) sans reste à charge sous conditions.

## Réglementation
- **RGPD** : les données de santé sont une catégorie sensible.
- **ACPR** : autorité de contrôle des banques et assurances en France.

## Règles de gestion (brouillon, à valider)
- **RG-01 : plafond.** Le remboursement total (RO + RC) ne dépasse jamais la garantie × la base de remboursement.
  Exemple : consultation à 80 €, base 30 €, RO à 70 % (21 €), garantie 150 %.
  Plafond total = 45 €, RC = 45 − 21 = 24 €, reste à charge = 80 − 45 = 35 €.
- **RG-02 : doublon.** Un dossier identique à un dossier déjà déposé est signalé.
- **RG-03 : dates.** La date des soins ne peut pas être postérieure à la date de dépôt.
