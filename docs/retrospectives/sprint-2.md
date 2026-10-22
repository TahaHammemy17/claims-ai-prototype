# Rétrospective Sprint 2

**Objectif :** contrôles métier et validation humaine.
**Résultat :** 15 points planifiés, 15 livrés (US-05, US-06, US-07, US-09), plus un spike Bedrock.
Réserve : la règle RG-04 (bénéficiaire hors contrat) relève d'US-08 au Sprint 3.

## Ce qui s'est bien passé
- Le spike Bedrock a levé les risques d'accès avant de coder : Nova Lite en appel direct et Claude Haiku
  via un profil européen répondent à Stockholm, sur le plan gratuit, sans carte bancaire (ADR-003).
- Les contrôles sont du code déterministe, testé et relié aux règles de gestion (RG-01 à RG-03).
- Une décision de chef de projet a été prise et tracée : une alerte est un signal, le gestionnaire peut
  valider avec un commentaire obligatoire. Aucune décision n'est automatique.
- Les tests d'US-09 ont révélé un défaut d'une story précédente (regroupement des champs d'un dossier
  sans extraction), corrigé à la source avec un test dédié.
- Un commit par sujet, un document de décision pour chaque choix important.

## Ce qui a posé problème
- La console AWS ne correspondait pas aux consignes (menu de langue, sélecteur de région absent,
  playground renommé) : le temps passé à naviguer a dépassé celui du test lui-même.
- Une source indiquait que le plan gratuit excluait l'inférence inter-régions ; l'essai réel a montré le
  contraire sur ce compte. Les sources externes ne remplacent pas un test.
- Le premier prompt donnait 2 champs faux sur 4 (date lue à l'américaine, total confondu avec une ligne).

## Ce qu'on retient
- Un test dans le playground ne prouve pas l'accès par l'API : on a validé les deux.
- La précision de la consigne change le résultat plus que le choix du modèle.
- « Pas d'alerte » ne veut pas dire « pas de problème » : un champ manquant doit rester visible.
- Un test écrit pour une story peut révéler le défaut d'une précédente.

## Actions pour le Sprint 3
- Coder l'extracteur Bedrock sur l'interface commune, avec des tests qui simulent le modèle (sans appel AWS).
- Mesurer la qualité des trois approches (règles, Nova Lite, Claude) sur les mêmes documents (US-10).
- Suivre le solde de crédits et le budget AWS à chaque étape où on appelle Bedrock.
- Revérifier l'accès aux modèles au début du sprint : il peut changer avec le plan.
- Garder des consignes courtes, une étape à la fois.