import { DocumentExtractor, DocumentType, FieldName } from '../extraction';
import { DossierValues, mergeExtractions } from '../dossier';
import { processDocument } from '../pipeline';
import { controlerPlafond, PlafondCalcul } from '../controls/plafond';
import { controlerDates } from '../controls/dates';
import { DossierRegistry } from '../controls/doublon';
import { Alerte, alerte } from './alertes';

export type Statut = 'A_VALIDER' | 'VALIDE' | 'REJETE';

export interface Decision {
  statut: 'VALIDE' | 'REJETE';
  par: string;
  le: string; // date et heure ISO
  commentaire: string | null; // obligatoire pour valider un dossier en alerte
  motif: string | null; // obligatoire pour rejeter
}

export interface DossierAValider {
  reference: string;
  date_depot: string;
  documents: Array<{ fichier: string; type: DocumentType }>;
  champs: DossierValues;
  /** Champs essentiels introuvables : à rendre visibles, un silence n'est pas une approbation. */
  champsEssentielsManquants: FieldName[];
  calcul: PlafondCalcul | null;
  alertes: Alerte[];
  statut: Statut;
  decision: Decision | null;
}

export interface FichierSource {
  nom: string;
  contenu: Buffer;
}

const ESSENTIELS: FieldName[] = ['beneficiaire', 'date_soins', 'type_acte', 'montant_facture'];
const nombre = (v: string | number | null): number | null => (typeof v === 'number' ? v : null);

/**
 * Assemble tous les contrôles pour un dossier. Le résultat est TOUJOURS "A_VALIDER" :
 * aucune décision n'est prise par le système.
 */
export async function construireDossier(params: {
  reference: string;
  fichiers: FichierSource[];
  dateDepot: string;
  garantiePct: number;
  registre: DossierRegistry;
  /** Extracteur à utiliser (règles par défaut). */
  extracteur?: DocumentExtractor;
}): Promise<DossierAValider> {
  const { reference, fichiers, dateDepot, garantiePct, registre, extracteur } = params;
  const alertes: Alerte[] = [];
  const documents: DossierAValider['documents'] = [];
  const extractions = [];

  for (const f of fichiers) {
    const r = await processDocument(f.contenu, f.nom, extracteur);
    documents.push({ fichier: f.nom, type: r.documentType });
    for (const code of r.alerts) alertes.push(alerte(code));
    if (r.alerts.length === 0 && r.documentType === 'non_reconnu') alertes.push(alerte('NON_RECONNU'));
    if (r.documentType === 'devis') alertes.push(alerte('DEVIS_NON_ELIGIBLE'));
    if (r.extraction) extractions.push(r.extraction);
  }

  const champs = mergeExtractions(extractions);
  const aExtrait = extractions.length > 0;
  const champsEssentielsManquants = aExtrait ? ESSENTIELS.filter((n) => champs[n] === null) : [];

  let calcul: PlafondCalcul | null = null;
  if (aExtrait) {
    const dates = controlerDates({ date_soins: champs.date_soins as string | null, date_depot: dateDepot });
    for (const code of dates.alerts) alertes.push(alerte(code));

    const doublon = registre.enregistrer(reference, champs);
    for (const code of doublon.alerts) alertes.push(alerte(code, `dossier ${doublon.duplicateOf}`));

    const plafond = controlerPlafond({
      montant_facture: nombre(champs.montant_facture),
      base_remboursement: nombre(champs.base_remboursement),
      montant_RO: nombre(champs.montant_RO),
      garantie_pct: garantiePct,
    });
    for (const code of plafond.alerts) alertes.push(alerte(code));
    calcul = plafond.calcul;
  }

  return {
    reference,
    date_depot: dateDepot,
    documents,
    champs,
    champsEssentielsManquants,
    calcul,
    alertes,
    statut: 'A_VALIDER',
    decision: null,
  };
}
