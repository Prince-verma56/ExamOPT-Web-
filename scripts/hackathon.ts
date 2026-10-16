import { input, select, checkbox, confirm, Separator } from '@inquirer/prompts';
import { CAPABILITIES, CapabilityCategory, resolveDependencies } from './orchestrator/registry';
import { isAIConfigured, analyzeProblem } from './orchestrator/ai';
import { generatePlanFiles, printSnapshot, generateScaffold, resetProject } from './orchestrator/generators';
import fs from 'fs';
import path from 'path';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--dry-run')) {
    console.log('[Orchestrator] Dry-run mode enabled.');
    process.env.DRY_RUN = 'true';
  }
  
  if (args.includes('reset')) {
    await resetProject();
    return;
  }
  if (args.includes('snapshot')) {
    await printSnapshot();
    return;
  }

  console.log('\n==================================================');
  console.log('FULLSTACK HACKATHON TEMPLATE');
  console.log('Turn a problem statement into an approved technical project configuration.');
  console.log('==================================================\n');

  let modeOverride = null;
  if (args.includes('ai')) modeOverride = 'AI';
  if (args.includes('manual')) modeOverride = 'MANUAL';

  const projectName = await input({ message: 'Project name:', default: 'MyHackathonApp' });
  const problemStatement = await input({ message: 'Problem statement:', validate: (v) => v.length > 5 || 'Please provide a valid statement.' });
  
  const clients = await checkbox({
    message: 'Target client(s):',
    choices: [
      { name: 'Next.js Web', value: 'nextjs', checked: true },
      { name: 'Flutter Mobile', value: 'flutter' },
    ]
  });

  const timeLimit = await select({
    message: 'Time limit:',
    choices: [
      { name: '8 hours', value: '8' },
      { name: '12 hours', value: '12' },
      { name: '24 hours', value: '24' },
      { name: '36 hours', value: '36' },
      { name: '48 hours', value: '48' }
    ],
    default: '24'
  });

  let mode = modeOverride;
  if (!mode) {
    mode = await select({
      message: 'Choose configuration mode:',
      choices: [
        { name: 'AI-Assisted (Recommended)', value: 'AI' },
        { name: 'Manual', value: 'MANUAL' }
      ]
    });
  }

  if (mode === 'AI' && !isAIConfigured()) {
    console.log('\n[!] No AI provider configured (OPENAI_API_KEY missing). Falling back to manual mode.\n');
    mode = 'MANUAL';
  }

  let selectedCapabilities: string[] = [];
  let aiAnalysis = null;

  if (mode === 'AI') {
    console.log('\nAnalyzing problem statement...');
    aiAnalysis = await analyzeProblem(problemStatement, clients, timeLimit);
    
    if (aiAnalysis) {
      console.log('\n==================================================');
      console.log('AI PROJECT ANALYSIS');
      console.log('==================================================');
      console.log(`Problem: ${aiAnalysis.problemSummary}`);
      console.log(`Primary users: ${aiAnalysis.primaryUsers.join(', ')}`);
      console.log(`Core pain: ${aiAnalysis.corePainPoint}`);
      console.log(`MVP Scope: ${aiAnalysis.mvpScope.join(', ')}`);
      console.log('\nRecommended capabilities:');
      aiAnalysis.recommendedCapabilities.forEach(c => console.log(`✓ ${c}`));
      console.log('\nOptional capabilities:');
      aiAnalysis.optionalCapabilities.forEach(c => console.log(`○ ${c}`));
      console.log('\nNot needed:');
      aiAnalysis.unnecessaryCapabilities.forEach(c => console.log(`✗ ${c}`));
      console.log(`\nAI reasoning:\n${aiAnalysis.reasoning}`);
      console.log('==================================================\n');

      const action = await select({
        message: 'Apply AI recommendations?',
        choices: [
          { name: 'Yes', value: 'YES' },
          { name: 'Review manually', value: 'REVIEW' },
          { name: 'Cancel', value: 'CANCEL' }
        ]
      });

      if (action === 'CANCEL') {
        console.log('Cancelled.');
        return;
      }

      if (action === 'YES') {
        selectedCapabilities = [...aiAnalysis.recommendedCapabilities];
      } else {
        mode = 'MANUAL';
        selectedCapabilities = [...aiAnalysis.recommendedCapabilities]; // pass as defaults
      }
    } else {
      console.log('\n[!] AI analysis failed. Falling back to manual mode.\n');
      mode = 'MANUAL';
    }
  }

  if (mode === 'MANUAL') {
    const choices = [];
    const categories: { label: string, val: CapabilityCategory }[] = [
      { label: 'CORE', val: 'core' },
      { label: 'AI', val: 'ai' },
      { label: 'CLIENT', val: 'client' },
      { label: 'INFRASTRUCTURE', val: 'infrastructure' }
    ];

    for (const cat of categories) {
      choices.push(new Separator(`--- ${cat.label} ---`));
      const caps = CAPABILITIES.filter(c => c.category === cat.val);
      for (const c of caps) {
        choices.push({
          name: c.name,
          value: c.id,
          checked: selectedCapabilities.includes(c.id) || (c.id === 'nextjs' && clients.includes('nextjs')) || (c.id === 'flutter' && clients.includes('flutter'))
        });
      }
    }

    selectedCapabilities = await checkbox({
      message: 'Select project capabilities:',
      choices,
      loop: false,
    });
  }

  // Resolve dependencies
  console.log('\nResolving dependencies...');
  const resolvedCapabilities = resolveDependencies(selectedCapabilities);
  
  const added = resolvedCapabilities.filter(c => !selectedCapabilities.includes(c));
  if (added.length > 0) {
    console.log('Automatically enabled dependencies:');
    added.forEach(a => console.log(`+ ${a}`));
  }

  // Generate plans
  console.log('\nGenerating capability manifest and project plans...');
  const planContext = {
    projectName,
    problemStatement,
    timeLimit,
    capabilities: resolvedCapabilities,
    aiAnalysis
  };
  await generatePlanFiles(planContext);

  console.log('✅ Project plan saved to .hackathon/');

  const doScaffold = await confirm({ message: 'Generate approved project scaffold?', default: false });
  if (doScaffold) {
    await generateScaffold(planContext);
    console.log('\n✅ Your infrastructure is ready.\nNow build the problem-specific product.');
  } else {
    console.log('\n✅ Plan saved. No code modified.');
  }
}

main().catch(err => {
  if (err.name === 'ExitPromptError') {
    console.log('\nExiting.');
  } else {
    console.error(err);
  }
});
