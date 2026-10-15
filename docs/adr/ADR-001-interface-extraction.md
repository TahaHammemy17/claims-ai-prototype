# ADR-001 : interface commune pour l'extraction de documents

**Statut :** accepté · **Sprint :** 1 · **User stories :** US-02, US-12

## Contexte
Le prototype doit extraire des informations de documents de remboursement.
Plusieurs techniques sont possibles : règles sur le texte du PDF, modèle d'IA
(AWS Bedrock), OCR pour les images. On veut pouvoir les comparer sans réécrire
le reste de l'application.

## Décision
- Toutes les techniques d'extraction respectent une même interface
  `DocumentExtractor` (document en entrée, champs en sortie).
- Chaque champ porte un statut : `extracted` ou `missing`. Un champ non trouvé
  n'est jamais deviné (critère d'acceptation de US-02).
- Le premier extracteur est une **base de référence par règles**
  (`LocalPdfExtractor`), sans coût ni dépendance cloud.
- L'extracteur Bedrock (US-12) viendra se brancher sur la même interface.

## Conséquences
- On pourra mesurer l'IA contre la base de référence (US-10) avec les mêmes
  documents et les mêmes résultats attendus.
- Le projet avance sans compte cloud ni coût.
- Limite connue : les règles dépendent de la mise en page des documents.
  Un document dont la présentation change peut donner des champs « missing ».
  C'est l'un des intérêts de comparer avec l'IA.

## Alternatives écartées
- Appeler directement le modèle d'IA partout : plus difficile à tester et à comparer.
- Un seul extracteur sans interface : changement de technique plus coûteux.
