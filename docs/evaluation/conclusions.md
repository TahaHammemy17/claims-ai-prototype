# Conclusions de l'évaluation (US-10)

Données chiffrées : voir comparaison.md (jeu de 10 dossiers fictifs).

## Résultats
- Aucun des trois extracteurs (règles, Nova Lite, Claude Haiku 4.5) n'invente de valeur.
- Valeurs lues juste : règles 29/32, Nova Lite 32/32, Haiku 4.5 31/32.
- Les règles échouent uniquement sur le devis (libellés différents), qui n'entre pas dans le calcul de remboursement.
- La détection des anomalies est identique (4/5) : elle dépend du code de contrôle, pas de l'extracteur.
  L'anomalie manquée (TC-09, bénéficiaire hors contrat) attend la règle RG-04 (US-08).
- Coût : Nova Lite et Haiku restent de l'ordre de la fraction de centime sur ce jeu. Haiku 4.5 coûte
  environ 20 fois plus que Nova Lite (estimation d'après les tarifs publics, à vérifier).

## Ce que l'on peut affirmer
- Les garde-fous (filtre par type de document, recoupement des lignes avec le total, consigne « n'invente rien »)
  suffisent, sur ce jeu, à éviter toute valeur inventée.
- Un modèle lit un devis dont les libellés diffèrent, ce que les règles ne font pas.

## Ce que l'on ne peut pas affirmer
- Que Nova Lite soit meilleur que Haiku : un écart d'une valeur sur 32 n'est pas significatif.
- Que les modèles soient meilleurs que les règles sur de vrais documents : le jeu est fictif, minuscule,
  à la mise en page régulière, et l'avantage attendu d'un modèle (présentations variées) n'y est pas testé.

## Points ouverts
- Le cas TC-02 : la date d'un devis (date d'établissement) est-elle une date de soins ?
  La référence l'assimile ; Haiku ne l'a pas rempli. À trancher côté métier. Ne pas modifier la
  référence pour avantager un modèle ; si elle change, refaire les trois mesures et le noter.
- Claude Haiku 5.5 : listé dans la région mais déclaré indisponible pour ce compte à l'appel réel.
- La classification du type de document repose sur des titres : un titre inhabituel (« note d'honoraires »)
  bloquerait le document avant le modèle. Piste : demander aussi le type au modèle.

## Recommandation
- Extracteur principal : Nova Lite (appel direct à Stockholm, le moins cher, résultat équivalent sur ce jeu).
- Extracteur à règles conservé : gratuit, sans AWS, adapté aux documents réguliers.
- Pour aller plus loin : élargir le jeu avec des mises en page variées avant de conclure sur l'apport de l'IA.