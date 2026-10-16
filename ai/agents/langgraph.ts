/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { StateGraph, MemorySaver, StateDefinition } from '@langchain/langgraph';
import { AIContext } from '../context';

export interface AgentWorkflowState {
  input: string;
  context: AIContext;
  messages: any[];
  toolResults: Record<string, any>;
  currentStep: string;
  status: 'idle' | 'running' | 'waiting_approval' | 'completed' | 'failed';
  error?: string;
  output?: string;
}

export interface AgentWorkflowNode {
  name: string;
  func: (state: AgentWorkflowState) => Promise<Partial<AgentWorkflowState>>;
}

export interface AgentWorkflowEdge {
  from: string;
  to: string | ((state: AgentWorkflowState) => string);
}

export class LangGraphAdapter {
  private graphBuilder: any;
  private memory: MemorySaver;

  constructor() {
    this.memory = new MemorySaver();
    // Use StateGraph from @langchain/langgraph. 
    // Types would normally be defined in channels, but for abstraction we use loose typing.
    this.graphBuilder = new StateGraph<AgentWorkflowState>({
      channels: {
        input: null as any,
        context: null as any,
        messages: {
          value: (x: any[], y: any[]) => x.concat(y),
          default: () => []
        },
        toolResults: {
          value: (x: Record<string, any>, y: Record<string, any>) => ({ ...x, ...y }),
          default: () => ({})
        },
        currentStep: null as any,
        status: null as any,
        error: null as any,
        output: null as any,
      } as any
    });
  }

  addNode(node: AgentWorkflowNode) {
    this.graphBuilder.addNode(node.name, node.func);
  }

  addEdge(edge: AgentWorkflowEdge) {
    if (typeof edge.to === 'string') {
      this.graphBuilder.addEdge(edge.from, edge.to);
    } else {
      this.graphBuilder.addConditionalEdges(edge.from, edge.to);
    }
  }

  setEntryPoint(nodeName: string) {
    this.graphBuilder.addEdge('__start__', nodeName);
  }

  setFinishPoint(nodeName: string) {
    this.graphBuilder.addEdge(nodeName, '__end__');
  }

  compile() {
    return this.graphBuilder.compile({ checkpointer: this.memory });
  }
}

