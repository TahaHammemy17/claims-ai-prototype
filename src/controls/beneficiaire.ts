import { Contrat } from '../contrat';
import { cleNom } from './nom';

/**
 * RG-04 : le bénéficiaire doit figurer au contrat.
 * L'alerte est un signal : le gestionnaire vérifie (homonyme, faute de frappe, ayant droit oublié...).
 */
export type BeneficiaireAlert = 'BENEFICIAIRE_INCONNU';

export interface BeneficiaireResult {
  /** false = nom absent du dossier : on ne contrôle pas et on ne devine pas. */
  comparable: boolean;
  alerts: BeneficiaireAlert[];
}

export function controlerBeneficiaire(beneficiaire: string | null, contrat: Contrat): BeneficiaireResult {
  if (beneficiaire === null || beneficiaire.trim() === '') return { comparable: false, alerts: [] };
  const connus = new Set(contrat.beneficiaires.map(cleNom));
  return connus.has(cleNom(beneficiaire)) ? { comparable: true, alerts: [] } : { comparable: true, alerts: ['BENEFICIAIRE_INCONNU'] };
}
