import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Evaluation } from './evaluer';
import { rapportMarkdown } from './rapport';

const DOSSIER = join(__dirname, '..', '..', 'docs', 'evaluation');
const RESULTATS = join(DOSSIER, 'resultats');

const evaluations: Evaluation[] = readdirSync(RESULTATS)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(RESULTATS, f), 'utf-8')));

if (evaluations.length === 0) {
  console.error('Aucun résultat dans docs/evaluation/resultats. Lance d\'abord src/evaluation/cli.ts.');
  process.exit(1);
}
const sortie = join(DOSSIER, 'comparaison.md');
writeFileSync(sortie, rapportMarkdown(evaluations), 'utf-8');
console.log(`Rapport écrit : ${sortie} (${evaluations.length} extracteur(s))`);
