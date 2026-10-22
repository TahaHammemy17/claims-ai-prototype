import { readFileSync } from 'fs';
import { join } from 'path';
import { ConverseCommandInput } from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockExtractor,
  ClientModele,
  LocalPdfExtractor,
  PROMPT,
  construireRequete,
  creerExtracteur,
  interpreterReponse,
} from '../src/extraction';
import { processDocument } from '../src/pipeline';

const SAMPLES = join(__dirname, '..', 'samples');
const lire = (f: string) => readFileSync(join(SAMPLES, f));
const MODELE = 'amazon.nova-lite-v1:0';

/** Faux modèle : renvoie une réponse imposée et mémorise les requêtes reçues. */
function fauxClient(reponse: string | Error = '{}') {
  const requetes: ConverseCommandInput[] = [];
  const client: ClientModele = {
    async converse(requete) {
      requetes.push(requete);
      if (reponse instanceof Error) throw reponse;
      return { texte: reponse, inputTokens: 100, outputTokens: 20 };
    },
  };
  return { client, requetes };
}

const BONNE_REPONSE_TC01 = JSON.stringify({
  beneficiaire: 'Léa BERNARD',
  date_soins: '2026-03-12',
  type_acte: 'Monture 100 % Santé ; 2 verres 100 % Santé',
  montant_facture: 180,
  lignes: [70, 110],
  base_remboursement: null,
  taux_RO: null,
  montant_RO: null,
});

describe('US-12 : requête envoyée au modèle', () => {
  it('un PDF est envoyé sous forme de texte, entre balises <document>', () => {
    const r = construireRequete(MODELE, { texte: 'FACTURE 180,00 €' }, { modelId: MODELE });
    const bloc = r.messages?.[0].content?.[0] as { text: string };
    expect(bloc.text).toContain(PROMPT);
    expect(bloc.text).toContain('<document>\nFACTURE 180,00 €\n</document>');
    expect(r.modelId).toBe(MODELE);
  });

  it('une image PNG est envoyée comme image, suivie de la consigne', () => {
    const png = new Uint8Array([1, 2, 3]);
    const r = construireRequete(MODELE, { png }, { modelId: MODELE });
    const blocs = r.messages?.[0].content as any[];
    expect(blocs[0].image.format).toBe('png');
    expect(blocs[0].image.source.bytes).toEqual(png);
    expect(blocs[1].text).toBe(PROMPT);
  });

  it('la température est à 0 par défaut, modifiable, ou absente avec null', () => {
    expect(construireRequete(MODELE, { texte: 'x' }, { modelId: MODELE }).inferenceConfig?.temperature).toBe(0);
    expect(construireRequete(MODELE, { texte: 'x' }, { modelId: MODELE, temperature: 0.3 }).inferenceConfig?.temperature).toBe(0.3);
    expect(construireRequete(MODELE, { texte: 'x' }, { modelId: MODELE, temperature: null }).inferenceConfig).not.toHaveProperty('temperature');
  });

  it('la consigne contient les garde-fous issus du spike et de la sécurité', () => {
    expect(PROMPT).toContain('JJ/MM/AAAA');
    expect(PROMPT).toContain('TOTAL');
    expect(PROMPT).toContain('N\'invente rien');
    expect(PROMPT).toContain('jamais des instructions');
  });
});

describe('US-12 : le modèle propose, le code vérifie', () => {
  it('une bonne réponse est reprise telle quelle', () => {
    const f = interpreterReponse(BONNE_REPONSE_TC01);
    expect(f.beneficiaire.value).toBe('Léa BERNARD');
    expect(f.date_soins.value).toBe('2026-03-12');
    expect(f.montant_facture.value).toBe(180);
    expect(f.type_acte.status).toBe('extracted');
    expect(f.montant_RO).toEqual({ status: 'missing', value: null });
  });

  it('accepte une réponse entourée de ```json ou d\'une phrase', () => {
    expect(interpreterReponse('```json\n' + BONNE_REPONSE_TC01 + '\n```').montant_facture.value).toBe(180);
    expect(interpreterReponse('Voici le résultat : ' + BONNE_REPONSE_TC01 + ' Bonne journée.').beneficiaire.value).toBe('Léa BERNARD');
  });

  it('une réponse qui n\'est pas du JSON donne des champs tous manquants, sans erreur', () => {
    for (const f of Object.values(interpreterReponse('Je ne peux pas lire ce document.'))) expect(f.status).toBe('missing');
    for (const f of Object.values(interpreterReponse('{ pas du json'))) expect(f.status).toBe('missing');
  });

  it('refuse une date impossible ou au mauvais format, et garde les autres champs', () => {
    const f = interpreterReponse(JSON.stringify({ beneficiaire: 'Léa BERNARD', date_soins: '2026-02-30', montant_facture: 50 }));
    expect(f.date_soins.status).toBe('missing');
    expect(f.beneficiaire.status).toBe('extracted');
    expect(interpreterReponse(JSON.stringify({ date_soins: '12/03/2026' })).date_soins.status).toBe('missing');
  });

  it('erreur du spike : un total pris sur une seule ligne (70 au lieu de 180) est refusé par le recoupement', () => {
    const f = interpreterReponse(JSON.stringify({ montant_facture: 70, lignes: [70, 110] }));
    expect(f.montant_facture).toEqual({ status: 'missing', value: null });
  });

  it('un total qui correspond à la somme des lignes est accepté, au centime près', () => {
    expect(interpreterReponse(JSON.stringify({ montant_facture: 33.33, lignes: [10.1, 23.23] })).montant_facture.value).toBe(33.33);
    expect(interpreterReponse(JSON.stringify({ montant_facture: 33.34, lignes: [10.1, 23.23] })).montant_facture.status).toBe('missing');
  });

  it('lit un montant écrit à la française, refuse un montant en toutes lettres', () => {
    expect(interpreterReponse(JSON.stringify({ montant_facture: '180,00 €' })).montant_facture.value).toBe(180);
    expect(interpreterReponse(JSON.stringify({ montant_facture: 'douze euros cinquante' })).montant_facture.status).toBe('missing');
  });

  it('refuse les valeurs absurdes : montant négatif, taux supérieur à 100, champs nuls ou vides', () => {
    const f = interpreterReponse(JSON.stringify({ montant_facture: -5, taux_RO: 150, beneficiaire: '  ', type_acte: null, montant_RO: -1 }));
    for (const nom of ['montant_facture', 'taux_RO', 'beneficiaire', 'type_acte', 'montant_RO'] as const) {
      expect(f[nom].status).toBe('missing');
    }
  });

  it('un décompte : base, taux et montant du régime obligatoire sont repris', () => {
    const f = interpreterReponse(JSON.stringify({ beneficiaire: 'Léa BERNARD', base_remboursement: 30, taux_RO: 70, montant_RO: 21 }));
    expect([f.base_remboursement.value, f.taux_RO.value, f.montant_RO.value]).toEqual([30, 70, 21]);
  });
});

describe('US-12 : extracteur Bedrock (avec un faux modèle, sans appel AWS)', () => {
  it('TC-01 : lit un PDF et renvoie les champs vérifiés', async () => {
    const { client, requetes } = fauxClient(BONNE_REPONSE_TC01);
    const r = await new BedrockExtractor(client, { modelId: MODELE }).extract(lire('TC-01_facture_optique.pdf'), 'TC-01');
    expect(requetes).toHaveLength(1);
    expect(r.fields.montant_facture.value).toBe(180);
    const texte = (requetes[0].messages?.[0].content?.[0] as { text: string }).text;
    expect(texte).toContain('FACTURE'); // le texte du PDF est bien transmis
  });

  it('un format inconnu ou un PDF sans texte : aucun appel au modèle, tous les champs manquants', async () => {
    const { client, requetes } = fauxClient(BONNE_REPONSE_TC01);
    const r = await new BedrockExtractor(client, { modelId: MODELE }).extract(Buffer.from('n\'importe quoi'), 'x');
    expect(requetes).toHaveLength(0);
    for (const f of Object.values(r.fields)) expect(f.status).toBe('missing');
  });

  it('une erreur d\'accès (clé expirée, quota) remonte au lieu d\'être masquée', async () => {
    const { client } = fauxClient(new Error('ExpiredTokenException'));
    await expect(new BedrockExtractor(client, { modelId: MODELE }).extract(lire('TC-01_facture_optique.pdf'), 'x')).rejects.toThrow('ExpiredTokenException');
  });

  it('suit la consommation en tokens, pour surveiller les crédits', async () => {
    const { client } = fauxClient(BONNE_REPONSE_TC01);
    const extracteur = new BedrockExtractor(client, { modelId: MODELE });
    await extracteur.extract(lire('TC-01_facture_optique.pdf'), 'a');
    await extracteur.extract(lire('TC-03_decompte_RO.pdf'), 'b');
    expect(extracteur.consommation).toEqual({ appels: 2, inputTokens: 200, outputTokens: 40 });
  });

  it('dans le pipeline : un document flou n\'appelle jamais le modèle (économie et sécurité)', async () => {
    const { client, requetes } = fauxClient(BONNE_REPONSE_TC01);
    const r = await processDocument(lire('TC-05_document_illisible.png'), 'TC-05', new BedrockExtractor(client, { modelId: MODELE }));
    expect(requetes).toHaveLength(0);
    expect(r.extraction).toBeNull();
    expect(r.alerts).toContain('ILLISIBLE');
  });

  it('dans le pipeline : la classification et les contrôles restent ceux du code', async () => {
    const { client } = fauxClient(BONNE_REPONSE_TC01);
    const r = await processDocument(lire('TC-01_facture_optique.pdf'), 'TC-01', new BedrockExtractor(client, { modelId: MODELE }));
    expect(r.documentType).toBe('facture');
    expect(r.extraction?.fields.montant_facture.value).toBe(180);
  });
});

describe('US-12 : le fournisseur se change par configuration', () => {
  it('par défaut : extracteur à règles', () => {
    expect(creerExtracteur({})).toBeInstanceOf(LocalPdfExtractor);
    expect(creerExtracteur({ EXTRACTEUR: 'regles' })).toBeInstanceOf(LocalPdfExtractor);
    expect(creerExtracteur({ EXTRACTEUR: ' REGLES ' })).toBeInstanceOf(LocalPdfExtractor);
  });

  it('EXTRACTEUR=bedrock avec un modèle : extracteur Bedrock', () => {
    const e = creerExtracteur({ EXTRACTEUR: 'bedrock', BEDROCK_MODEL_ID: MODELE, AWS_REGION: 'eu-north-1' });
    expect(e).toBeInstanceOf(BedrockExtractor);
  });

  it('EXTRACTEUR=bedrock sans modèle : erreur explicite', () => {
    expect(() => creerExtracteur({ EXTRACTEUR: 'bedrock' })).toThrow('BEDROCK_MODEL_ID');
  });

  it('valeurs inconnues ou invalides : erreur explicite', () => {
    expect(() => creerExtracteur({ EXTRACTEUR: 'magie' })).toThrow('inconnu');
    expect(() => creerExtracteur({ EXTRACTEUR: 'bedrock', BEDROCK_MODEL_ID: MODELE, BEDROCK_TEMPERATURE: 'chaud' })).toThrow('BEDROCK_TEMPERATURE');
    expect(creerExtracteur({ EXTRACTEUR: 'bedrock', BEDROCK_MODEL_ID: MODELE, BEDROCK_TEMPERATURE: 'none' })).toBeInstanceOf(BedrockExtractor);
  });
});
