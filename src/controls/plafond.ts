/**
 * RG-01 : le remboursement total (RO + RC) ne dépasse jamais la garantie × la base
 * de remboursement, ni le montant réellement facturé.
 *
 * Modèle volontairement simplifié (pas de participation forfaitaire, ni de franchise).
 * Tous les calculs se font en centimes entiers : en virgule flottante,
 * 0,1 + 0,2 ne vaut pas exactement 0,3, ce qui est inacceptable pour de l'argent.
 */

export type ControlAlert = 'INCOHERENCE_MONTANT' | 'PLAFOND_DEPASSE';

export interface PlafondInput {
  montant_facture: number | null;
  base_remboursement: number | null;
  montant_RO: number | null;
  /** Garantie du contrat, en % de la base de remboursement (ex. 150). */
  garantie_pct: number;
  /** Remboursement complémentaire annoncé sur le dossier, s'il existe. */
  montant_RC_declare?: number | null;
}

export interface PlafondCalcul {
  plafond_total: number;
  montant_RC: number;
  reste_a_charge: number;
}

export interface PlafondResult {
  /** null = calcul impossible (donnée manquante) ou incohérence détectée. */
  calcul: PlafondCalcul | null;
  alerts: ControlAlert[];
}

const toCents = (euros: number) => Math.round(euros * 100);
const toEuros = (cents: number) => cents / 100;

export function controlerPlafond(input: PlafondInput): PlafondResult {
  if (!Number.isFinite(input.garantie_pct) || input.garantie_pct <= 0) {
    throw new Error('La garantie du contrat doit être un pourcentage strictement positif.');
  }
  const { montant_facture, base_remboursement, montant_RO } = input;
  // Donnée manquante : on ne calcule pas et on ne devine pas.
  if (montant_facture === null || base_remboursement === null || montant_RO === null) {
    return { calcul: null, alerts: [] };
  }

  const facture = toCents(montant_facture);
  const base = toCents(base_remboursement);
  const ro = toCents(montant_RO);

  // Le régime obligatoire ne peut pas avoir remboursé plus que la dépense.
  if (ro > facture) return { calcul: null, alerts: ['INCOHERENCE_MONTANT'] };

  const plafond = Math.round((base * input.garantie_pct) / 100);
  const limite = Math.min(plafond, facture);
  const rc = Math.max(0, limite - ro);

  const alerts: ControlAlert[] = [];
  if (input.montant_RC_declare !== undefined && input.montant_RC_declare !== null) {
    if (ro + toCents(input.montant_RC_declare) > limite) alerts.push('PLAFOND_DEPASSE');
  }

  return {
    calcul: {
      plafond_total: toEuros(plafond),
      montant_RC: toEuros(rc),
      reste_a_charge: toEuros(facture - ro - rc),
    },
    alerts,
  };
}