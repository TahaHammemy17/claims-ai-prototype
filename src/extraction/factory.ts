import { BedrockExtractor, creerClientBedrock } from './bedrock/bedrockExtractor';
import { LocalPdfExtractor } from './localPdfExtractor';
import { DocumentExtractor } from './types';

/**
 * Choisit l'extracteur par configuration (variables d'environnement) :
 *   EXTRACTEUR=regles   (défaut) : extracteur à règles, sans AWS
 *   EXTRACTEUR=bedrock           : modèle d'IA ; BEDROCK_MODEL_ID est obligatoire
 *   AWS_REGION (défaut eu-north-1), BEDROCK_TEMPERATURE (nombre, ou "none" pour ne pas l'envoyer)
 */
export function creerExtracteur(env: Record<string, string | undefined> = process.env): DocumentExtractor {
  const choix = (env.EXTRACTEUR ?? 'regles').trim().toLowerCase();

  if (choix === 'regles') return new LocalPdfExtractor();

  if (choix === 'bedrock') {
    const modelId = env.BEDROCK_MODEL_ID?.trim();
    if (!modelId) throw new Error('EXTRACTEUR=bedrock exige BEDROCK_MODEL_ID (ex. amazon.nova-lite-v1:0).');
    const brut = env.BEDROCK_TEMPERATURE?.trim().toLowerCase();
    const temperature = brut === undefined || brut === '' ? 0 : brut === 'none' ? null : Number(brut);
    if (temperature !== null && !Number.isFinite(temperature)) throw new Error('BEDROCK_TEMPERATURE doit être un nombre ou "none".');
    return new BedrockExtractor(creerClientBedrock(env.AWS_REGION?.trim() || 'eu-north-1'), { modelId, temperature });
  }

  throw new Error(`EXTRACTEUR inconnu : "${choix}" (valeurs possibles : regles, bedrock).`);
}
