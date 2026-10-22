# ADR-004 : extracteur Bedrock, validation des réponses et authentification

**Statut :** accepté, vérification réelle à faire · **Sprint :** 3 · **User story :** US-12

## Contexte
Le spike (ADR-003) a montré que Nova Lite et Claude Haiku répondent par l'API à Stockholm, et que
la qualité dépend de la consigne. Il faut maintenant un extracteur Bedrock qui respecte l'interface
commune (ADR-001), sélectionnable par configuration, sans exposer de clé dans le code.

## Décision
- **Même interface** que l'extracteur à règles. Le choix se fait par variable d'environnement :
  `EXTRACTEUR=regles` (défaut) ou `EXTRACTEUR=bedrock` avec `BEDROCK_MODEL_ID`.
- **Entrée du modèle :** un PDF est envoyé sous forme de texte (déjà lu, moins cher, chemin validé au spike) ;
  une image PNG est envoyée comme image (chemin validé dans le playground).
- **Le modèle propose, le code vérifie :** toute valeur non conforme devient « missing » :
  date impossible ou mal formatée, montant négatif ou en toutes lettres, taux supérieur à 100,
  et surtout un **recoupement** : la somme des lignes doit égaler le total (erreur constatée au spike).
- **Consigne** : dates françaises, total et non une ligne, « n'invente rien », et le contenu du document
  est une donnée, jamais des instructions (défense contre l'injection de consignes).
- **Le triage reste en amont :** un document illisible n'appelle jamais le modèle.
- **Une erreur d'accès remonte** (clé expirée, quota) au lieu d'être transformée en champs manquants.
- **Température à 0** par défaut pour des résultats reproductibles, désactivable.
- **Authentification :** clé d'API Bedrock **à courte durée** (12 heures au plus), placée dans la variable
  `AWS_BEARER_TOKEN_BEDROCK` de la session. Jamais dans un fichier, jamais dans le dépôt.
- **Suivi du coût :** l'extracteur cumule les tokens consommés.

## Conséquences
- Les tests simulent le modèle : aucun appel AWS, aucune dépense, résultats reproductibles.
- Comparer règles et modèles (US-10) ne demande qu'un changement de configuration.

## Limites et points non vérifiés
- L'appel réel à Bedrock depuis ce code n'est pas encore vérifié : il se fait avec une clé à courte durée.
- Un PDF sans texte (scan) n'est pas envoyé au modèle ; la lecture d'images n'est pas branchée dans le
  pipeline (la classification d'une image n'existe pas sans texte).
- La réponse d'un modèle varie : la qualité réelle sera mesurée à US-10.
- Les prix et l'accès aux modèles peuvent changer avec le plan AWS.
