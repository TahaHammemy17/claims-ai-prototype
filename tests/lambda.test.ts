import { readFileSync } from 'fs';
import { join } from 'path';
import { ConverseCommandInput } from '@aws-sdk/client-bedrock-runtime';
import { BedrockExtractor, ClientModele, DocumentExtractor, LocalPdfExtractor } from '../src/extraction';
import { EvenementS3, StockageS3, TAILLE_MAX_OCTETS, creerHandler } from '../src/lambda/handler';

const SAMPLES = join(__dirname, '..', 'samples');
const lire = (f: string) => readFileSync(join(SAMPLES, f));
const BUCKET = 'bucket-test';

/** Faux S3 en mémoire, qui garde la trace des lectures et des écritures. */
function fauxS3(contenus: Record<string, Buffer>) {
  const ecrits = new Map<string, string>();
  const lus: string[] = [];
  const stockage: StockageS3 = {
    async lire(_bucket, cle) {
      lus.push(cle);
      if (!(cle in contenus)) throw new Error(`absent : ${cle}`);
      return contenus[cle];
    },
    async ecrire(_bucket, cle, contenu) {
      ecrits.set(cle, contenu);
    },
  };
  return { stockage, ecrits, lus };
}

const evenement = (...cles: Array<{ key: string; size?: number }>): EvenementS3 => ({
  Records: cles.map((c) => ({ s3: { bucket: { name: BUCKET }, object: { key: c.key, size: c.size } } })),
});

describe('Lambda : traitement d\'un document déposé dans S3', () => {
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('lit entrees/<fichier> et écrit sorties/<fichier>.json', async () => {
    const { stockage, ecrits } = fauxS3({ 'entrees/TC-01_facture_optique.pdf': lire('TC-01_facture_optique.pdf') });
    const bilan = await creerHandler({ stockage, extracteur: new LocalPdfExtractor() })(evenement({ key: 'entrees/TC-01_facture_optique.pdf' }));

    expect(bilan).toEqual({ traites: 1, ignores: 0, erreurs: 0 });
    const sortie = JSON.parse(ecrits.get('sorties/TC-01_facture_optique.pdf.json')!);
    expect(sortie.documentType).toBe('facture');
    expect(sortie.extraction.fields.montant_facture.value).toBe(180);
    expect(sortie.entree).toBe('entrees/TC-01_facture_optique.pdf');
  });

  it('décode les clés S3 (espaces en "+", caractères accentués en %XX)', async () => {
    const { stockage, ecrits } = fauxS3({ 'entrees/Facture Léa.pdf': lire('TC-01_facture_optique.pdf') });
    await creerHandler({ stockage, extracteur: new LocalPdfExtractor() })(evenement({ key: 'entrees/Facture+L%C3%A9a.pdf' }));
    expect([...ecrits.keys()]).toEqual(['sorties/Facture Léa.pdf.json']);
  });

  it('ignore tout ce qui n\'est pas sous entrees/ : jamais de boucle sur ses propres sorties', async () => {
    const { stockage, ecrits, lus } = fauxS3({});
    const bilan = await creerHandler({ stockage, extracteur: new LocalPdfExtractor() })(
      evenement({ key: 'sorties/TC-01.pdf.json' }, { key: 'autre/doc.pdf' }, { key: 'entrees/' }),
    );
    expect(bilan).toEqual({ traites: 0, ignores: 3, erreurs: 0 });
    expect(lus).toEqual([]);
    expect(ecrits.size).toBe(0);
  });

  it('refuse un fichier trop volumineux sans même le lire', async () => {
    const { stockage, ecrits, lus } = fauxS3({ 'entrees/gros.pdf': Buffer.from('x') });
    const bilan = await creerHandler({ stockage, extracteur: new LocalPdfExtractor() })(
      evenement({ key: 'entrees/gros.pdf', size: TAILLE_MAX_OCTETS + 1 }),
    );
    expect(bilan.erreurs).toBe(1);
    expect(lus).toEqual([]);
    expect(JSON.parse(ecrits.get('sorties/gros.pdf.erreur.json')!).erreur).toBe('FichierTropVolumineux');
  });

  it('une erreur est consignée sans fuite de détail, et la fonction ne plante pas (pas de relance payante)', async () => {
    const secret = 'User: arn:aws:sts::123456789012:assumed-role/x is not authorized';
    const extracteurEnPanne: DocumentExtractor = {
      async extract() {
        throw Object.assign(new Error(secret), { name: 'AccessDeniedException' });
      },
    };
    const { stockage, ecrits } = fauxS3({ 'entrees/a.pdf': lire('TC-01_facture_optique.pdf') });
    const erreurConsole = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const bilan = await creerHandler({ stockage, extracteur: extracteurEnPanne })(evenement({ key: 'entrees/a.pdf' }));

    expect(bilan.erreurs).toBe(1);
    const fichier = ecrits.get('sorties/a.pdf.erreur.json')!;
    expect(JSON.parse(fichier).erreur).toBe('AccessDeniedException');
    expect(fichier).not.toContain('123456789012');
    expect(erreurConsole.mock.calls[0][0]).toContain('AccessDeniedException'); // le détail reste dans les journaux
  });

  it('une image floue : alerte ILLISIBLE, le modèle n\'est jamais appelé', async () => {
    let appels = 0;
    const compteur: DocumentExtractor = { async extract() { appels += 1; throw new Error('ne doit pas être appelé'); } };
    const { stockage, ecrits } = fauxS3({ 'entrees/flou.png': lire('TC-05_document_illisible.png') });
    await creerHandler({ stockage, extracteur: compteur })(evenement({ key: 'entrees/flou.png' }));
    expect(appels).toBe(0);
    const sortie = JSON.parse(ecrits.get('sorties/flou.png.json')!);
    expect(sortie.alerts).toEqual(['ILLISIBLE']);
    expect(sortie.extraction).toBeNull();
  });

  it('traite plusieurs enregistrements et en donne le bilan', async () => {
    const { stockage, ecrits } = fauxS3({
      'entrees/a.pdf': lire('TC-01_facture_optique.pdf'),
      'entrees/b.pdf': lire('TC-03_decompte_RO.pdf'),
    });
    const bilan = await creerHandler({ stockage, extracteur: new LocalPdfExtractor() })(
      evenement({ key: 'entrees/a.pdf' }, { key: 'entrees/b.pdf' }, { key: 'sorties/x.json' }),
    );
    expect(bilan).toEqual({ traites: 2, ignores: 1, erreurs: 0 });
    expect(JSON.parse(ecrits.get('sorties/b.pdf.json')!).documentType).toBe('decompte');
  });

  it('la consommation est celle de chaque document, même si la fonction reste « chaude » entre deux appels', async () => {
    const client: ClientModele = {
      async converse(_r: ConverseCommandInput) {
        return { texte: JSON.stringify({ beneficiaire: 'Léa BERNARD', montant_facture: 180 }), inputTokens: 500, outputTokens: 100 };
      },
    };
    const extracteur = new BedrockExtractor(client, { modelId: 'amazon.nova-lite-v1:0' });
    const { stockage, ecrits } = fauxS3({ 'entrees/a.pdf': lire('TC-01_facture_optique.pdf'), 'entrees/b.pdf': lire('TC-01_facture_optique.pdf') });
    const handler = creerHandler({ stockage, extracteur });
    await handler(evenement({ key: 'entrees/a.pdf' }));
    await handler(evenement({ key: 'entrees/b.pdf' }));
    expect(JSON.parse(ecrits.get('sorties/a.pdf.json')!).consommation).toEqual({ appels: 1, inputTokens: 500, outputTokens: 100 });
    expect(JSON.parse(ecrits.get('sorties/b.pdf.json')!).consommation).toEqual({ appels: 1, inputTokens: 500, outputTokens: 100 });
  });
});
