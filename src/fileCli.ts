import { readFileSync } from 'fs';
import { join } from 'path';
import { chargerContratFichier } from './contrat';
import { DossierRegistry } from './controls/doublon';
import { construireDossier } from './validation/dossier';
import { FileDeValidation } from './validation/file';

const SAMPLES = join(__dirname, '..', 'samples');
const GARANTIE = 150; // contrat fictif : consultation de spécialiste à 150 % de la base

async function main() {
  const cas: any[] = JSON.parse(readFileSync(join(SAMPLES, 'resultats-attendus.json'), 'utf-8'));
  const contrat = chargerContratFichier(join(SAMPLES, 'contrat-fictif.json'));
  const registre = new DossierRegistry();
  const file = new FileDeValidation();

  for (const c of cas) {
    file.ajouter(
      await construireDossier({
        reference: c.id,
        fichiers: c.fichiers.map((nom: string) => ({ nom, contenu: readFileSync(join(SAMPLES, nom)) })),
        dateDepot: c.date_depot,
        garantiePct: GARANTIE,
        registre,
        contrat,
      }),
    );
  }

  console.log(`\nFILE DE VALIDATION : ${file.lister().length} dossiers à valider\n`);
  for (const d of file.lister()) {
    console.log(`━━ ${d.reference} · ${d.statut} · déposé le ${d.date_depot}`);
    console.log(`   Documents : ${d.documents.map((x) => `${x.fichier} (${x.type})`).join(', ')}`);
    const c = d.champs;
    console.log(`   Champs    : ${c.beneficiaire ?? '—'} · soins ${c.date_soins ?? '—'} · facturé ${c.montant_facture ?? '—'} € · RO ${c.montant_RO ?? '—'} €`);
    if (d.calcul) console.log(`   Calcul    : plafond ${d.calcul.plafond_total} € · mutuelle ${d.calcul.montant_RC} € · reste à charge ${d.calcul.reste_a_charge} €`);
    if (d.champsEssentielsManquants.length) console.log(`   MANQUANT  : ${d.champsEssentielsManquants.join(', ')}`);
    if (d.alertes.length === 0) console.log('   Alertes   : aucune');
    for (const a of d.alertes) console.log(`   ⚠ ${a.libelle} [${a.regle}]`);
    console.log('');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
