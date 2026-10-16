import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function checkCommand(command: string, name: string): boolean {
  try {
    execSync(command, { stdio: 'ignore' });
    console.log(`✅ ${name} is installed.`);
    return true;
  } catch {
    console.log(`❌ ${name} is NOT installed.`);
    return false;
  }
}

async function runDoctor() {
  console.log('\n🩺 Running Fullstack Template Doctor...\n');
  
  let hasErrors = false;

  // Runtime
  const nodeVersion = process.version;
  console.log(`✅ Node.js: ${nodeVersion}`);
  
  // Package manager
  checkCommand('npm -v', 'npm') || (hasErrors = true);
  
  // Docker
  checkCommand('docker --version', 'Docker') || (hasErrors = true);

  // Env file
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file exists.');
  } else {
    console.log('❌ .env file is missing. Run `cp .env.example .env`.');
    hasErrors = true;
  }

  // Database / Prisma
  try {
    const prismaOutput = execSync('npx prisma -v', { encoding: 'utf-8' });
    console.log('✅ Prisma CLI is available.');
  } catch {
    console.log('❌ Prisma CLI is NOT available.');
    hasErrors = true;
  }

  console.log('\n--- Features ---');
  
  // Basic check of env vars for feature flags
  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  const features = [
    'FEATURE_AI',
    'FEATURE_VOICE',
    'FEATURE_AGENTS',
    'FEATURE_RAG',
    'FEATURE_MCP',
    'FEATURE_DEMO_MODE'
  ];

  features.forEach(feat => {
    if (envContent.includes(`${feat}=true`)) {
      console.log(`🟢 ${feat} is ENABLED`);
    } else {
      console.log(`⚪ ${feat} is DISABLED`);
    }
  });

  if (hasErrors) {
    console.log('\n⚠️ Doctor found issues. Please fix them before running `npm run setup`.');
    process.exit(1);
  } else {
    console.log('\n✅ System is READY.');
  }
}

runDoctor();
