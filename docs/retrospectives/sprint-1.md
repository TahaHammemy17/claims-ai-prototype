# Rétrospective Sprint 1

**Objectif :** disposer des documents de test et d'un premier extracteur de champs.
**Résultat :** 13 points planifiés, 13 livrés (US-01 à US-04).
Réserve : l'affichage de l'alerte « illisible » dans la file de validation sera vérifié à US-09.

## Ce qui s'est bien passé
- Les critères d'acceptation étaient écrits avant le code et chaque story est reliée à des cas de test.
- Les décisions importantes sont tracées dans des ADR (interface d'extraction, mesure de netteté).
- Une base de référence sans IA permet de comparer Bedrock plus tard avec les mêmes documents.

## Ce qui a posé problème
- La première mesure de netteté (variance du Laplacien) a échoué : le bruit de TC-05 la faussait. Elle a été remplacée par une mesure des contours, calibrée sur nos documents.
- La configuration de l'environnement (compte AWS en projets, installation de Node, copie des fichiers) a pris plus de temps que prévu.
- Un blocage lié à la bibliothèque PDF dans l'environnement de test (option Node nécessaire).

## Ce qu'on retient
- Mesurer sur des cas réels avant de choisir un seuil.
- Écrire le test avant de corriger, pour vérifier qu'il détecte bien l'erreur.

## Actions pour le Sprint 2
- Tester Bedrock tôt avec un spike limité dans le temps (quotas, région, modèle).
- Découper les étapes de mise en place en consignes plus courtes.
- Rester sur un commit par sujet.