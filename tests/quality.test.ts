import { readFileSync } from 'fs';
import { join } from 'path';
import { SHARPNESS_THRESHOLD, assessPngQuality, sharpnessScore } from '../src/quality/imageQuality';
import { triageDocument } from '../src/triage';
import { processDocument } from '../src/pipeline';

const SAMPLES = join(__dirname, '..', 'samples');
const read = (f: string) => readFileSync(join(SAMPLES, f));

/** Image synthétique : bandes noires et blanches de 4 pixels (contours francs). */
function stripes(size: number): { data: Uint8Array } {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = Math.floor(x / 4) % 2 === 0 ? 0 : 255;
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { data };
}

/** Flou simple : moyenne des 9 voisins (bords inclus), répétée. */
function blur(size: number, rgba: Uint8Array, passes: number): Uint8Array {
  const clamp = (v: number) => Math.min(size - 1, Math.max(0, v));
  let cur = Float64Array.from(rgba);
  for (let p = 0; p < passes; p++) {
    const next = Float64Array.from(cur);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) sum += cur[(clamp(y + dy) * size + clamp(x + dx)) * 4 + c];
          }
          next[(y * size + x) * 4 + c] = sum / 9;
        }
      }
    }
    cur = next;
  }
  return Uint8Array.from(cur);
}

describe('US-04 : mesure de netteté', () => {
  const SIZE = 120;

  it('une image à contours francs dépasse le seuil', () => {
    const { data } = stripes(SIZE);
    expect(sharpnessScore(SIZE, SIZE, data)).toBeGreaterThan(SHARPNESS_THRESHOLD);
  });

  it('la même image après flou tombe sous le seuil', () => {
    const { data } = stripes(SIZE);
    const flou = blur(SIZE, data, 12);
    expect(sharpnessScore(SIZE, SIZE, flou)).toBeLessThan(SHARPNESS_THRESHOLD);
  });

  it('une image trop petite obtient un score nul (non évaluable)', () => {
    expect(sharpnessScore(2, 2, new Uint8Array(16))).toBe(0);
  });

  it('le document flou TC-05 est sous le seuil, un scan net est largement au-dessus', () => {
    const flou = assessPngQuality(read('TC-05_document_illisible.png'));
    const net = assessPngQuality(read('TC-05b_scan_net.png'));
    expect(flou.readable).toBe(false);
    expect(net.readable).toBe(true);
    expect(net.score).toBeGreaterThan(flou.score * 2);
  });
});

describe('US-04 : triage des documents', () => {
  it('un PDF passe en extraction automatique, sans alerte', () => {
    const t = triageDocument(read('TC-01_facture_optique.pdf'));
    expect(t).toEqual({ automatique: true, alerts: [] });
  });

  it('une image floue reçoit l\'alerte ILLISIBLE (TC-05)', () => {
    const t = triageDocument(read('TC-05_document_illisible.png'));
    expect(t.automatique).toBe(false);
    expect(t.alerts).toEqual(['ILLISIBLE']);
  });

  it('une image nette n\'est pas déclarée illisible : pas d\'OCR, traitement manuel', () => {
    const t = triageDocument(read('TC-05b_scan_net.png'));
    expect(t.automatique).toBe(false);
    expect(t.alerts).toEqual(['IMAGE_NON_PRISE_EN_CHARGE']);
  });

  it('un format inconnu ou un PNG corrompu est renvoyé au traitement manuel', () => {
    expect(triageDocument(Buffer.from('ceci n\'est pas un document')).alerts).toEqual(['FORMAT_NON_PRIS_EN_CHARGE']);
    const corrompu = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from('xxxx')]);
    expect(triageDocument(corrompu).alerts).toEqual(['FORMAT_NON_PRIS_EN_CHARGE']);
  });
});

describe('US-04 : un document flou ne produit aucune extraction automatique', () => {
  it('TC-05 : extraction nulle, alerte ILLISIBLE, hors calcul de remboursement', async () => {
    const r = await processDocument(read('TC-05_document_illisible.png'), 'TC-05');
    expect(r.extraction).toBeNull();
    expect(r.alerts).toContain('ILLISIBLE');
    expect(r.eligibleAuRemboursement).toBe(false);
  });

  it('TC-01 : un document lisible est traité normalement', async () => {
    const r = await processDocument(read('TC-01_facture_optique.pdf'), 'TC-01');
    expect(r.alerts).toEqual([]);
    expect(r.documentType).toBe('facture');
    expect(r.extraction?.fields.montant_facture).toEqual({ status: 'extracted', value: 180 });
  });
});
