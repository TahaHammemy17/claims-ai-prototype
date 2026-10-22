import { DossierAValider, Statut } from './dossier';

const vide = (texte: string | undefined | null) => !texte || texte.trim().length === 0;

/** Un dossier avec des alertes ou des champs essentiels manquants demande un commentaire pour être validé. */
export function demandeUnCommentaire(d: DossierAValider): boolean {
  return d.alertes.length > 0 || d.champsEssentielsManquants.length > 0;
}

/**
 * File de validation du gestionnaire.
 * Règle métier (choix du chef de projet) : une alerte est un signal, pas un verdict.
 *  - le gestionnaire peut valider un dossier en alerte, avec un commentaire obligatoire ;
 *  - rejeter exige un motif ;
 *  - toute décision enregistre qui, quand et pourquoi, et ne peut plus être modifiée.
 */
export class FileDeValidation {
  private readonly dossiers = new Map<string, DossierAValider>();

  /** `horloge` est injectable pour que les tests soient reproductibles. */
  constructor(private readonly horloge: () => Date = () => new Date()) {}

  ajouter(dossier: DossierAValider): void {
    if (this.dossiers.has(dossier.reference)) throw new Error(`Le dossier ${dossier.reference} existe déjà.`);
    this.dossiers.set(dossier.reference, dossier);
  }

  lister(statut?: Statut): DossierAValider[] {
    const tous = [...this.dossiers.values()];
    return statut ? tous.filter((d) => d.statut === statut) : tous;
  }

  obtenir(reference: string): DossierAValider {
    const d = this.dossiers.get(reference);
    if (!d) throw new Error(`Dossier inconnu : ${reference}`);
    return d;
  }

  valider(reference: string, par: string, commentaire?: string): DossierAValider {
    const d = this.aDecider(reference, par);
    if (demandeUnCommentaire(d) && vide(commentaire)) {
      throw new Error('Un commentaire est obligatoire pour valider un dossier présentant des alertes ou des données manquantes.');
    }
    return this.enregistrer(d, { statut: 'VALIDE', par, commentaire: vide(commentaire) ? null : commentaire!.trim(), motif: null });
  }

  rejeter(reference: string, par: string, motif: string): DossierAValider {
    const d = this.aDecider(reference, par);
    if (vide(motif)) throw new Error('Un motif est obligatoire pour rejeter un dossier.');
    return this.enregistrer(d, { statut: 'REJETE', par, commentaire: null, motif: motif.trim() });
  }

  private aDecider(reference: string, par: string): DossierAValider {
    const d = this.obtenir(reference);
    if (d.statut !== 'A_VALIDER') throw new Error(`Le dossier ${reference} a déjà fait l'objet d'une décision.`);
    if (vide(par)) throw new Error('Le nom du gestionnaire est obligatoire.');
    return d;
  }

  private enregistrer(d: DossierAValider, d2: Omit<NonNullable<DossierAValider['decision']>, 'le'>): DossierAValider {
    const decision = { ...d2, par: d2.par.trim(), le: this.horloge().toISOString() };
    const mis = { ...d, statut: decision.statut, decision } as DossierAValider;
    this.dossiers.set(d.reference, mis);
    return mis;
  }
}
