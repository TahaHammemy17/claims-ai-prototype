import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { chargerContratFichier } from '../contrat';
import { creerExtracteur } from '../extraction';
import { CasAttendu, evaluer } from './evaluer';

const RACINE = join(__dirname, '..', '..');
const SAMPLES = join(RACINE, 'samples');
const SORTIE = join(RACINE, 'docs', 'evaluation', 'resultats');

function argument(nom: string): string | undefined {
  const i = process.argv.indexOf(nom);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const nom = argument('--nom');
  if (!nom) {
    console.error('Usage : npx ts-node src/evaluation/cli.ts --nom "Regles"');
    process.exit(1);
  }
  const cas: CasAttendu[] = JSON.parse(readFileSync(join(SAMPLES, 'resultats-attendus.json'), 'utf-8'));
  const extracteur = creerExtracteur();
  const evaluation = await evaluer({
    nom,
    cas,
    lireFichier: (f) => readFileSync(join(SAMPLES, f)),
    extracteur,
    garantiePct: 150,
    contrat: chargerContratFichier(join(SAMPLES, 'contrat-fictif.json')),
  });

  mkdirSync(SORTIE, { recursive: true });
  const fichier = join(SORTIE, `${nom.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.json`);
  writeFileSync(fichier, JSON.stringify(evaluation, null, 2) + '\n', 'utf-8');

  const g = evaluation.synthese.global;
  const a = evaluation.synthese.alertes;
  console.log(`\n${nom} (${evaluation.extracteur}) sur ${evaluation.nombreDeCas} dossiers`);
  console.log(`  Valeurs attendues lues juste : ${evaluation.synthese.lecture.justes}/${evaluation.synthese.lecture.attendues} (${Math.round(evaluation.synthese.lecture.taux * 1000) / 10} %)  · inventées : ${evaluation.synthese.inventees}`);
  console.log(`  Exactitude globale : ${Math.round(g.exactitude * 1000) / 10} %  (correct ${g.correct}, absence correcte ${g.absence_correcte}, manquant ${g.manquant}, faux ${g.faux})`);
  console.log(`  Anomalies détectées : ${a.detectees}/${a.attendues}  · fausses alarmes : ${a.fausses_alarmes}`);
  if (evaluation.consommation) console.log(`  Consommation : ${JSON.stringify(evaluation.consommation)}`);
  console.log(`  Résultat enregistré : ${fichier}\n`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
