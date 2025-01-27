import { matchesJiraKeyPattern } from '../helpers';

describe('matchesJiraKeyPattern', () => {
  it('matches valid Jira issue keys', () => {
    expect(matchesJiraKeyPattern('PROJ-123', 'PROJ')).toBe(true);
    expect(matchesJiraKeyPattern('Some text PROJ-123 more text', 'PROJ')).toBe(true);
    expect(matchesJiraKeyPattern('proj-123', 'PROJ')).toBe(true); // Case insensitive
    expect(matchesJiraKeyPattern('proj-1234?', 'PROJ')).toBe(true);
  });

  it('does not match invalid Jira issue keys', () => {
    expect(matchesJiraKeyPattern('PROJ123', 'PROJ')).toBe(false);
    expect(matchesJiraKeyPattern('PROJ-', 'PROJ')).toBe(false);
    expect(matchesJiraKeyPattern('PROJX-123', 'PROJ')).toBe(false);
    expect(matchesJiraKeyPattern('OTHER-123', 'PROJ')).toBe(false);
  });
});
