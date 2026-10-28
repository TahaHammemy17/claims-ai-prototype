# Rétrospective Sprint 3

**Objectif :** IA, qualité mesurée et livraison.
**Résultat :** 16 points livrés (US-08, US-10, US-12, US-13, US-14).
Changements de périmètre : US-11 (indicateurs, priorité « Could ») sortie du sprint par choix de
priorisation ; US-13 réestimée de 3 à 5 points (fonction Lambda choisie plutôt que l'option légère).

## Ce qui s'est bien passé
- Le premier essai réel de l'extracteur Bedrock a révélé un défaut qu'un faux modèle ne pouvait pas montrer
  (sur un décompte, la base de remboursement prise pour le montant facturé). Corrigé en filtrant les champs
  selon le type de document, avec des tests qui échouent sur l'ancien code et passent avec la correction.
- La mesure a été conduite avec honnêteté : une seconde exécution de Nova Lite a donné 31/32 au lieu de 32/32,
  ce qui a conduit à des conclusions prudentes (variabilité, référence ambiguë sur la date du devis).
- Le déploiement a été fait par étapes isolées (fonction invoquée à la main avant de brancher S3, règles
  avant modèle). Moindre privilège prouvé par un refus d'accès, absence de boucle vérifiée, aucune clé,
  recherche de secrets avant publication, procédure de démontage écrite.
- Les décisions de périmètre ont été prises explicitement et tracées.

## Ce qui a posé problème
- Beaucoup de temps perdu sur l'environnement : CloudShell suspendu et variables perdues, pager AWS,
  copie de fichiers, console qui ne correspond pas toujours aux consignes.
- L'accès réel aux modèles diffère de ce qui est listé : formulaire d'usage Anthropic à remplir,
  Claude Haiku 5.5 listé mais indisponible pour ce compte.
- Des totaux de tests annoncés en cours de sprint étaient inexacts (écart de 2).
- Une clé temporaire a été affichée à l'écran lors d'une première saisie ; la saisie masquée a été adoptée.

## Ce qu'on retient
- Un test réel vaut plus qu'un test simulé : le faux modèle ne reproduit que les erreurs imaginées.
- Un indicateur se vérifie (aucun échec, bon nombre de suites) plutôt que de se croire sur parole.
- Ne pas modifier la référence après avoir vu les résultats : cela fausse la mesure.
- Mesurer avant d'optimiser : le coût est dans les tokens, pas dans le calcul de la fonction.
- Un changement de périmètre se chiffre et se trace.
- Les secrets se saisissent masqués, durent peu, et ne s'écrivent jamais dans un fichier.

## Actions pour la suite
- Indicateurs de pilotage (US-11).
- Jeu de test à la mise en page variée, avec mesures répétées.
- Lecture des images par le modèle (pas d'OCR actuellement).
- Brancher les contrôles de dossier dans la fonction AWS, ajouter une interface pour le gestionnaire.
- Rejouer entièrement les scripts de déploiement et de démontage.