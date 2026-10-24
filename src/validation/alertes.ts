/** Une alerte lisible par le gestionnaire : ce qui se passe, et quelle règle s'applique. */
export interface Alerte {
  code: string;
  libelle: string;
  regle: string;
}

const CATALOGUE: Record<string, { libelle: string; regle: string }> = {
  ILLISIBLE: { libelle: 'Document illisible : aucune extraction automatique, traitement manuel', regle: 'US-04' },
  IMAGE_NON_PRISE_EN_CHARGE: { libelle: 'Image non prise en charge (pas d\'OCR) : traitement manuel', regle: 'US-04' },
  FORMAT_NON_PRIS_EN_CHARGE: { libelle: 'Format de fichier non pris en charge : traitement manuel', regle: 'US-04' },
  NON_RECONNU: { libelle: 'Document non reconnu (ni facture, ni décompte, ni devis)', regle: 'RG-05' },
  DEVIS_NON_ELIGIBLE: { libelle: 'Devis : n\'entre pas dans le calcul de remboursement', regle: 'RG-05' },
  INCOHERENCE_MONTANT: { libelle: 'Le régime obligatoire a remboursé plus que le montant facturé', regle: 'RG-01' },
  PLAFOND_DEPASSE: { libelle: 'Remboursement annoncé supérieur au plafond du contrat', regle: 'RG-01' },
  DOUBLON: { libelle: 'Doublon possible d\'un dossier déjà déposé', regle: 'RG-02' },
  DATE_INCOHERENTE: { libelle: 'Date des soins postérieure à la date de dépôt', regle: 'RG-03' },
  DATE_INVALIDE: { libelle: 'Date invalide ou illisible', regle: 'RG-03' },
  BENEFICIAIRE_INCONNU: { libelle: 'Bénéficiaire absent du contrat', regle: 'RG-04' },
};

/** Construit une alerte lisible ; `precision` complète le libellé (ex. référence d'un doublon). */
export function alerte(code: string, precision?: string): Alerte {
  const entree = CATALOGUE[code];
  if (!entree) throw new Error(`Alerte inconnue : ${code}`);
  return { code, regle: entree.regle, libelle: precision ? `${entree.libelle} (${precision})` : entree.libelle };
}
