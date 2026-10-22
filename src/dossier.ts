import { ALL_FIELDS, ExtractionResult, FieldName } from './extraction';

export type DossierValues = Record<FieldName, string | number | null>;

/**
 * Regroupe les champs extraits des documents d'un même dossier (facture + décompte).
 * Pour chaque champ, on garde la première valeur trouvée ; sinon null.
 * Tous les champs sont toujours présents, même quand aucun document n'a pu être lu.
 * Limite connue : on ne détecte pas encore deux valeurs contradictoires entre documents.
 */
export function mergeExtractions(results: ExtractionResult[]): DossierValues {
  const merged = {} as DossierValues;
  for (const name of ALL_FIELDS) {
    const hit = results.map((r) => r.fields[name]).find((f) => f.status === 'extracted');
    merged[name] = hit ? hit.value : null;
  }
  return merged;
}
