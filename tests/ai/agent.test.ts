 
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect } from 'vitest';
import { LangGraphAdapter } from '../../ai/agents/langgraph';

describe('LangGraph Adapter', () => {
  it('should create and compile a state graph correctly', () => {
    const adapter = new LangGraphAdapter();
    
    adapter.addNode({
      name: 'step1',
      func: async (state) => ({ currentStep: 'step1', status: 'completed' })
    });
    
    adapter.setEntryPoint('step1');
    adapter.setFinishPoint('step1');
    
    const compiled = adapter.compile();
    expect(compiled).toBeDefined();
  });
});

