import { readFileSync } from 'fs';

/** Ce que le prototype connaît du contrat de la complémentaire (données fictives). */
export interface Contrat {
  contrat_id: string;
  beneficiaires: string[];
}

/** Lit et vérifie un contrat. Un contrat sans bénéficiaire est refusé : il rejetterait tout le monde. */
export function chargerContrat(brut: unknown): Contrat {
  const o = brut as { contrat_id?: unknown; beneficiaires?: unknown } | null;
  if (!o || typeof o !== 'object') throw new Error('Contrat invalide : objet attendu.');
  if (typeof o.contrat_id !== 'string' || o.contrat_id.trim() === '') throw new Error('Contrat invalide : contrat_id manquant.');
  if (!Array.isArray(o.beneficiaires) || o.beneficiaires.length === 0) {
    throw new Error('Contrat invalide : au moins un bénéficiaire est requis.');
  }
  if (o.beneficiaires.some((b) => typeof b !== 'string' || b.trim() === '')) {
    throw new Error('Contrat invalide : chaque bénéficiaire doit être un nom non vide.');
  }
  return { contrat_id: o.contrat_id, beneficiaires: o.beneficiaires as string[] };
}

export function chargerContratFichier(chemin: string): Contrat {
  return chargerContrat(JSON.parse(readFileSync(chemin, 'utf-8')));
}
