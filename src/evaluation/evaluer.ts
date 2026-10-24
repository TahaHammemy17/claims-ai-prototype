import { Contrat } from '../contrat';
import { DossierRegistry } from '../controls/doublon';
import { BedrockExtractor, DocumentExtractor, FieldName } from '../extraction';
import { construireDossier } from '../validation/dossier';

/** Champs mesurés. Le type d'acte est du texte libre : il n'est pas comparé strictement. */
export const CHAMPS_EVALUES: FieldName[] = [
  'beneficiaire',
  'date_soins',
  'montant_facture',
  'base_remboursement',
  'taux_RO',
  'montant_RO',
];

/** Anomalies que le système doit détecter (voir resultats-attendus.json). */
export const ALERTES_SURVEILLEES = ['ILLISIBLE', 'INCOHERENCE_MONTANT', 'DOUBLON', 'DATE_INCOHERENTE', 'BENEFICIAIRE_INCONNU'];

/** Objectifs de la charte projet. */
export const OBJECTIF_EXACTITUDE = 0.9;
export const OBJECTIF_DETECTION = 0.95;

type Valeur = string | number | null;

export interface CasAttendu {
  id: string;
  fichiers: string[];
  date_depot: string;
  extraction: Record<string, unknown> | null;
  alertes: string[];
}

/**
 * correct = bonne valeur · manquant = valeur attendue mais non trouvée · faux = mauvaise valeur,
 * ou valeur là où il n'y en a pas (donc inventée) · absence_correcte = rien attendu, rien trouvé.
 */
export type Verdict = 'correct' | 'manquant' | 'faux' | 'absence_correcte';

export function verdictChamp(attendu: Valeur, obtenu: Valeur): Verdict {
  if (attendu === null) return obtenu === null ? 'absence_correcte' : 'faux';
  if (obtenu === null) return 'manquant';
  return obtenu === attendu ? 'correct' : 'faux';
}

export interface ResultatChamp {
  cas: string;
  champ: string;
  attendu: Valeur;
  obtenu: Valeur;
  verdict: Verdict;
}

export interface ResultatAlertes {
  cas: string;
  attendues: string[];
  detectees: string[];
  manquees: string[];
  fausses: string[];
}

/** Compare les alertes attendues et obtenues, en ne gardant que les anomalies surveillées. */
export function comparerAlertes(cas: string, attendues: string[], obtenues: string[]): ResultatAlertes {
  const garde = (liste: string[]) => [...new Set(liste.filter((a) => ALERTES_SURVEILLEES.includes(a)))];
  const att = garde(attendues);
  const obt = garde(obtenues);
  return {
    cas,
    attendues: att,
    detectees: att.filter((a) => obt.includes(a)),
    manquees: att.filter((a) => !obt.includes(a)),
    fausses: obt.filter((a) => !att.includes(a)),
  };
}

export interface StatsChamp {
  correct: number;
  manquant: number;
  faux: number;
  absence_correcte: number;
  /** (correct + absence correcte) / total : part des réponses justes, y compris « rien à trouver ». */
  exactitude: number;
}

export interface Synthese {
  parChamp: Record<string, StatsChamp>;
  global: StatsChamp;
  /** Parmi les valeurs réellement présentes dans les documents : combien lues juste. */
  lecture: { attendues: number; justes: number; taux: number };
  /** Valeurs données alors que rien n'était attendu : des valeurs inventées. */
  inventees: number;
  alertes: { attendues: number; detectees: number; taux: number; fausses_alarmes: number };
  champsSousObjectif: string[];
  objectifExactitudeAtteint: boolean;
  objectifDetectionAtteint: boolean;
}

function stats(resultats: ResultatChamp[]): StatsChamp {
  const compte = (v: Verdict) => resultats.filter((r) => r.verdict === v).length;
  const correct = compte('correct');
  const absence = compte('absence_correcte');
  return {
    correct,
    manquant: compte('manquant'),
    faux: compte('faux'),
    absence_correcte: absence,
    exactitude: resultats.length === 0 ? 0 : (correct + absence) / resultats.length,
  };
}

export function synthetiser(champs: ResultatChamp[], alertes: ResultatAlertes[]): Synthese {
  const parChamp: Record<string, StatsChamp> = {};
  for (const nom of CHAMPS_EVALUES) parChamp[nom] = stats(champs.filter((c) => c.champ === nom));
  const attendues = alertes.reduce((s, a) => s + a.attendues.length, 0);
  const detectees = alertes.reduce((s, a) => s + a.detectees.length, 0);
  const taux = attendues === 0 ? 1 : detectees / attendues;
  const attenduesLecture = champs.filter((c) => c.attendu !== null);
  const justes = attenduesLecture.filter((c) => c.verdict === 'correct').length;
  const sous = CHAMPS_EVALUES.filter((n) => parChamp[n].exactitude < OBJECTIF_EXACTITUDE);
  return {
    parChamp,
    global: stats(champs),
    lecture: { attendues: attenduesLecture.length, justes, taux: attenduesLecture.length === 0 ? 1 : justes / attenduesLecture.length },
    inventees: champs.filter((c) => c.attendu === null && c.obtenu !== null).length,
    alertes: { attendues, detectees, taux, fausses_alarmes: alertes.reduce((s, a) => s + a.fausses.length, 0) },
    champsSousObjectif: sous,
    objectifExactitudeAtteint: sous.length === 0,
    objectifDetectionAtteint: taux >= OBJECTIF_DETECTION,
  };
}

export interface Evaluation {
  nom: string;
  extracteur: string;
  nombreDeCas: number;
  champs: ResultatChamp[];
  alertes: ResultatAlertes[];
  consommation: { appels: number; inputTokens: number; outputTokens: number } | null;
  synthese: Synthese;
}

const valeur = (v: unknown): Valeur => (typeof v === 'string' || typeof v === 'number' ? v : null);

/** Fait passer tous les dossiers du jeu de test dans le système complet, avec l'extracteur donné. */
export async function evaluer(params: {
  nom: string;
  cas: CasAttendu[];
  lireFichier: (nom: string) => Buffer;
  extracteur: DocumentExtractor;
  garantiePct: number;
  contrat?: Contrat;
}): Promise<Evaluation> {
  const { nom, cas, lireFichier, extracteur, garantiePct, contrat } = params;
  const registre = new DossierRegistry();
  const champs: ResultatChamp[] = [];
  const alertes: ResultatAlertes[] = [];

  for (const c of cas) {
    const dossier = await construireDossier({
      reference: c.id,
      fichiers: c.fichiers.map((f) => ({ nom: f, contenu: lireFichier(f) })),
      dateDepot: c.date_depot,
      garantiePct,
      registre,
      extracteur,
      contrat,
    });
    for (const champ of CHAMPS_EVALUES) {
      const attendu = valeur(c.extraction?.[champ]);
      const obtenu = valeur(dossier.champs[champ]);
      champs.push({ cas: c.id, champ, attendu, obtenu, verdict: verdictChamp(attendu, obtenu) });
    }
    alertes.push(comparerAlertes(c.id, c.alertes, dossier.alertes.map((a) => a.code)));
  }

  return {
    nom,
    extracteur: extracteur.constructor.name,
    nombreDeCas: cas.length,
    champs,
    alertes,
    consommation: extracteur instanceof BedrockExtractor ? { ...extracteur.consommation } : null,
    synthese: synthetiser(champs, alertes),
  };
}
