import { readFileSync } from 'fs';
import { join } from 'path';
import { ConverseCommandInput } from '@aws-sdk/client-bedrock-runtime';
import { BedrockExtractor, ClientModele } from '../src/extraction';
import { DossierRegistry } from '../src/controls/doublon';
import { processDocument } from '../src/pipeline';
import { construireDossier } from '../src/validation/dossier';

const SAMPLES = join(__dirname, '..', 'samples');
const lire = (f: string) => readFileSync(join(SAMPLES, f));
const MODELE = 'amazon.nova-lite-v1:0';

/** Faux modèle qui reproduit les erreurs constatées en réel. */
function modeleDefaillant(): { client: ClientModele; appels: ConverseCommandInput[] } {
  const appels: ConverseCommandInput[] = [];
  const client: ClientModele = {
    async converse(requete) {
      appels.push(requete);
      const texte = (requete.messages?.[0].content?.[0] as { text: string }).text;
      const reponse = texte.includes('DÉCOMPTE')
        // erreur réelle : la base de remboursement (30) prise pour le montant facturé
        ? { beneficiaire: 'Léa BERNARD', date_soins: '2026-05-18', type_acte: 'Consultation spécialiste', montant_facture: 30, base_remboursement: 30, taux_RO: 70, montant_RO: 21 }
        // erreur plausible inverse : champs de décompte inventés sur une facture
        : { beneficiaire: 'Léa BERNARD', date_soins: '2026-05-18', type_acte: 'Consultation spécialiste (secteur 2)', montant_facture: 80, lignes: [80], base_remboursement: 30, taux_RO: 70, montant_RO: 21 };
      return { texte: JSON.stringify(reponse), inputTokens: 100, outputTokens: 20 };
    },
  };
  return { client, appels };
}

describe('Le type de document décidé par le code filtre les champs du modèle', () => {
  it('décompte : le montant facturé erroné du modèle est écarté, les champs du décompte sont gardés', async () => {
    const { client } = modeleDefaillant();
    const r = await processDocument(lire('TC-03_decompte_RO.pdf'), 'd', new BedrockExtractor(client, { modelId: MODELE }));
    expect(r.documentType).toBe('decompte');
    expect(r.extraction?.fields.montant_facture).toEqual({ status: 'missing', value: null });
    expect(r.extraction?.fields.base_remboursement.value).toBe(30);
    expect(r.extraction?.fields.montant_RO.value).toBe(21);
  });

  it('facture : les champs de décompte inventés par le modèle sont écartés', async () => {
    const { client } = modeleDefaillant();
    const r = await processDocument(lire('TC-03_facture_specialiste.pdf'), 'f', new BedrockExtractor(client, { modelId: MODELE }));
    expect(r.documentType).toBe('facture');
    expect(r.extraction?.fields.montant_facture.value).toBe(80);
    for (const nom of ['base_remboursement', 'taux_RO', 'montant_RO'] as const) {
      expect(r.extraction?.fields[nom]).toEqual({ status: 'missing', value: null });
    }
  });

  it('un document non reconnu n\'est jamais envoyé au modèle, tous ses champs sont manquants (TC-10)', async () => {
    const { client, appels } = modeleDefaillant();
    const r = await processDocument(lire('TC-10_hors_sujet.pdf'), 'm', new BedrockExtractor(client, { modelId: MODELE }));
    expect(appels).toHaveLength(0);
    expect(r.documentType).toBe('non_reconnu');
    for (const f of Object.values(r.extraction!.fields)) expect(f.status).toBe('missing');
  });

  it('l\'ordre des documents ne fausse plus le calcul : décompte lu avant la facture -> reste à charge 35 €', async () => {
    const { client } = modeleDefaillant();
    const dossier = await construireDossier({
      reference: 'TC-03',
      fichiers: [
        { nom: 'TC-03_decompte_RO.pdf', contenu: lire('TC-03_decompte_RO.pdf') },
        { nom: 'TC-03_facture_specialiste.pdf', contenu: lire('TC-03_facture_specialiste.pdf') },
      ],
      dateDepot: '2026-05-20',
      garantiePct: 150,
      registre: new DossierRegistry(),
      extracteur: new BedrockExtractor(client, { modelId: MODELE }),
    });
    expect(dossier.champs.montant_facture).toBe(80);
    expect(dossier.calcul).toEqual({ plafond_total: 45, montant_RC: 24, reste_a_charge: 35 });
  });
});
