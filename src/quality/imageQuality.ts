import { PNG } from 'pngjs';

/**
 * Seuil de netteté. En dessous, l'image est considérée comme illisible.
 * Calibré sur nos documents synthétiques (voir docs/adr/ADR-002-nettete-image.md) :
 *   documents nets : 110 à 171 · flou moyen (sigma 2) : ~51 · TC-05 : ~41.
 * À recalibrer sur de vrais scans avant tout usage réel.
 */
export const SHARPNESS_THRESHOLD = 60;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

export function isPng(input: Buffer): boolean {
  return PNG_SIGNATURE.every((b, i) => input[i] === b);
}

/** Percentile avec interpolation linéaire (même définition que numpy). */
function percentile(values: Float64Array, p: number): number {
  const sorted = Float64Array.from(values).sort();
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Score de netteté : intensité des contours les plus marqués de l'image.
 * 1) niveaux de gris  2) réduction de moitié (atténue le bruit)
 * 3) variation de luminosité entre pixels voisins  4) 99,5e percentile.
 * Un document net a des contours francs (texte noir sur fond blanc) ; un flou les adoucit.
 */
export function sharpnessScore(width: number, height: number, rgba: Uint8Array): number {
  const w = width - (width % 2);
  const h = height - (height % 2);
  const dw = w / 2;
  const dh = h / 2;
  if (dw < 3 || dh < 3) return 0;

  const gray = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  };

  const small = new Float64Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      small[y * dw + x] =
        (gray(2 * x, 2 * y) + gray(2 * x + 1, 2 * y) + gray(2 * x, 2 * y + 1) + gray(2 * x + 1, 2 * y + 1)) / 4;
    }
  }

  const grads = new Float64Array((dw - 1) * (dh - 1));
  let k = 0;
  for (let y = 0; y < dh - 1; y++) {
    for (let x = 0; x < dw - 1; x++) {
      const gx = Math.abs(small[y * dw + x + 1] - small[y * dw + x]);
      const gy = Math.abs(small[(y + 1) * dw + x] - small[y * dw + x]);
      grads[k++] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return percentile(grads, 99.5);
}

export interface ImageQuality {
  score: number;
  readable: boolean;
}

/** Évalue la netteté d'une image PNG. Lève une erreur si le PNG est invalide. */
export function assessPngQuality(input: Buffer): ImageQuality {
  const png = PNG.sync.read(input);
  const score = sharpnessScore(png.width, png.height, png.data);
  return { score, readable: score >= SHARPNESS_THRESHOLD };
}
