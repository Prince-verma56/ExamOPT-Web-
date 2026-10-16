import { describe, it, expect } from 'vitest';
import { resolveDependencies, CAPABILITIES } from '../../scripts/orchestrator/registry';

describe('Hackathon Orchestrator - Registry', () => {
  it('resolves no dependencies if none required', () => {
    const res = resolveDependencies(['database', 'realtime']);
    expect(res).toContain('database');
    expect(res).toContain('realtime');
    expect(res).toHaveLength(2);
  });

  it('resolves direct dependencies', () => {
    // search requires database
    const res = resolveDependencies(['search']);
    expect(res).toContain('search');
    expect(res).toContain('database');
    expect(res).toHaveLength(2);
  });

  it('resolves transitive dependencies', () => {
    // langgraph -> agents -> toolCalling -> ai
    const res = resolveDependencies(['langgraph']);
    expect(res).toContain('langgraph');
    expect(res).toContain('agents');
    expect(res).toContain('toolCalling');
    expect(res).toContain('ai');
  });

  it('handles empty input', () => {
    const res = resolveDependencies([]);
    expect(res).toHaveLength(0);
  });
});
