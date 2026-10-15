import { readFileSync } from 'fs';
import { basename } from 'path';
import { LocalPdfExtractor, classifyDocument, isEligibleForRefund } from './extraction';

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage : npm run extract -- samples/TC-03_decompte_RO.pdf');
    process.exit(1);
  }
  const buffer = readFileSync(file);
  const documentType = await classifyDocument(buffer);
  const extraction = await new LocalPdfExtractor().extract(buffer, basename(file));
  console.log(
    JSON.stringify(
      { documentType, eligibleAuRemboursement: isEligibleForRefund(documentType), ...extraction },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});