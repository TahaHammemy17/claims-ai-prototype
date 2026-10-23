import { Alert, triageDocument } from './triage';
import {
  DocumentExtractor,
  DocumentType,
  ExtractionResult,
  FieldName,
  LocalPdfExtractor,
  classifyDocument,
  emptyFields,
  isEligibleForRefund,
} from './extraction';

export interface ProcessedDocument {
  source: string;
  documentType: DocumentType;
  eligibleAuRemboursement: boolean;
  alerts: Alert[];
  /** null = aucune extraction automatique (document illisible ou non pris en charge). */
  extraction: ExtractionResult | null;
}

/**
 * Champs qui ont un sens pour chaque type de document. Le type est décidé par le code
 * (classification), pas par le modèle : si un extracteur renvoie un champ qui n'existe pas
 * dans ce type de document, il est écarté. Exemple constaté en réel : sur un décompte, le
 * modèle a pris la base de remboursement (30 €) pour le montant facturé.
 */
const CHAMPS_PAR_TYPE: Record<DocumentType, FieldName[]> = {
  facture: ['beneficiaire', 'date_soins', 'type_acte', 'montant_facture'],
  devis: ['beneficiaire', 'date_soins', 'type_acte', 'montant_facture'],
  decompte: ['beneficiaire', 'date_soins', 'type_acte', 'base_remboursement', 'taux_RO', 'montant_RO'],
  non_reconnu: [],
};

function ecarterChampsHorsType(type: DocumentType, extraction: ExtractionResult): ExtractionResult {
  const fields = emptyFields();
  for (const nom of CHAMPS_PAR_TYPE[type]) fields[nom] = extraction.fields[nom];
  return { source: extraction.source, fields };
}

/** Enchaîne : triage, classification, extraction (jamais appelée pour un document non reconnu). */
export async function processDocument(
  input: Buffer,
  source: string,
  extractor: DocumentExtractor = new LocalPdfExtractor(),
): Promise<ProcessedDocument> {
  const triage = triageDocument(input);
  if (!triage.automatique) {
    return { source, documentType: 'non_reconnu', eligibleAuRemboursement: false, alerts: triage.alerts, extraction: null };
  }
  const documentType = await classifyDocument(input);
  // Un document non reconnu part au traitement manuel : inutile (et risqué) de le faire lire par un modèle.
  const extraction =
    documentType === 'non_reconnu'
      ? { source, fields: emptyFields() }
      : ecarterChampsHorsType(documentType, await extractor.extract(input, source));
  return {
    source,
    documentType,
    eligibleAuRemboursement: isEligibleForRefund(documentType),
    alerts: [],
    extraction,
  };
}
