import { controlerDates } from '../../controls/dates';
import { emptyFields, parseAmount } from '../parsing';
import { ExtractedField, FieldName } from '../types';

type Champs = Record<FieldName, ExtractedField>;

const trouve = (value: string | number): ExtractedField => ({ status: 'extracted', value });

/** Un nombre, ou une chaîne lisible par nos règles ("180,00 €"). Sinon null : on ne devine pas. */
function nombre(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? v : null;
  if (typeof v === 'string') return parseAmount(v);
  return null;
}

const texte = (v: unknown): string | null => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : null);
const centimes = (n: number) => Math.round(n * 100);

/** Extrait l'objet JSON de la réponse, même entouré de ```json ou d'une phrase. */
function lireJson(reponse: string): Record<string, unknown> | null {
  const debut = reponse.indexOf('{');
  const fin = reponse.lastIndexOf('}');
  if (debut === -1 || fin <= debut) return null;
  try {
    const obj = JSON.parse(reponse.slice(debut, fin + 1));
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null;
  } catch {
    return null;
  }
}

/**
 * Le modèle PROPOSE, le code VÉRIFIE.
 * Toute valeur non conforme devient "missing" : mieux vaut un champ vide visible qu'une valeur douteuse.
 */
export function interpreterReponse(reponse: string): Champs {
  const champs = emptyFields();
  const obj = lireJson(reponse);
  if (!obj) return champs;

  const beneficiaire = texte(obj.beneficiaire);
  if (beneficiaire) champs.beneficiaire = trouve(beneficiaire);

  // Une date impossible (30 février) ou au mauvais format est refusée.
  const date = texte(obj.date_soins);
  if (date && controlerDates({ date_soins: date, date_depot: date }).comparable) champs.date_soins = trouve(date);

  const acte = texte(obj.type_acte);
  if (acte) champs.type_acte = trouve(acte);

  let total = nombre(obj.montant_facture);
  // Recoupement : la somme des lignes doit égaler le total (erreur constatée au spike : total pris sur une ligne).
  if (total !== null && Array.isArray(obj.lignes) && obj.lignes.length > 0) {
    const lignes = obj.lignes.map(nombre);
    if (lignes.some((l) => l === null)) total = null;
    else if ((lignes as number[]).reduce((somme, l) => somme + centimes(l), 0) !== centimes(total)) total = null;
  }
  if (total !== null) champs.montant_facture = trouve(total);

  const base = nombre(obj.base_remboursement);
  if (base !== null) champs.base_remboursement = trouve(base);

  const taux = nombre(obj.taux_RO);
  if (taux !== null && taux <= 100) champs.taux_RO = trouve(taux);

  const ro = nombre(obj.montant_RO);
  if (ro !== null) champs.montant_RO = trouve(ro);

  return champs;
}
