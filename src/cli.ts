import { readFileSync } from 'fs';
import { basename } from 'path';
import { BedrockExtractor, creerExtracteur } from './extraction';
import { processDocument } from './pipeline';

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage : npm run extract -- samples/TC-03_decompte_RO.pdf');
    process.exit(1);
  }
  const extracteur = creerExtracteur();
  const result = await processDocument(readFileSync(file), basename(file), extracteur);
  console.log(JSON.stringify({ extracteur: extracteur.constructor.name, ...result }, null, 2));
  if (extracteur instanceof BedrockExtractor) console.error('Consommation Bedrock :', extracteur.consommation);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
