import { readFileSync } from 'fs';
import { join } from 'path';
import { chargerContratFichier } from '../src/contrat';
import { DossierRegistry } from '../src/controls/doublon';
import { construireDossier } from '../src/validation/dossier';
import { FileDeValidation } from '../src/validation/file';

const SAMPLES = join(__dirname, '..', 'samples');
const cas: any[] = JSON.parse(readFileSync(join(SAMPLES, 'resultats-attendus.json'), 'utf-8'));
const CONTRAT = chargerContratFichier(join(SAMPLES, 'contrat-fictif.json'));
const HORLOGE_FIXE = () => new Date('2026-10-20T10:30:00.000Z');

/** Construit les dossiers du jeu de test, dans l'ordre, avec un registre partagé. */
async function toutesLesFiles() {
  const registre = new DossierRegistry();
  const file = new FileDeValidation(HORLOGE_FIXE);
  for (const c of cas) {
    file.ajouter(
      await construireDossier({
        reference: c.id,
        fichiers: c.fichiers.map((nom: string) => ({ nom, contenu: readFileSync(join(SAMPLES, nom)) })),
        dateDepot: c.date_depot,
        garantiePct: 150,
        registre,
        contrat: CONTRAT,
      }),
    );
  }
  return file;
}

const codes = (file: FileDeValidation, ref: string) => file.obtenir(ref).alertes.map((a) => a.code);

describe('US-09 : assemblage des contrôles dans le dossier', () => {
  let file: FileDeValidation;
  beforeAll(async () => { file = await toutesLesFiles(); });

  it('aucune décision automatique : tous les dossiers arrivent "A_VALIDER", sans décision', () => {
    expect(file.lister()).toHaveLength(10);
    for (const d of file.lister()) {
      expect(d.statut).toBe('A_VALIDER');
      expect(d.decision).toBeNull();
    }
  });

  it('TC-01 : dossier propre, sans alerte', () => {
    expect(codes(file, 'TC-01')).toEqual([]);
  });

  it('TC-03 : calcul du plafond affiché, sans alerte', () => {
    expect(file.obtenir('TC-03').calcul).toEqual({ plafond_total: 45, montant_RC: 24, reste_a_charge: 35 });
    expect(codes(file, 'TC-03')).toEqual([]);
  });

  it('TC-05 : image floue -> ILLISIBLE, aucun champ extrait', () => {
    expect(codes(file, 'TC-05')).toEqual(['ILLISIBLE']);
    expect(file.obtenir('TC-05').champs.montant_facture).toBeNull();
  });

  it('TC-06 : incohérence de montant, pas de calcul', () => {
    expect(codes(file, 'TC-06')).toEqual(['INCOHERENCE_MONTANT']);
    expect(file.obtenir('TC-06').calcul).toBeNull();
  });

  it('TC-07 : doublon, avec la référence du dossier d\'origine', () => {
    const a = file.obtenir('TC-07').alertes[0];
    expect(a.code).toBe('DOUBLON');
    expect(a.libelle).toContain('TC-01');
    expect(a.regle).toBe('RG-02');
  });

  it('TC-08 : date des soins postérieure au dépôt', () => {
    expect(codes(file, 'TC-08')).toEqual(['DATE_INCOHERENTE']);
  });

  it('TC-02 (devis) et TC-10 (hors sujet) : alertes de classification (RG-05)', () => {
    expect(codes(file, 'TC-02')).toContain('DEVIS_NON_ELIGIBLE');
    expect(codes(file, 'TC-10')).toEqual(['NON_RECONNU']);
  });

  it('les champs essentiels manquants sont rendus visibles (un silence n\'est pas une approbation)', () => {
    expect(file.obtenir('TC-10').champsEssentielsManquants).toEqual(['beneficiaire', 'date_soins', 'type_acte', 'montant_facture']);
    expect(file.obtenir('TC-01').champsEssentielsManquants).toEqual([]);
  });

  it('TC-09 : bénéficiaire absent du contrat (RG-04)', () => {
    expect(codes(file, 'TC-09')).toEqual(['BENEFICIAIRE_INCONNU']);
    expect(file.obtenir('TC-09').alertes[0].regle).toBe('RG-04');
  });
});

describe('US-09 : décisions du gestionnaire (règle A : valider avec alerte exige un commentaire)', () => {
  let file: FileDeValidation;
  beforeEach(async () => { file = await toutesLesFiles(); });

  it('un dossier propre se valide sans commentaire, et la décision est tracée', () => {
    const d = file.valider('TC-01', 'Sami');
    expect(d.statut).toBe('VALIDE');
    expect(d.decision).toEqual({ statut: 'VALIDE', par: 'Sami', le: '2026-10-20T10:30:00.000Z', commentaire: null, motif: null });
  });

  it('un dossier en alerte ne se valide pas sans commentaire', () => {
    expect(() => file.valider('TC-07', 'Sami')).toThrow(/commentaire est obligatoire/);
    expect(() => file.valider('TC-07', 'Sami', '   ')).toThrow(/commentaire est obligatoire/);
    expect(file.obtenir('TC-07').statut).toBe('A_VALIDER');
  });

  it('un dossier en alerte se valide avec un commentaire : le gestionnaire garde la main', () => {
    const d = file.valider('TC-07', 'Sami', 'Deuxième paire demandée par l\'assuré, vérifié par téléphone.');
    expect(d.statut).toBe('VALIDE');
    expect(d.decision?.commentaire).toContain('vérifié par téléphone');
  });

  it('un dossier avec champs manquants demande aussi un commentaire', () => {
    expect(() => file.valider('TC-04', 'Sami')).toThrow(/commentaire est obligatoire/);
  });

  it('rejeter exige un motif', () => {
    expect(() => file.rejeter('TC-06', 'Sami', '')).toThrow(/motif est obligatoire/);
    const d = file.rejeter('TC-06', 'Sami', 'Remboursement RO supérieur à la facture.');
    expect(d.statut).toBe('REJETE');
    expect(d.decision?.motif).toBe('Remboursement RO supérieur à la facture.');
  });

  it('le nom du gestionnaire est obligatoire', () => {
    expect(() => file.valider('TC-01', '  ')).toThrow(/nom du gestionnaire/);
  });

  it('une décision ne peut pas être modifiée', () => {
    file.valider('TC-01', 'Sami');
    expect(() => file.rejeter('TC-01', 'Sami', 'Finalement non.')).toThrow(/déjà fait l'objet d'une décision/);
    expect(() => file.valider('TC-01', 'Sami')).toThrow(/déjà fait l'objet d'une décision/);
  });

  it('un dossier inconnu est refusé', () => {
    expect(() => file.valider('TC-99', 'Sami')).toThrow(/Dossier inconnu/);
  });

  it('la liste se filtre par statut', () => {
    file.valider('TC-01', 'Sami');
    file.rejeter('TC-06', 'Sami', 'Incohérence.');
    expect(file.lister('A_VALIDER')).toHaveLength(8);
    expect(file.lister('VALIDE').map((d) => d.reference)).toEqual(['TC-01']);
    expect(file.lister('REJETE').map((d) => d.reference)).toEqual(['TC-06']);
  });
});
