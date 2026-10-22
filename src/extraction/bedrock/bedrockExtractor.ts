import { BedrockRuntimeClient, ConverseCommand, ConverseCommandInput } from '@aws-sdk/client-bedrock-runtime';
import { isPng } from '../../quality/imageQuality';
import { readPdfText } from '../pdfText';
import { emptyFields } from '../parsing';
import { DocumentExtractor, ExtractionResult } from '../types';
import { PROMPT } from './prompt';
import { interpreterReponse } from './validate';

export interface Usage {
  appels: number;
  inputTokens: number;
  outputTokens: number;
}

/** Ce dont l'extracteur a besoin d'un modèle : envoyer une requête, recevoir un texte. */
export interface ClientModele {
  converse(requete: ConverseCommandInput): Promise<{ texte: string; inputTokens: number; outputTokens: number }>;
}

export interface OptionsBedrock {
  modelId: string;
  /** 0 par défaut (résultats reproductibles). null = ne pas envoyer le paramètre (certains modèles le refusent). */
  temperature?: number | null;
  maxTokens?: number;
}

/** Construit la requête Converse. PDF : texte du document ; PNG : image. */
export function construireRequete(modelId: string, contenu: { texte?: string; png?: Uint8Array }, options: OptionsBedrock): ConverseCommandInput {
  const blocs: NonNullable<ConverseCommandInput['messages']>[number]['content'] = [];
  if (contenu.png) {
    blocs.push({ image: { format: 'png', source: { bytes: contenu.png } } });
    blocs.push({ text: PROMPT });
  } else {
    blocs.push({ text: `${PROMPT}\n\n<document>\n${contenu.texte ?? ''}\n</document>` });
  }
  const temperature = options.temperature === undefined ? 0 : options.temperature;
  return {
    modelId,
    messages: [{ role: 'user', content: blocs }],
    inferenceConfig: { maxTokens: options.maxTokens ?? 800, ...(temperature === null ? {} : { temperature }) },
  };
}

/** Extracteur par modèle d'IA (AWS Bedrock). Même interface que l'extracteur à règles. */
export class BedrockExtractor implements DocumentExtractor {
  readonly consommation: Usage = { appels: 0, inputTokens: 0, outputTokens: 0 };

  constructor(
    private readonly client: ClientModele,
    private readonly options: OptionsBedrock,
  ) {}

  async extract(input: Buffer, source: string): Promise<ExtractionResult> {
    const contenu = await this.preparer(input);
    // Format non pris en charge ou PDF sans texte : aucun appel, aucun champ inventé.
    if (!contenu) return { source, fields: emptyFields() };

    const requete = construireRequete(this.options.modelId, contenu, this.options);
    // Une erreur d'accès ou de réseau n'est pas masquée : elle remonte (clé expirée, quota...).
    const reponse = await this.client.converse(requete);
    this.consommation.appels += 1;
    this.consommation.inputTokens += reponse.inputTokens;
    this.consommation.outputTokens += reponse.outputTokens;

    return { source, fields: interpreterReponse(reponse.texte) };
  }

  private async preparer(input: Buffer): Promise<{ texte?: string; png?: Uint8Array } | null> {
    if (isPng(input)) return { png: new Uint8Array(input) };
    const texte = await readPdfText(input);
    return texte && texte.trim().length > 0 ? { texte } : null;
  }
}

/** Client réel. L'authentification vient de l'environnement (AWS_BEARER_TOKEN_BEDROCK), jamais du code. */
export function creerClientBedrock(region: string): ClientModele {
  const client = new BedrockRuntimeClient({ region });
  return {
    async converse(requete) {
      const sortie = await client.send(new ConverseCommand(requete));
      const texte = (sortie.output?.message?.content ?? []).map((b) => b.text ?? '').join('');
      return { texte, inputTokens: sortie.usage?.inputTokens ?? 0, outputTokens: sortie.usage?.outputTokens ?? 0 };
    },
  };
}
