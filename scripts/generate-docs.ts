import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'docs', 'hackathon-orchestrator');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const files: Record<string, string> = {
  'manual-mode.md': '# Manual Mode\n\nManual mode allows you to granularly pick and choose which capabilities to enable in the project configuration without sending any data to an AI provider.',
  'ai-mode.md': '# AI Mode\n\nAI mode takes a problem statement, target clients, and a time limit, and uses a structured output prompt to recommend specific architecture capabilities for your hackathon.',
  'capabilities.md': '# Capabilities\n\nCapabilities are registered in `scripts/orchestrator/registry.ts`. They represent abstract building blocks (like RAG, Auth, Maps) that orchestrator translates into project configurations.',
  'profiles.md': '# Profiles\n\nDepending on your capabilities, the orchestrator generates a `.hackathon/plan.json` profile indicating MVP scope and Risk metrics.',
  'configuration.md': '# Configuration\n\nThe `.hackathon` directory contains your project\'s configuration. Do not commit these planning files if they contain sensitive prompt information, although `.gitignore` typically excludes secrets.',
  'safety.md': '# Safety\n\nThe orchestrator will NOT execute arbitrary bash commands or overwrite application code without a dry-run preview and explicit confirmation.',
  'troubleshooting.md': '# Troubleshooting\n\n- **AI Fails**: Ensure `OPENAI_API_KEY` is set.\n- **Dependencies loop**: Capabilities use a graph resolver. Ensure no circular requirements exist in the registry.'
};

for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(dir, name), content);
}

console.log('Docs generated.');
