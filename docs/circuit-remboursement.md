# Circuit de remboursement (as-is simplifié)

```mermaid
flowchart TD
    A[Assuré : soin ou achat] --> B[Feuille de soins transmise au régime obligatoire]
    B --> C[Le RO calcule et verse sa part]
    C --> D[La complémentaire reçoit l'information ou les justificatifs]
    D --> E[Le gestionnaire contrôle le dossier]
    E --> F{Dossier cohérent ?}
    F -->|Oui| G[Remboursement et décompte]
    F -->|Non| H[Demande de pièces, rejet ou escalade]
```

## Où le projet intervient
L'étape **E** : lecture des documents, extraction des informations et contrôles
de cohérence, avec décision finale du gestionnaire.

## Points de friction supposés (à valider avec un professionnel)
- Saisie manuelle des informations de chaque document
- Relecture des montants et des plafonds de garantie
- Détection des doublons
- Retours à l'assuré pour pièces manquantes
