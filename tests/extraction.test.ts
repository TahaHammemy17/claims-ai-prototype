import { readFileSync } from 'fs';
import { join } from 'path';
import { LocalPdfExtractor, parseAmount, parseDate, FieldName } from '../src/extraction';

const SAMPLES = join(__dirname, '..', 'samples');
const expected: any[] = JSON.parse(readFileSync(join(SAMPLES, 'resultats-attendus.json'), 'utf-8'));
const extractor = new LocalPdfExtractor();

const run = (file: string) => extractor.extract(readFileSync(join(SAMPLES, file)), file);

/** Fusionne les champs trouvés sur tous les documents d'un dossier. */
async function extractDossier(id: string) {
  const dossier = expected.find((c) => c.id === id);
  const merged: Partial<Record<FieldName, string | number | null>> = {};
  for (const f of dossier.fichiers.filter((x: string) => x.endsWith('.pdf'))) {
    const r = await run(f);
    for (const [k, v] of Object.entries(r.fields)) {
      if (v.status === 'extracted') merged[k as FieldName] = v.value;
    }
  }
  return { dossier, merged };
}

describe('Fonctions de lecture', () => {
  it('lit les montants français', () => {
    expect(parseAmount('180,00 €')).toBe(180);
    expect(parseAmount('1 234,50 €')).toBe(1234.5);
    expect(parseAmount('abc')).toBeNull();
  });
   it('lit un montant avec centimes (12,50 €)', () => {
    expect(parseAmount('12,50 €')).toBe(12.5);
  });
  it('lit les dates JJ/MM/AAAA', () => {
    expect(parseDate('12/03/2026')).toBe('2026-03-12');
    expect(parseDate('pas une date')).toBeNull();
  });
});

describe('US-02 : extraction des champs (critères d\'acceptation)', () => {
  const STRICT: FieldName[] = ['beneficiaire', 'date_soins', 'montant_facture', 'base_remboursement', 'taux_RO', 'montant_RO'];

  it.each(['TC-01', 'TC-03', 'TC-04'])('%s : champs conformes aux résultats attendus', async (id) => {
    const { dossier, merged } = await extractDossier(id);
    for (const f of STRICT) {
      if (f in dossier.extraction) {
        expect(merged[f]).toEqual(dossier.extraction[f]);
      }
    }
    // Le type d'acte doit être présent (texte libre, non comparé strictement).
    expect(typeof merged.type_acte).toBe('string');
  });

  it('un champ introuvable est marqué "missing" et non deviné', async () => {
    const r = await run('TC-01_facture_optique.pdf');
    expect(r.fields.montant_RO).toEqual({ status: 'missing', value: null });
    expect(r.fields.taux_RO).toEqual({ status: 'missing', value: null });
  });

  it('un document hors sujet ne produit aucune valeur inventée (TC-10)', async () => {
    const r = await run('TC-10_hors_sujet.pdf');
    for (const f of Object.values(r.fields)) {
      expect(f).toEqual({ status: 'missing', value: null });
    }
  });

  it('une image est hors périmètre de US-02 : tous les champs manquants (TC-05)', async () => {
    const r = await run('TC-05_document_illisible.png');
    for (const f of Object.values(r.fields)) {
      expect(f.status).toBe('missing');
    }
  });
});
