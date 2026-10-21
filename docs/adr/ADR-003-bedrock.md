# ADR-003 : Bedrock, modèles et accès (résultat du spike)

**Statut :** accepté · **Sprint :** 2 · **User story :** US-12

## Contexte
Avant de coder US-12, un spike d'une heure vérifie l'accès à Bedrock, la région, le coût
et le comportement des modèles sur nos documents fictifs.

## Résultats
Région : Europe (Stockholm), eu-north-1. Plan gratuit AWS, sans carte bancaire.

Playground, document net (TC-05b), modèle Amazon Nova Lite :
- premier message : 2 champs sur 4 faux (date lue 03/12 au lieu de 12/03, montant d'une ligne au lieu du total)
- message précisé (dates françaises, total à payer, toutes les lignes d'acte) : 4 champs sur 4 corrects
- document flou (TC-05) : tous les champs à null, aucune valeur inventée

API (CloudShell, Converse) :
- `amazon.nova-lite-v1:0` : appel direct (ON_DEMAND) accepté, 7 tokens en entrée, 3 en sortie
- Claude Haiku via le profil `eu.anthropic.claude-haiku-4-5-20251001-v1:0` : accepté, 16 tokens en entrée, 5 en sortie

Disponibilité à Stockholm : Nova Lite v1 est le seul modèle Nova appelable directement ;
les autres modèles Nova et tous les modèles Claude exigent un profil d'inférence.

## Décision
- US-12 implémentera un extracteur Bedrock via l'API Converse, sur l'interface commune (ADR-001).
- Modèle principal : Nova Lite v1 (appel direct, lit les images, coût très faible).
- Modèle de comparaison : Claude Haiku via le profil `eu.` (jamais `global.` pour des documents
  de santé : le traitement pourrait sortir de l'UE).
- Le modèle propose, le code vérifie : les sorties passent par les fonctions de lecture
  (montants, dates) et par des contrôles de cohérence (somme des lignes = total).
- Les consignes (format de date français, total à payer, « n'invente rien ») sont intégrées au prompt.

## Limites et risques
- Quelques essais isolés : l'exactitude réelle sera mesurée à US-10.
- L'accès aux profils inter-régions fonctionne sur ce compte aujourd'hui, alors qu'une source
  indiquait le contraire pour le plan gratuit. À revérifier si le plan change.
- Le plan gratuit prend fin avec les crédits ou au bout de 6 mois.
- Le caractère « UE » du profil `eu.` est à confirmer dans la documentation AWS avant tout usage réel.