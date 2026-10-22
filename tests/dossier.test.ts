import { ALL_FIELDS } from '../src/extraction';
import { mergeExtractions } from '../src/dossier';

describe('Regroupement des champs d\'un dossier', () => {
  it('sans aucune extraction (image illisible), tous les champs existent et valent null', () => {
    const d = mergeExtractions([]);
    expect(Object.keys(d).sort()).toEqual([...ALL_FIELDS].sort());
    for (const f of ALL_FIELDS) expect(d[f]).toBeNull();
  });
});
