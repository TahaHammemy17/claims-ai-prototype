/**
 * RG-03 : la date des soins ne peut pas être postérieure à la date de dépôt.
 * Un soin du jour même ou antérieur est accepté.
 *
 * Les dates sont des dates de calendrier (AAAA-MM-JJ). On les compare en UTC, sans
 * heure : avec le fuseau horaire local, un décalage d'une heure pourrait faire passer
 * minuit et changer le jour.
 */
export type DateAlert = 'DATE_INCOHERENTE' | 'DATE_INVALIDE';

export interface DateInput {
  date_soins: string | null;
  date_depot: string | null;
}

export interface DateResult {
  /** false = donnée manquante ou invalide : on ne compare pas. */
  comparable: boolean;
  alerts: DateAlert[];
}

/** "2026-03-12" -> horodatage UTC ; null si le format ou la date de calendrier est invalide. */
function lireDateIso(texte: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte);
  if (!m) return null;
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const horodatage = Date.UTC(annee, mois - 1, jour);
  const d = new Date(horodatage);
  // Date.UTC "corrige" 30 février en 2 mars : on vérifie que rien n'a été corrigé.
  if (d.getUTCFullYear() !== annee || d.getUTCMonth() !== mois - 1 || d.getUTCDate() !== jour) return null;
  return horodatage;
}

export function controlerDates(input: DateInput): DateResult {
  // Donnée absente : on ne devine pas.
  if (input.date_soins === null || input.date_depot === null) {
    return { comparable: false, alerts: [] };
  }
  const soins = lireDateIso(input.date_soins);
  const depot = lireDateIso(input.date_depot);
  if (soins === null || depot === null) {
    return { comparable: false, alerts: ['DATE_INVALIDE'] };
  }
  if (soins > depot) return { comparable: true, alerts: ['DATE_INCOHERENTE'] };
  return { comparable: true, alerts: [] };
}