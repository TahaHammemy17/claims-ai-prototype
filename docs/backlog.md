# Backlog produit

**Sprints :** 3 sprints d'environ une semaine. Les estimations sont des points de
complexité à confirmer en Planning Poker (hypothèses de départ).
Le suivi réel se fait dans Jira (accès sur demande) ; ce fichier en est la version lisible.

## Definition of Ready
- Story rédigée (En tant que / je veux / afin de), critères d'acceptation clairs
- Règle de gestion ou cas de test associé identifié
- Estimation posée

## Definition of Done
- Critères d'acceptation vérifiés avec les cas de test associés
- Code et documentation relus et poussés sur GitHub
- Aucun secret (clé AWS) ni donnée réelle dans le dépôt

---

## Sprint 1 : documents et extraction (13 points)

### US-01 · Disposer d'un jeu de documents synthétiques
**Priorité :** Must · **Estimation :** 3 · **Tests :** TC-01 à TC-10
**En tant que** chef de projet **je veux** un jeu de documents fictifs couvrant les 10 cas de test **afin de** mesurer la qualité du système.
- Chaque cas de test dispose d'au moins un document fictif et d'un résultat attendu écrit.
- Aucun document ne contient de donnée personnelle réelle.

### US-02 · Extraire les champs d'un document
**Priorité :** Must · **Estimation :** 5 · **Tests :** TC-01, TC-03, TC-04
**En tant que** gestionnaire **je veux** que les informations clés soient extraites automatiquement **afin de** ne plus les saisir à la main.
- Pour une facture lisible : bénéficiaire, date des soins, type d'acte, montant facturé et montant RO sont extraits.
- Un champ non trouvé est marqué « manquant » et non deviné.

### US-03 · Classer le type de document
**Priorité :** Must · **Estimation :** 3 · **Règle :** RG-05 · **Tests :** TC-02, TC-10
**En tant que** gestionnaire **je veux** que chaque document soit classé (facture, décompte, devis, non reconnu) **afin de** l'orienter vers le bon traitement.
- Un devis est classé « devis » et n'entre pas dans le calcul de remboursement.
- Un document hors sujet est classé « non reconnu ».

### US-04 · Gérer les documents illisibles
**Priorité :** Should · **Estimation :** 2 · **Tests :** TC-05
**En tant que** gestionnaire **je veux** être alerté quand un document est illisible **afin de** le traiter manuellement.
- Un document flou ne produit aucune extraction automatique.
- L'alerte « illisible » apparaît dans la file de validation.

---

## Sprint 2 : contrôles et validation humaine (15 points)

### US-05 · Contrôler le plafond de remboursement
**Priorité :** Must · **Estimation :** 5 · **Règle :** RG-01 · **Tests :** TC-03, TC-06
**En tant que** gestionnaire **je veux** être alerté si le remboursement total dépasse le plafond du contrat **afin d'** éviter un sur-paiement.
- Pour TC-03 (80 €, base 30 €, RO 21 €, garantie 150 %) : RC = 24 €, reste à charge = 35 €, aucune alerte.
- Pour TC-06 : une alerte d'incohérence est levée.

### US-06 · Détecter les doublons
**Priorité :** Must · **Estimation :** 3 · **Règle :** RG-02 · **Tests :** TC-07
**En tant que** gestionnaire **je veux** que les doublons soient signalés **afin de** ne pas rembourser deux fois.
- Un dossier identique à un dossier déjà déposé est marqué « doublon » avec la référence du dossier d'origine.

### US-07 · Contrôler les dates
**Priorité :** Must · **Estimation :** 2 · **Règle :** RG-03 · **Tests :** TC-08
**En tant que** gestionnaire **je veux** être alerté si la date des soins est postérieure à la date de dépôt **afin de** repérer les erreurs.
- Une date de soins postérieure au dépôt déclenche l'alerte « date incohérente ».

### US-09 · File de validation du gestionnaire
**Priorité :** Must · **Estimation :** 5
**En tant que** gestionnaire **je veux** une file de dossiers avec leurs alertes **afin de** décider rapidement.
- Chaque dossier affiche les champs extraits, les alertes et le document source.
- Le gestionnaire peut valider ou rejeter avec un motif ; aucune décision n'est automatique.

---

## Sprint 3 : qualité, IA cloud et livraison (16 points)

### US-08 · Contrôler le bénéficiaire
**Priorité :** Should · **Estimation :** 3 · **Règle :** RG-04 · **Tests :** TC-09
**En tant que** gestionnaire **je veux** vérifier que le bénéficiaire figure au contrat **afin d'** éviter un paiement indu.
- Un bénéficiaire absent du contrat fictif déclenche l'alerte « bénéficiaire inconnu ».

### US-10 · Mesurer la qualité du système
**Priorité :** Must · **Estimation :** 3
**En tant que** chef de projet **je veux** mesurer l'exactitude de l'extraction et la détection des incohérences **afin de** juger si le prototype atteint les objectifs de la charte.
- Un rapport donne l'exactitude par champ et le taux de détection des incohérences sur le jeu de test.

### US-11 · Tableau d'indicateurs
**Priorité :** Could · **Estimation :** 2
**En tant que** responsable des prestations **je veux** voir des indicateurs (volumes, alertes, taux de validation) **afin de** piloter l'activité.

### US-12 · Brancher l'extraction sur AWS Bedrock
**Priorité :** Should · **Estimation :** 3
**En tant que** chef de projet **je veux** pouvoir remplacer l'extracteur local par Bedrock sans changer le reste **afin de** comparer la qualité.
- L'extraction passe par une interface commune ; le fournisseur se change par configuration.

### US-13 · Déploiement minimal et suivi du budget
**Priorité :** Should · **Estimation :** 3
**En tant que** chef de projet **je veux** déployer une version démonstrative avec le budget surveillé **afin de** la montrer.
- Le budget AWS reste sous l'alerte configurée ; aucune clé n'est publiée.

### US-14 · Documentation finale et rétrospectives
**Priorité :** Must · **Estimation :** 2
**En tant que** chef de projet **je veux** une documentation et une rétrospective par sprint **afin de** rendre le projet compréhensible.
- README mis à jour, rétrospectives rédigées, résultats chiffrés publiés.
