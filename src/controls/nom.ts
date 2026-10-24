/** "  Léa   BERNARD " -> "lea bernard" : sans accents, en minuscules, espaces simplifiés. */
export function normaliserNom(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clé de comparaison de personnes : insensible aux accents, aux majuscules, à l'ordre
 * (« BERNARD Léa » = « Léa BERNARD ») et aux tirets ou apostrophes (« Marie-Claire » = « Marie Claire »).
 * Limite : les surnoms, initiales et fautes de frappe ne sont pas rapprochés.
 */
export function cleNom(nom: string): string {
  return normaliserNom(nom)
    .split(/[\s'’-]+/)
    .filter((mot) => mot.length > 0)
    .sort()
    .join(' ');
}
