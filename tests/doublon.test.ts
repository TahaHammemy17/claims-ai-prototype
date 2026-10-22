import { readFileSync } from 'fs';
import { join } from 'path';
import { DossierRegistry } from '../src/controls/doublon';
import { DossierValues, mergeExtractions } from '../src/dossier';
import { ALL_FIELDS } from '../src/extraction';
import { processDocument } from '../src/pipeline';

const SAMPLES = join(__dirname, '..', 'samples');

async function dossier(files: string[]): Promise<DossierValues> {
  const results = [];
  for (const f of files) {
    const r = await processDocument(readFileSync(join(SAMPLES, f)), f);
    if (r.extraction) results.push(r.extraction);
  }
  return mergeExtractions(results);
}

/** Construit un dossier complet à partir de quelques valeurs. */
function valeurs(partiel: Partial<DossierValues>): DossierValues {
  const v = {} as DossierValues;
  for (const f of ALL_FIELDS) v[f] = null;
  return { ...v, ...partiel };
}

describe('US-06 : détection des doublons (RG-02) sur le jeu de test', () => {
  it('TC-07 : la copie de la facture de TC-01 est un doublon de TC-01', async () => {
    const registre = new DossierRegistry();
    const premier = registre.enregistrer('TC-01', await dossier(['TC-01_facture_optique.pdf']));
    const copie = registre.enregistrer('TC-07', await dossier(['TC-07_doublon_facture_optique.pdf']));

    expect(premier).toEqual({ comparable: true, duplicateOf: null, alerts: [] });
    expect(copie).toEqual({ comparable: true, duplicateOf: 'TC-01', alerts: ['DOUBLON'] });
  });

  it('deux factures différentes ne sont pas des doublons (TC-01 puis TC-08)', async () => {
    const registre = new DossierRegistry();
    registre.enregistrer('TC-01', await dossier(['TC-01_facture_optique.pdf']));
    const autre = registre.enregistrer('TC-08', await dossier(['TC-08_facture_date_future.pdf']));
    expect(autre.alerts).toEqual([]);
  });
});

describe('US-06 : règles de comparaison', () => {
  const base = { beneficiaire: 'Léa BERNARD', date_soins: '2026-03-12', montant_facture: 180 };

  it('ignore les accents, les majuscules et les espaces du nom', () => {
    const registre = new DossierRegistry();
    registre.enregistrer('A', valeurs(base));
    const r = registre.enregistrer('B', valeurs({ ...base, beneficiaire: '  LEA   bernard ' }));
    expect(r.duplicateOf).toBe('A');
  });

  it('un montant différent, même d\'un centime, n\'est pas un doublon', () => {
    const registre = new DossierRegistry();
    registre.enregistrer('A', valeurs(base));
    expect(registre.enregistrer('B', valeurs({ ...base, montant_facture: 180.01 })).alerts).toEqual([]);
  });

  it('une date différente n\'est pas un doublon', () => {
    const registre = new DossierRegistry();
    registre.enregistrer('A', valeurs(base));
    expect(registre.enregistrer('B', valeurs({ ...base, date_soins: '2026-03-13' })).alerts).toEqual([]);
  });

  it('un bénéficiaire différent n\'est pas un doublon', () => {
    const registre = new DossierRegistry();
    registre.enregistrer('A', valeurs(base));
    expect(registre.enregistrer('B', valeurs({ ...base, beneficiaire: 'Hugo BERNARD' })).alerts).toEqual([]);
  });

  it('une information manquante : non comparable, aucune alerte, rien de deviné', () => {
    const registre = new DossierRegistry();
    registre.enregistrer('A', valeurs(base));
    const r = registre.enregistrer('B', valeurs({ ...base, montant_facture: null }));
    expect(r).toEqual({ comparable: false, duplicateOf: null, alerts: [] });
  });

  it('la référence renvoyée est toujours celle du premier dossier déposé', () => {
    const registre = new DossierRegistry();
    registre.enregistrer('A', valeurs(base));
    registre.enregistrer('B', valeurs(base));
    expect(registre.enregistrer('C', valeurs(base)).duplicateOf).toBe('A');
  });

  it('chaque registre est indépendant', () => {
    new DossierRegistry().enregistrer('A', valeurs(base));
    expect(new DossierRegistry().enregistrer('B', valeurs(base)).alerts).toEqual([]);
  });
});