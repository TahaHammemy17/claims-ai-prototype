import { readFileSync } from 'fs';
import { join } from 'path';
import { controlerDates } from '../src/controls/dates';
import { mergeExtractions } from '../src/dossier';
import { parseDate } from '../src/extraction';
import { processDocument } from '../src/pipeline';

const SAMPLES = join(__dirname, '..', 'samples');
const attendus: any[] = JSON.parse(readFileSync(join(SAMPLES, 'resultats-attendus.json'), 'utf-8'));

/** Date de soins extraite d'un fichier, et date de dépôt lue dans les résultats attendus. */
async function dossierDates(id: string) {
  const cas = attendus.find((c) => c.id === id);
  const results = [];
  for (const f of cas.fichiers.filter((x: string) => x.endsWith('.pdf'))) {
    const r = await processDocument(readFileSync(join(SAMPLES, f)), f);
    if (r.extraction) results.push(r.extraction);
  }
  const d = mergeExtractions(results);
  return { date_soins: d.date_soins as string | null, date_depot: cas.date_depot as string };
}

describe('US-07 : contrôle des dates (RG-03) sur le jeu de test', () => {
  it('TC-08 : soins le 2026-12-15, dépôt le 2026-10-05 -> DATE_INCOHERENTE', async () => {
    const d = await dossierDates('TC-08');
    expect(d).toEqual({ date_soins: '2026-12-15', date_depot: '2026-10-05' });
    expect(controlerDates(d)).toEqual({ comparable: true, alerts: ['DATE_INCOHERENTE'] });
  });

  it('TC-01 : soins avant le dépôt -> aucune alerte', async () => {
    const d = await dossierDates('TC-01');
    expect(controlerDates(d)).toEqual({ comparable: true, alerts: [] });
  });
});

describe('US-07 : cas limites', () => {
  it('un soin du jour même du dépôt est accepté', () => {
    expect(controlerDates({ date_soins: '2026-10-05', date_depot: '2026-10-05' }).alerts).toEqual([]);
  });

  it('un soin le lendemain du dépôt est incohérent', () => {
    expect(controlerDates({ date_soins: '2026-10-06', date_depot: '2026-10-05' }).alerts).toEqual(['DATE_INCOHERENTE']);
  });

  it('compare correctement à cheval sur deux années', () => {
    expect(controlerDates({ date_soins: '2026-12-31', date_depot: '2027-01-01' }).alerts).toEqual([]);
    expect(controlerDates({ date_soins: '2027-01-01', date_depot: '2026-12-31' }).alerts).toEqual(['DATE_INCOHERENTE']);
  });

  it('une date absente : non comparable, aucune alerte, rien de deviné', () => {
    expect(controlerDates({ date_soins: null, date_depot: '2026-10-05' })).toEqual({ comparable: false, alerts: [] });
    expect(controlerDates({ date_soins: '2026-10-05', date_depot: null })).toEqual({ comparable: false, alerts: [] });
  });

  it('une date impossible est signalée : 30 février, mois 13, 29 février d\'une année non bissextile', () => {
    for (const impossible of ['2026-02-30', '2026-13-01', '2027-02-29']) {
      expect(controlerDates({ date_soins: impossible, date_depot: '2027-06-01' })).toEqual({
        comparable: false,
        alerts: ['DATE_INVALIDE'],
      });
    }
  });

  it('le 29 février d\'une année bissextile est valide', () => {
    expect(controlerDates({ date_soins: '2028-02-29', date_depot: '2028-03-01' })).toEqual({ comparable: true, alerts: [] });
  });

  it('un format inattendu (JJ/MM/AAAA) est refusé plutôt que mal interprété', () => {
    expect(controlerDates({ date_soins: '12/03/2026', date_depot: '2026-03-15' }).alerts).toEqual(['DATE_INVALIDE']);
  });

  it('défense en profondeur : la lecture accepte 30/02, le contrôle la rattrape', () => {
    const lue = parseDate('30/02/2026');
    expect(lue).toBe('2026-02-30'); // parseDate ne vérifie que mois 1-12 et jour 1-31
    expect(controlerDates({ date_soins: lue, date_depot: '2026-06-01' }).alerts).toEqual(['DATE_INVALIDE']);
  });
});