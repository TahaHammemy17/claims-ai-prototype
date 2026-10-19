import { readFileSync } from 'fs';
import { assessPngQuality, isPng } from './quality/imageQuality';

export type Alert = 'ILLISIBLE' | 'IMAGE_NON_PRISE_EN_CHARGE' | 'FORMAT_NON_PRIS_EN_CHARGE';

export interface Triage {
  /** true = le document peut passer dans l'extraction automatique. */
  automatique: boolean;
  alerts: Alert[];
  sharpness?: number;
}

const isPdf = (input: Buffer) => input.subarray(0, 4).toString('latin1') === '%PDF';

/**
 * Premier contrôle d'un document, avant tout appel à un extracteur.
 * - PDF : extraction automatique possible.
 * - Image PNG floue : alerte ILLISIBLE, aucune extraction.
 * - Image PNG nette : pas d'OCR dans ce prototype, traitement manuel.
 * - Autre format : traitement manuel.
 */
export function triageDocument(input: Buffer): Triage {
  if (isPdf(input)) return { automatique: true, alerts: [] };

  if (isPng(input)) {
    try {
      const { score, readable } = assessPngQuality(input);
      return readable
        ? { automatique: false, alerts: ['IMAGE_NON_PRISE_EN_CHARGE'], sharpness: score }
        : { automatique: false, alerts: ['ILLISIBLE'], sharpness: score };
    } catch {
      return { automatique: false, alerts: ['FORMAT_NON_PRIS_EN_CHARGE'] };
    }
  }
  return { automatique: false, alerts: ['FORMAT_NON_PRIS_EN_CHARGE'] };
}

export const triageFile = (path: string): Triage => triageDocument(readFileSync(path));
