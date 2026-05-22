import { describe, it, expect } from 'vitest';
import { ROLE_CATALOG, ROLE_BY_ID, rolesForBranches } from './roles';

describe('rolesForBranches', () => {
  it('assigns one distinct role per branch up to the catalog size', () => {
    const roles = rolesForBranches(ROLE_CATALOG.length);
    expect(new Set(roles).size).toBe(ROLE_CATALOG.length);
  });

  it('cycles roles when more branches than catalog entries are requested', () => {
    const n = ROLE_CATALOG.length + 2;
    const roles = rolesForBranches(n);
    expect(roles).toHaveLength(n);
    expect(roles[0]).toBe(roles[ROLE_CATALOG.length]); // wrapped around
  });

  it('returns an empty list for a count of 0', () => {
    expect(rolesForBranches(0)).toEqual([]);
  });
});

describe('ROLE_BY_ID', () => {
  it('has an entry for every catalog role with a persona and badge class', () => {
    for (const role of ROLE_CATALOG) {
      const def = ROLE_BY_ID[role.id];
      expect(def).toBeDefined();
      expect(def.persona.length).toBeGreaterThan(0);
      expect(def.badgeClass.length).toBeGreaterThan(0);
    }
  });
});
