import { CHAMPS_EVALUES, Evaluation, OBJECTIF_DETECTION, OBJECTIF_EXACTITUDE } from './evaluer';

const pct = (x: number) => `${Math.round(x * 1000) / 10} %`;
const val = (v: string | number | null) => (v === null ? '—' : String(v));
const ok = (b: boolean) => (b ? 'atteint' : 'non atteint');

/** Rapport de comparaison des extracteurs, en Markdown. Sans date : le rapport décrit le jeu de test. */
export function rapportMarkdown(evaluations: Evaluation[]): string {
  const L: string[] = [];
  L.push('# Comparaison des extracteurs (US-10)', '');
  L.push(
    `Jeu de test : ${evaluations[0]?.nombreDeCas ?? 0} dossiers fictifs, ${CHAMPS_EVALUES.length} champs mesurés par dossier.`,
    `Objectifs de la charte : exactitude ≥ ${pct(OBJECTIF_EXACTITUDE)} par champ, détection des anomalies ≥ ${pct(OBJECTIF_DETECTION)}.`,
    '',
  );

  L.push('## Vue d\'ensemble', '');
  L.push('| Extracteur | Valeurs attendues lues juste | Valeurs fausses (dont inventées) | Valeurs manquantes | Exactitude globale | Anomalies détectées | Fausses alarmes | Appels | Tokens (entrée / sortie) |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const e of evaluations) {
    const g = e.synthese.global;
    const a = e.synthese.alertes;
    const c = e.consommation;
    L.push(
      `| ${e.nom} | ${e.synthese.lecture.justes}/${e.synthese.lecture.attendues} (${pct(e.synthese.lecture.taux)}) | ${g.faux} (dont ${e.synthese.inventees}) | ${g.manquant} | ${pct(g.exactitude)} | ${a.detectees}/${a.attendues} (${pct(a.taux)}) | ${a.fausses_alarmes} | ${c ? c.appels : '—'} | ${c ? `${c.inputTokens} / ${c.outputTokens}` : '—'} |`,
    );
  }
  L.push(
    '',
    '*L\'exactitude globale compte aussi les cases « rien à trouver », faciles à réussir : le taux de lecture des valeurs réellement présentes est plus exigeant.*',
    '*Une valeur fausse est plus grave qu\'une valeur manquante : une valeur manquante se voit dans la file de validation, une valeur fausse peut passer inaperçue.*',
    '',
  );

  L.push('## Exactitude par champ', '');
  L.push(`| Champ | ${evaluations.map((e) => e.nom).join(' | ')} |`);
  L.push(`|---|${evaluations.map(() => '---').join('|')}|`);
  for (const champ of CHAMPS_EVALUES) {
    L.push(`| ${champ} | ${evaluations.map((e) => pct(e.synthese.parChamp[champ].exactitude)).join(' | ')} |`);
  }
  L.push('');

  L.push('## Objectifs de la charte', '');
  for (const e of evaluations) {
    const s = e.synthese;
    L.push(
      `- **${e.nom}** : exactitude par champ ${ok(s.objectifExactitudeAtteint)}` +
        (s.champsSousObjectif.length ? ` (sous l'objectif : ${s.champsSousObjectif.join(', ')})` : '') +
        ` · détection des anomalies ${ok(s.objectifDetectionAtteint)}`,
    );
  }
  L.push('');

  L.push('## Détail des écarts', '');
  for (const e of evaluations) {
    const ecarts = e.champs.filter((c) => c.verdict === 'faux' || c.verdict === 'manquant');
    const manquees = e.alertes.filter((a) => a.manquees.length > 0);
    const fausses = e.alertes.filter((a) => a.fausses.length > 0);
    L.push(`### ${e.nom}`, '');
    if (ecarts.length === 0 && manquees.length === 0 && fausses.length === 0) {
      L.push('Aucun écart sur ce jeu de test.', '');
      continue;
    }
    if (ecarts.length) {
      L.push('| Dossier | Champ | Attendu | Obtenu | Verdict |', '|---|---|---|---|---|');
      for (const c of ecarts) L.push(`| ${c.cas} | ${c.champ} | ${val(c.attendu)} | ${val(c.obtenu)} | ${c.verdict} |`);
      L.push('');
    }
    for (const a of manquees) L.push(`- Anomalie non détectée : ${a.cas} → ${a.manquees.join(', ')}`);
    for (const a of fausses) L.push(`- Fausse alarme : ${a.cas} → ${a.fausses.join(', ')}`);
    L.push('');
  }

  L.push('## Limites de cette évaluation', '');
  L.push(
    '- **Jeu de test minuscule et fictif** : une dizaine de dossiers générés par le même outil, à la mise en page régulière. Les résultats ne se généralisent pas à de vrais documents.',
    '- **Résultats attendus écrits par l\'auteur** : une erreur dans la référence fausse la mesure (une lacune a d\'ailleurs été corrigée au cours de cette étape).',
    '- **Une seule exécution par modèle** : un modèle d\'IA peut répondre différemment d\'une fois à l\'autre.',
    '- **Le type d\'acte n\'est pas mesuré** (texte libre) ; la lecture d\'images nettes n\'est pas comparée.',
    '- **La détection des anomalies dépend aussi du code de contrôle**, pas seulement de l\'extracteur.',
    '',
  );
  return L.join('\n');
}
