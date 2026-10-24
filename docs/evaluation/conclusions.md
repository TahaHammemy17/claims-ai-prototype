# Conclusions de l'évaluation (US-10)

Données chiffrées : voir comparaison.md (jeu de 10 dossiers fictifs, règles RG-01 à RG-05 en place).

## Résultats
- Aucun des trois extracteurs (règles, Nova Lite, Claude Haiku 4.5) n'invente de valeur.
- Valeurs lues juste : règles 29/32 ; Nova Lite 32/32 à la première exécution puis 31/32 ; Haiku 4.5 31/32.
- Détection des anomalies : 5/5 pour les trois, objectif de la charte atteint (elle dépend du code de contrôle,
  pas de l'extracteur ; TC-09 est détecté depuis la règle RG-04, US-08).
- Les règles échouent uniquement sur le devis (libellés différents), qui n'entre pas dans le calcul.
- Coût : fraction de centime sur ce jeu pour Nova Lite et Haiku (estimation d'après les tarifs publics,
  à vérifier) ; Haiku 4.5 coûte environ 20 fois plus que Nova Lite.

## Variabilité observée
- Nova Lite, même modèle, mêmes documents, même consigne, température à 0 : 32/32 puis 31/32.
- La variation porte sur le seul champ ambigu du jeu : la date du devis TC-02 (date d'établissement,
  non une date de soins). Une exigence floue se paie en instabilité.
- Les tokens de Haiku sont identiques sur deux exécutions, ce qui suggère des réponses plus stables.
  Deux exécutions ne suffisent pas pour conclure.

## Ce que l'on peut affirmer
- Les garde-fous (filtre par type de document, recoupement des lignes avec le total, consigne « n'invente rien »)
  suffisent, sur ce jeu, à éviter toute valeur inventée.
- Un modèle lit un devis dont les libellés diffèrent, ce que les règles ne font pas.
- Un modèle d'IA peut donner des résultats différents d'une exécution à l'autre, même à température 0.

## Ce que l'on ne peut pas affirmer
- Que Nova Lite soit meilleur que Haiku, ou l'inverse : l'écart est d'une valeur sur 32 et varie d'une exécution à l'autre.
- Que les modèles soient meilleurs que les règles sur de vrais documents : le jeu est fictif, minuscule,
  à la mise en page régulière, et l'avantage attendu d'un modèle (présentations variées) n'y est pas testé.
- Que l'objectif d'exactitude par champ soit solide : date_soins est à 90 %, exactement sur le seuil.

## Points ouverts
- La date d'un devis est-elle une date de soins ? La référence l'assimile. À trancher côté métier.
  Ne pas modifier la référence pour avantager un modèle ; si elle change, refaire toutes les mesures et le noter.
- Claude Haiku 5.5 : listé dans la région mais déclaré indisponible pour ce compte à l'appel réel.
- La classification repose sur des titres : un titre inhabituel bloquerait le document avant le modèle.
- Répéter chaque mesure plusieurs fois pour chiffrer la variabilité.

## Recommandation
- Extracteur à règles conservé : gratuit, déterministe, sans AWS, adapté aux documents réguliers.
- Extracteur IA principal : Nova Lite (appel direct à Stockholm, le moins cher), à utiliser avec la
  validation humaine systématique, car sa réponse peut varier.
- Avant toute conclusion plus large : élargir le jeu avec des mises en page variées et répéter les mesures.