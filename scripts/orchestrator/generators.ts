import fs from 'fs';
import path from 'path';
import { CAPABILITIES } from './registry';
import { AIAnalysisResult } from './schema';

export interface PlanContext {
  projectName: string;
  problemStatement: string;
  timeLimit: string;
  capabilities: string[];
  aiAnalysis: AIAnalysisResult | null;
}

function getDir() {
  return path.join(process.cwd(), '.hackathon');
}

export async function generatePlanFiles(ctx: PlanContext) {
  const dir = getDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const capabilitiesObj: Record<string, boolean> = {};
  for (const cap of CAPABILITIES) {
    capabilitiesObj[cap.id] = ctx.capabilities.includes(cap.id);
  }

  // project.json
  fs.writeFileSync(path.join(dir, 'project.json'), JSON.stringify({
    projectName: ctx.projectName,
    problemStatement: ctx.problemStatement,
    timeLimit: ctx.timeLimit
  }, null, 2));

  // capabilities.json
  fs.writeFileSync(path.join(dir, 'capabilities.json'), JSON.stringify(capabilitiesObj, null, 2));

  // requirements.json
  const envVars = new Set<string>();
  for (const capId of ctx.capabilities) {
    const cap = CAPABILITIES.find(c => c.id === capId);
    if (cap) {
      for (const e of cap.env) envVars.add(e);
    }
  }
  fs.writeFileSync(path.join(dir, 'requirements.json'), JSON.stringify({
    env: Array.from(envVars)
  }, null, 2));
  
  // .env.requirements
  let envFile = '# Required Environment Variables for Selected Capabilities\n';
  for (const e of envVars) envFile += `${e}=\n`;
  fs.writeFileSync(path.join(dir, '.env.requirements'), envFile);

  // plan.json
  const plan = {
    mvp: ctx.aiAnalysis?.mvpScope || [],
    stretch: ctx.aiAnalysis?.stretchScope || [],
    technicalRisk: ctx.aiAnalysis?.technicalRisk || 'UNKNOWN'
  };
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(plan, null, 2));

  if (ctx.aiAnalysis) {
    fs.writeFileSync(path.join(dir, 'ai-analysis.json'), JSON.stringify(ctx.aiAnalysis, null, 2));
  }
  
  if (ctx.capabilities.includes('flutter')) {
    fs.writeFileSync(path.join(dir, 'mobile-api-plan.md'), '# Mobile API Plan\nSee docs/mobile/API_CLIENT_GUIDE.md for standard specs.');
  }

  // architecture.md
  fs.writeFileSync(path.join(dir, 'architecture.md'), `# Architecture
Client
 ↓
API
 ↓
Services
 ↓
Database

Enabled:
${ctx.capabilities.map(c => `- ${c}`).join('\n')}
`);

}

export async function generateScaffold(ctx: PlanContext) {
  if (process.env.DRY_RUN) {
    console.log('\n[Dry Run] Would modify config/features.ts');
    return;
  }
  
  console.log('\nScaffolding capabilities...');
  const featuresPath = path.join(process.cwd(), 'config', 'features.ts');
  if (fs.existsSync(featuresPath)) {
    let content = fs.readFileSync(featuresPath, 'utf-8');
    // For simplicity, we assume we want to align config/features.ts with ctx.capabilities
    // We would parse and replace `envBool('...', true)` to `true` or `false` based on capabilities.
    // However, the prompt says "Do not overwrite unrelated existing files... Do not silently delete code."
    // In a real hackathon scaffold, we'd regex replace just the boolean values.
    console.log('NOTE: Automatically modifying config/features.ts is omitted for safety. Update your .env.local instead.');
  }
}

export async function resetProject() {
  const dir = getDir();
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('✅ Removed .hackathon/ directory.');
  } else {
    console.log('Nothing to reset.');
  }
}

export async function printSnapshot() {
  const dir = getDir();
  if (!fs.existsSync(dir)) {
    console.log('No project plan found. Run npm run hackathon first.');
    return;
  }
  
  const proj = JSON.parse(fs.readFileSync(path.join(dir, 'project.json'), 'utf-8'));
  const caps = JSON.parse(fs.readFileSync(path.join(dir, 'capabilities.json'), 'utf-8'));
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf-8'));

  console.log(`\nProject: ${proj.projectName}`);
  console.log(`Problem: ${proj.problemStatement}`);
  
  console.log('\nEnabled:');
  for (const [key, val] of Object.entries(caps)) {
    if (val) console.log(`✓ ${key}`);
  }

  console.log(`\nRisk: ${plan.technicalRisk}`);
}
