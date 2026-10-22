import { readFileSync } from 'fs';
import { join } from 'path';
import { controlerPlafond } from '../src/controls/plafond';
import { mergeExtractions } from '../src/dossier';
import { processDocument } from '../src/pipeline';

const SAMPLES = join(__dirname, '..', 'samples');
const GARANTIE = 150; // contrat fictif : consultation de spécialiste à 150 % de la base

async function dossier(files: string[]) {
  const results = [];
  for (const f of files) {
    const r = await processDocument(readFileSync(join(SAMPLES, f)), f);
    if (r.extraction) results.push(r.extraction);
  }
  return mergeExtractions(results);
}

describe('US-05 : calcul du plafond (RG-01)', () => {
  it('TC-03 : 80 €, base 30 €, RO 21 €, garantie 150 % -> RC 24 €, reste à charge 35 €', async () => {
    const d = await dossier(['TC-03_facture_specialiste.pdf', 'TC-03_decompte_RO.pdf']);
    const r = controlerPlafond({
      montant_facture: d.montant_facture as number,
      base_remboursement: d.base_remboursement as number,
      montant_RO: d.montant_RO as number,
      garantie_pct: GARANTIE,
    });
    expect(r.alerts).toEqual([]);
    expect(r.calcul).toEqual({ plafond_total: 45, montant_RC: 24, reste_a_charge: 35 });
  });

  it('TC-06 : un RO supérieur au montant facturé lève INCOHERENCE_MONTANT', async () => {
    const d = await dossier(['TC-06_facture.pdf', 'TC-06_decompte_RO.pdf']);
    const r = controlerPlafond({
      montant_facture: d.montant_facture as number,
      base_remboursement: d.base_remboursement as number,
      montant_RO: d.montant_RO as number,
      garantie_pct: GARANTIE,
    });
    expect(r.alerts).toEqual(['INCOHERENCE_MONTANT']);
    expect(r.calcul).toBeNull();
  });
});

describe('US-05 : cas limites du calcul', () => {
  const base = { montant_facture: 80, base_remboursement: 30, montant_RO: 21, garantie_pct: 150 };

  it('un RC annoncé égal au calcul ne déclenche pas d\'alerte', () => {
    expect(controlerPlafond({ ...base, montant_RC_declare: 24 }).alerts).toEqual([]);
  });

  it('exercice : 120 €, base 30 €, RO 21 €, garantie 200 %', () => {
    const r = controlerPlafond({ montant_facture: 120, base_remboursement: 30, montant_RO: 21, garantie_pct: 200 });
    expect(r.calcul).toEqual({ plafond_total: 60, montant_RC: 39, reste_a_charge: 60 });
  });

  it('un RC annoncé qui fait dépasser le plafond lève PLAFOND_DEPASSE', () => {
    expect(controlerPlafond({ ...base, montant_RC_declare: 30 }).alerts).toEqual(['PLAFOND_DEPASSE']);
  });

  it('le remboursement ne dépasse jamais la dépense réelle', () => {
    const r = controlerPlafond({ ...base, montant_facture: 40 });
    expect(r.calcul).toEqual({ plafond_total: 45, montant_RC: 19, reste_a_charge: 0 });
  });

  it('une garantie à 100 % de la base laisse un reste à charge', () => {
    const r = controlerPlafond({ ...base, garantie_pct: 100 });
    expect(r.calcul).toEqual({ plafond_total: 30, montant_RC: 9, reste_a_charge: 50 });
  });

  it('calcule en centimes sans erreur d\'arrondi', () => {
    const r = controlerPlafond({ montant_facture: 33.33, base_remboursement: 20.1, montant_RO: 14.07, garantie_pct: 200 });
    expect(r.calcul).toEqual({ plafond_total: 40.2, montant_RC: 19.26, reste_a_charge: 0 });
  });

  it('une donnée manquante : pas de calcul, pas d\'alerte, rien de deviné', () => {
    const r = controlerPlafond({ ...base, base_remboursement: null });
    expect(r).toEqual({ calcul: null, alerts: [] });
  });

  it('une garantie invalide est refusée', () => {
    expect(() => controlerPlafond({ ...base, garantie_pct: 0 })).toThrow();
    expect(() => controlerPlafond({ ...base, garantie_pct: NaN })).toThrow();
  });
});