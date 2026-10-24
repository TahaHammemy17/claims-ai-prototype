import { DossierValues } from '../dossier';
import { normaliserNom } from './nom';

/**
 * RG-02 : un dossier identique à un dossier déjà déposé est signalé comme doublon.
 *
 * Deux dossiers sont considérés identiques quand le bénéficiaire (sans tenir compte
 * des accents, des majuscules ni des espaces), la date des soins et le montant facturé
 * (en centimes) sont les mêmes.
 *
 * L'alerte est un SIGNAL, pas une décision : deux soins distincts le même jour pour le
 * même montant seraient signalés à tort, et c'est le gestionnaire qui tranche.
 */
export type DoublonAlert = 'DOUBLON';

export interface DoublonResult {
  /** false = données insuffisantes pour comparer (on ne devine pas). */
  comparable: boolean;
  /** Référence du premier dossier déposé, s'il s'agit d'un doublon. */
  duplicateOf: string | null;
  alerts: DoublonAlert[];
}

/** Clé de comparaison, ou null si une des trois informations manque. */
export function cleDoublon(values: DossierValues): string | null {
  const { beneficiaire, date_soins, montant_facture } = values;
  if (typeof beneficiaire !== 'string' || typeof date_soins !== 'string' || typeof montant_facture !== 'number') {
    return null;
  }
  const centimes = Math.round(montant_facture * 100);
  return `${normaliserNom(beneficiaire)}|${date_soins}|${centimes}`;
}

/** Mémoire des dossiers déjà déposés (en mémoire pour ce prototype). */
export class DossierRegistry {
  private readonly dejaVus = new Map<string, string>();

  enregistrer(reference: string, values: DossierValues): DoublonResult {
    const cle = cleDoublon(values);
    if (cle === null) return { comparable: false, duplicateOf: null, alerts: [] };

    const origine = this.dejaVus.get(cle);
    if (origine !== undefined) {
      return { comparable: true, duplicateOf: origine, alerts: ['DOUBLON'] };
    }
    this.dejaVus.set(cle, reference);
    return { comparable: true, duplicateOf: null, alerts: [] };
  }
}
