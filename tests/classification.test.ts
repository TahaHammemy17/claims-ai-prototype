import { readFileSync } from 'fs';
import { join } from 'path';
import { classifyDocument, classifyText, isEligibleForRefund, DocumentType } from '../src/extraction';

const SAMPLES = join(__dirname, '..', 'samples');
const classify = (file: string) => classifyDocument(readFileSync(join(SAMPLES, file)));

describe('US-03 : classification à partir du texte', () => {
  it('reconnaît une facture, un décompte et un devis par leur titre', () => {
    expect(classifyText('FACTURE\nFacture n° 12')).toBe('facture');
    expect(classifyText('DÉCOMPTE DE REMBOURSEMENT\nRéférence 1')).toBe('decompte');
    expect(classifyText('DEVIS\nDevis n° 3')).toBe('devis');
  });

  it('ne confond pas un devis avec une facture malgré la mention "n\'est pas une facture"', () => {
    const texte = "DEVIS\nTOTAL DU DEVIS 650,00 €\nCe devis n'est pas une facture.";
    expect(classifyText(texte)).toBe('devis');
  });

  it('utilise les mentions de secours quand le titre est absent', () => {
    expect(classifyText('Cabinet\nTOTAL À PAYER 60,00 €')).toBe('facture');
    expect(classifyText('Caisse\nMONTANT REMBOURSÉ PAR LE RÉGIME OBLIGATOIRE 21,00 €')).toBe('decompte');
  });

  it('classe "non_reconnu" sans signal clair, y compris un texte vide', () => {
    expect(classifyText('MENU DU JOUR\nEntrée : salade')).toBe('non_reconnu');
    expect(classifyText('')).toBe('non_reconnu');
  });
});

describe('US-03 : classification des fichiers du jeu de test', () => {
  const attendu: Array<[string, DocumentType]> = [
    ['TC-01_facture_optique.pdf', 'facture'],
    ['TC-02_devis_dentaire.pdf', 'devis'],
    ['TC-03_facture_specialiste.pdf', 'facture'],
    ['TC-03_decompte_RO.pdf', 'decompte'],
    ['TC-04_decompte_RO_partiel.pdf', 'decompte'],
    ['TC-06_facture.pdf', 'facture'],
    ['TC-06_decompte_RO.pdf', 'decompte'],
    ['TC-07_doublon_facture_optique.pdf', 'facture'],
    ['TC-08_facture_date_future.pdf', 'facture'],
    ['TC-09_facture_beneficiaire_inconnu.pdf', 'facture'],
    ['TC-10_hors_sujet.pdf', 'non_reconnu'],
    ['TC-05_document_illisible.png', 'non_reconnu'],
  ];

  it.each(attendu)('%s -> %s', async (fichier, type) => {
    expect(await classify(fichier)).toBe(type);
  });
});

describe('US-03 : éligibilité au calcul de remboursement', () => {
  it('un devis n\'entre pas dans le calcul (TC-02)', async () => {
    const type = await classify('TC-02_devis_dentaire.pdf');
    expect(isEligibleForRefund(type)).toBe(false);
  });

  it('un document hors sujet n\'entre pas dans le calcul (TC-10)', async () => {
    const type = await classify('TC-10_hors_sujet.pdf');
    expect(isEligibleForRefund(type)).toBe(false);
  });

  it('une facture et un décompte entrent dans le calcul', () => {
    expect(isEligibleForRefund('facture')).toBe(true);
    expect(isEligibleForRefund('decompte')).toBe(true);
    expect(isEligibleForRefund('devis')).toBe(false);
    expect(isEligibleForRefund('non_reconnu')).toBe(false);
  });
});