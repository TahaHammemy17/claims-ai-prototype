import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BedrockExtractor, DocumentExtractor, creerExtracteur } from '../extraction';
import { processDocument } from '../pipeline';

/**
 * Fonction AWS Lambda : traite un document déposé dans S3.
 *   entrée : entrees/<fichier>   ->   sortie : sorties/<fichier>.json
 *
 * Garde-fous :
 *  - seuls les fichiers du préfixe "entrees/" sont traités, et le résultat est écrit sous "sorties/" :
 *    une fonction qui écrit là où elle est déclenchée tournerait en boucle et coûterait cher ;
 *  - taille limitée à 5 Mo ;
 *  - une erreur est consignée dans un fichier et dans les journaux, sans relancer la fonction
 *    (les relances automatiques répéteraient les appels payants au modèle) ;
 *  - le contenu des documents n'est jamais écrit dans les journaux.
 */
export const PREFIXE_ENTREE = 'entrees/';
export const PREFIXE_SORTIE = 'sorties/';
export const TAILLE_MAX_OCTETS = 5 * 1024 * 1024;

export interface StockageS3 {
  lire(bucket: string, cle: string): Promise<Buffer>;
  ecrire(bucket: string, cle: string, contenu: string): Promise<void>;
}

export interface EvenementS3 {
  Records: Array<{ s3: { bucket: { name: string }; object: { key: string; size?: number } } }>;
}

export interface BilanLambda {
  traites: number;
  ignores: number;
  erreurs: number;
}

const nomDuFichier = (cle: string) => cle.slice(cle.lastIndexOf('/') + 1);

/** Les clés d'un évènement S3 sont encodées dans une URL : "+" = espace, "%C3%A9" = é. */
const decoderCle = (cle: string) => decodeURIComponent(cle.replace(/\+/g, ' '));

function consommation(extracteur: DocumentExtractor) {
  return extracteur instanceof BedrockExtractor ? { ...extracteur.consommation } : null;
}

export function creerHandler(deps: { stockage: StockageS3; extracteur: DocumentExtractor }) {
  const { stockage, extracteur } = deps;

  return async function handler(event: EvenementS3): Promise<BilanLambda> {
    const bilan: BilanLambda = { traites: 0, ignores: 0, erreurs: 0 };

    for (const enregistrement of event.Records ?? []) {
      const bucket = enregistrement.s3.bucket.name;
      const cle = decoderCle(enregistrement.s3.object.key);

      if (!cle.startsWith(PREFIXE_ENTREE) || cle.endsWith('/')) {
        bilan.ignores += 1;
        continue;
      }
      const nom = nomDuFichier(cle);

      try {
        if ((enregistrement.s3.object.size ?? 0) > TAILLE_MAX_OCTETS) {
          throw Object.assign(new Error('Fichier trop volumineux'), { name: 'FichierTropVolumineux' });
        }
        const avant = consommation(extracteur);
        const document = await stockage.lire(bucket, cle);
        const resultat = await processDocument(document, nom, extracteur);
        const apres = consommation(extracteur);

        const sortie = {
          entree: cle,
          traitement: 'lambda',
          ...resultat,
          consommation:
            avant && apres
              ? {
                  appels: apres.appels - avant.appels,
                  inputTokens: apres.inputTokens - avant.inputTokens,
                  outputTokens: apres.outputTokens - avant.outputTokens,
                }
              : null,
        };
        await stockage.ecrire(bucket, `${PREFIXE_SORTIE}${nom}.json`, JSON.stringify(sortie, null, 2));
        bilan.traites += 1;
      } catch (e) {
        const type = e instanceof Error ? e.name : 'ErreurInconnue';
        // Le détail (qui peut contenir des identifiants de compte) reste dans les journaux, pas dans le fichier.
        console.error(JSON.stringify({ niveau: 'erreur', fichier: nom, type, message: e instanceof Error ? e.message : String(e) }));
        await stockage.ecrire(
          bucket,
          `${PREFIXE_SORTIE}${nom}.erreur.json`,
          JSON.stringify({ entree: cle, erreur: type, message: 'Le traitement a échoué. Voir les journaux CloudWatch.' }, null, 2),
        );
        bilan.erreurs += 1;
      }
    }

    console.log(JSON.stringify({ niveau: 'info', ...bilan }));
    return bilan;
  };
}

function stockageS3(region: string): StockageS3 {
  const client = new S3Client({ region });
  return {
    async lire(bucket, cle) {
      const r = await client.send(new GetObjectCommand({ Bucket: bucket, Key: cle }));
      return Buffer.from(await r.Body!.transformToByteArray());
    },
    async ecrire(bucket, cle, contenu) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: cle, Body: contenu, ContentType: 'application/json', ServerSideEncryption: 'AES256' }),
      );
    },
  };
}

let handlerParDefaut: ReturnType<typeof creerHandler> | undefined;

/** Point d'entrée de Lambda. Créé au premier appel (et réutilisé ensuite), configuré par variables d'environnement. */
export const handler = (event: EvenementS3): Promise<BilanLambda> => {
  handlerParDefaut ??= creerHandler({
    stockage: stockageS3(process.env.AWS_REGION ?? 'eu-north-1'),
    extracteur: creerExtracteur(process.env),
  });
  return handlerParDefaut(event);
};
