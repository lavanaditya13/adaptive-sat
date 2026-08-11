import { describe, expect, it } from 'vitest';
import { buildCrumbs } from './Breadcrumbs.constants';

const labels = (pathname: string, trailing?: string) =>
  buildCrumbs(pathname, trailing).map((crumb) => crumb.label);

describe('buildCrumbs', () => {
  it('renders a single non-clickable crumb on the dashboard', () => {
    const crumbs = buildCrumbs('/dashboard');

    expect(crumbs).toHaveLength(1);
    expect(crumbs[0]).toEqual({ label: 'Dashboard' });
  });

  it('links back to the dashboard from results and settings', () => {
    expect(labels('/results')).toEqual(['Dashboard', 'Results']);
    expect(labels('/settings')).toEqual(['Dashboard', 'Settings']);
    expect(buildCrumbs('/results')[0].to).toBe('/dashboard');
  });

  it('builds the practice trail down to a skill', () => {
    expect(labels('/practice')).toEqual(['Dashboard', 'Practice']);
    expect(labels('/practice/math')).toEqual(['Dashboard', 'Practice', 'Math']);
    expect(labels('/practice/math/domains')).toEqual([
      'Dashboard',
      'Practice',
      'Math',
      'Domains',
    ]);
    expect(labels('/practice/reading_writing/domains/Craft%20%26%20Structure')).toEqual([
      'Dashboard',
      'Practice',
      'Reading & Writing',
      'Domains',
      'Craft & Structure',
    ]);
  });

  it('never makes the last crumb clickable', () => {
    const crumbs = buildCrumbs('/practice/math/domains');

    expect(crumbs.at(-1)?.to).toBeUndefined();
    expect(crumbs.slice(0, -1).every((crumb) => Boolean(crumb.to))).toBe(true);
  });

  it('uses the trailing override for confirm and session screens', () => {
    expect(labels('/practice/math/confirm', 'Linear functions')).toEqual([
      'Dashboard',
      'Practice',
      'Math',
      'Linear functions',
    ]);
    expect(labels('/practice/session', 'Algebra')).toEqual([
      'Dashboard',
      'Practice',
      'Algebra',
    ]);
    expect(labels('/practice/session')).toEqual(['Dashboard', 'Practice', 'Questions']);
  });
});
