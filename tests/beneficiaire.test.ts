import { readFileSync } from 'fs';
import { join } from 'path';
import { Contrat, chargerContrat, chargerContratFichier } from '../src/contrat';
import { controlerBeneficiaire } from '../src/controls/beneficiaire';
import { cleNom } from '../src/controls/nom';
import { mergeExtractions } from '../src/dossier';
import { processDocument } from '../src/pipeline';

const SAMPLES = join(__dirname, '..', 'samples');
const contrat = chargerContratFichier(join(SAMPLES, 'contrat-fictif.json'));

async function beneficiaireDe(fichier: string): Promise<string | null> {
  const r = await processDocument(readFileSync(join(SAMPLES, fichier)), fichier);
  const d = mergeExtractions(r.extraction ? [r.extraction] : []);
  return typeof d.beneficiaire === 'string' ? d.beneficiaire : null;
}

describe('US-08 : contrôle du bénéficiaire (RG-04) sur le jeu de test', () => {
  it('TC-09 : Paul LEROY n\'est pas au contrat -> BENEFICIAIRE_INCONNU', async () => {
    expect(await beneficiaireDe('TC-09_facture_beneficiaire_inconnu.pdf')).toBe('Paul LEROY');
    const r = controlerBeneficiaire('Paul LEROY', contrat);
    expect(r).toEqual({ comparable: true, alerts: ['BENEFICIAIRE_INCONNU'] });
  });

  it('TC-01 : Léa BERNARD est au contrat -> aucune alerte', async () => {
    const nom = await beneficiaireDe('TC-01_facture_optique.pdf');
    expect(controlerBeneficiaire(nom, contrat)).toEqual({ comparable: true, alerts: [] });
  });

  it('TC-04 : Hugo BERNARD est au contrat -> aucune alerte', async () => {
    const nom = await beneficiaireDe('TC-04_decompte_RO_partiel.pdf');
    expect(controlerBeneficiaire(nom, contrat).alerts).toEqual([]);
  });
});

describe('US-08 : comparaison des noms', () => {
  it('ignore les accents, les majuscules et les espaces', () => {
    expect(controlerBeneficiaire('  LEA   bernard ', contrat).alerts).toEqual([]);
  });

  it('ignore l\'ordre nom / prénom', () => {
    expect(controlerBeneficiaire('BERNARD Léa', contrat).alerts).toEqual([]);
    expect(cleNom('BERNARD Léa')).toBe(cleNom('Léa BERNARD'));
  });

  it('ignore les tirets et les apostrophes', () => {
    expect(cleNom('Marie-Claire D\'Arcy')).toBe(cleNom('marie claire d arcy'));
  });

  it('limite connue : une initiale ou un surnom n\'est pas rapproché et déclenche l\'alerte (le gestionnaire tranche)', () => {
    expect(controlerBeneficiaire('L. BERNARD', contrat).alerts).toEqual(['BENEFICIAIRE_INCONNU']);
    expect(controlerBeneficiaire('Léa BERNAR', contrat).alerts).toEqual(['BENEFICIAIRE_INCONNU']);
  });

  it('un nom absent : non comparable, aucune alerte, rien de deviné', () => {
    expect(controlerBeneficiaire(null, contrat)).toEqual({ comparable: false, alerts: [] });
    expect(controlerBeneficiaire('   ', contrat)).toEqual({ comparable: false, alerts: [] });
  });

  it('un homonyme partiel n\'est pas accepté : Léa seule ne suffit pas', () => {
    expect(controlerBeneficiaire('Léa', contrat).alerts).toEqual(['BENEFICIAIRE_INCONNU']);
  });
});

describe('US-08 : chargement du contrat', () => {
  const valide: Contrat = { contrat_id: 'C-1', beneficiaires: ['Léa BERNARD'] };

  it('accepte un contrat valide', () => {
    expect(chargerContrat(valide)).toEqual(valide);
  });

  it('refuse un contrat sans bénéficiaire (il rejetterait tout le monde)', () => {
    expect(() => chargerContrat({ contrat_id: 'C-1', beneficiaires: [] })).toThrow(/au moins un bénéficiaire/);
    expect(() => chargerContrat({ contrat_id: 'C-1' })).toThrow(/au moins un bénéficiaire/);
  });

  it('refuse un contrat mal formé', () => {
    expect(() => chargerContrat(null)).toThrow(/objet attendu/);
    expect(() => chargerContrat({ beneficiaires: ['A B'] })).toThrow(/contrat_id/);
    expect(() => chargerContrat({ contrat_id: 'C', beneficiaires: ['A B', ''] })).toThrow(/nom non vide/);
    expect(() => chargerContrat({ contrat_id: 'C', beneficiaires: [42] })).toThrow(/nom non vide/);
  });
});
