import { Alert, triageDocument } from './triage';
import {
  DocumentExtractor,
  DocumentType,
  ExtractionResult,
  LocalPdfExtractor,
  classifyDocument,
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

/** Enchaîne : triage, classification, extraction. */
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
  const extraction = await extractor.extract(input, source);
  return {
    source,
    documentType,
    eligibleAuRemboursement: isEligibleForRefund(documentType),
    alerts: [],
    extraction,
  };
}
