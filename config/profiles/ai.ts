import { minimalProfile } from './minimal';

export const aiProfile = {
  ...minimalProfile,
  ai: true,
  agents: false,
  rag: false,
  mcp: false,
};
