import { readFileSync } from 'fs';
import { basename } from 'path';
import { LocalPdfExtractor } from './extraction';

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage : npm run extract -- samples/TC-03_decompte_RO.pdf');
    process.exit(1);
  }
  const result = await new LocalPdfExtractor().extract(readFileSync(file), basename(file));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
