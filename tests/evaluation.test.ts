import { readFileSync } from 'fs';
import { join } from 'path';
import { chargerContratFichier } from '../src/contrat';
import { LocalPdfExtractor } from '../src/extraction';
import {
  CasAttendu,
  ResultatChamp,
  comparerAlertes,
  evaluer,
  synthetiser,
  verdictChamp,
} from '../src/evaluation/evaluer';
import { rapportMarkdown } from '../src/evaluation/rapport';

const SAMPLES = join(__dirname, '..', 'samples');

describe('US-10 : verdict par champ', () => {
  it('distingue correct, manquant, faux et absence correcte', () => {
    expect(verdictChamp(180, 180)).toBe('correct');
    expect(verdictChamp('Léa BERNARD', 'Léa BERNARD')).toBe('correct');
    expect(verdictChamp(180, null)).toBe('manquant');
    expect(verdictChamp(180, 70)).toBe('faux');
    expect(verdictChamp(null, null)).toBe('absence_correcte');
  });

  it('une valeur donnée alors que rien n\'était attendu est fausse (inventée)', () => {
    expect(verdictChamp(null, 30)).toBe('faux');
  });

  it('la comparaison est stricte : un accent perdu est une erreur', () => {
    expect(verdictChamp('Léa BERNARD', 'Lea BERNARD')).toBe('faux');
  });
});

describe('US-10 : comparaison des alertes', () => {
  it('détecte, manque, et signale les fausses alarmes', () => {
    const r = comparerAlertes('X', ['DOUBLON', 'DATE_INCOHERENTE'], ['DOUBLON', 'ILLISIBLE']);
    expect(r.detectees).toEqual(['DOUBLON']);
    expect(r.manquees).toEqual(['DATE_INCOHERENTE']);
    expect(r.fausses).toEqual(['ILLISIBLE']);
  });

  it('ignore les alertes d\'information qui ne sont pas des anomalies surveillées', () => {
    const r = comparerAlertes('X', [], ['NON_RECONNU', 'DEVIS_NON_ELIGIBLE']);
    expect(r).toEqual({ cas: 'X', attendues: [], detectees: [], manquees: [], fausses: [] });
  });
});

describe('US-10 : synthèse et objectifs de la charte', () => {
  const champ = (cas: string, nom: string, attendu: any, obtenu: any): ResultatChamp => ({
    cas, champ: nom, attendu, obtenu, verdict: verdictChamp(attendu, obtenu),
  });

  it('calcule exactitude, lecture et valeurs inventées sur un cas construit à la main', () => {
    const champs = [
      champ('A', 'montant_facture', 100, 100),   // correct
      champ('B', 'montant_facture', 100, null),  // manquant
      champ('C', 'montant_facture', 100, 90),    // faux (valeur lue)
      champ('D', 'montant_facture', null, null), // absence correcte
      champ('E', 'montant_facture', null, 30),   // faux (inventée)
    ];
    const s = synthetiser(champs, []);
    expect(s.parChamp.montant_facture).toMatchObject({ correct: 1, manquant: 1, faux: 2, absence_correcte: 1 });
    expect(s.parChamp.montant_facture.exactitude).toBeCloseTo(2 / 5);
    expect(s.lecture).toEqual({ attendues: 3, justes: 1, taux: 1 / 3 });
    expect(s.inventees).toBe(1);
    expect(s.objectifExactitudeAtteint).toBe(false);
    expect(s.champsSousObjectif).toContain('montant_facture');
  });

  it('l\'objectif de détection est de 95 % : 4 sur 5 ne suffit pas', () => {
    const detecte = (n: number) => Array.from({ length: 5 }, (_, i) => comparerAlertes(`C${i}`, ['DOUBLON'], i < n ? ['DOUBLON'] : []));
    expect(synthetiser([], detecte(4)).objectifDetectionAtteint).toBe(false);
    expect(synthetiser([], detecte(5)).objectifDetectionAtteint).toBe(true);
  });
});

describe('US-10 : évaluation réelle de l\'extracteur à règles sur le jeu de test', () => {
  const cas: CasAttendu[] = JSON.parse(readFileSync(join(SAMPLES, 'resultats-attendus.json'), 'utf-8'));
  let evaluation: Awaited<ReturnType<typeof evaluer>>;

  beforeAll(async () => {
    evaluation = await evaluer({
      nom: 'Regles',
      cas,
      lireFichier: (f) => readFileSync(join(SAMPLES, f)),
      extracteur: new LocalPdfExtractor(),
      garantiePct: 150,
      contrat: chargerContratFichier(join(SAMPLES, 'contrat-fictif.json')),
    });
  });

  it('mesure les 10 dossiers sur 6 champs', () => {
    expect(evaluation.nombreDeCas).toBe(10);
    expect(evaluation.champs).toHaveLength(60);
  });

  it('TC-01 : tous les champs corrects', () => {
    const tc01 = evaluation.champs.filter((c) => c.cas === 'TC-01');
    expect(tc01.every((c) => c.verdict === 'correct' || c.verdict === 'absence_correcte')).toBe(true);
  });

  it('les règles ne lisent pas le devis TC-02 (libellés différents) : 3 champs manquants, aucun faux', () => {
    const ecarts = evaluation.champs.filter((c) => c.verdict !== 'correct' && c.verdict !== 'absence_correcte');
    expect(ecarts.map((c) => `${c.cas}:${c.champ}:${c.verdict}`).sort()).toEqual([
      'TC-02:beneficiaire:manquant',
      'TC-02:date_soins:manquant',
      'TC-02:montant_facture:manquant',
    ]);
    expect(evaluation.synthese.global.faux).toBe(0);
    expect(evaluation.synthese.inventees).toBe(0);
  });

  it('détecte les anomalies TC-05, TC-06, TC-07, TC-08 et TC-09, sans fausse alarme', () => {
    const detectees = evaluation.alertes.filter((a) => a.detectees.length > 0).map((a) => a.cas);
    expect(detectees).toEqual(['TC-05', 'TC-06', 'TC-07', 'TC-08', 'TC-09']);
    expect(evaluation.synthese.alertes.fausses_alarmes).toBe(0);
  });

  it('objectif de la charte atteint : 5 anomalies sur 5 détectées, dont TC-09 grâce à RG-04 (US-08)', () => {
    expect(evaluation.synthese.alertes).toMatchObject({ attendues: 5, detectees: 5, taux: 1 });
    expect(evaluation.synthese.objectifDetectionAtteint).toBe(true);
  });

  it('le rapport contient le tableau comparatif, les écarts et les limites, sans date de génération', () => {
    const md = rapportMarkdown([evaluation]);
    expect(md).toContain('# Comparaison des extracteurs');
    expect(md).toContain('| Regles |');
    expect(md).toContain('TC-02');
    expect(md).toContain('Limites de cette évaluation');
    expect(md).not.toMatch(/généré le|date de génération/i);
  });
});
