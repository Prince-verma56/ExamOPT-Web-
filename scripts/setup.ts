import { execSync } from 'child_process';
import fs from 'fs';

function run(command: string, name: string) {
  console.log(`\n⏳ Running: ${name}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${name} completed.`);
  } catch (err) {
    console.error(`❌ ${name} failed.`);
    process.exit(1);
  }
}

async function setup() {
  console.log('\n🚀 Starting Fullstack Hackathon Template Setup...\n');

  // Verify node/npm
  run('npm run doctor', 'Doctor Checks');

  // Start infrastructure
  console.log('\n[Note] Setup assumes Docker is running on your machine.');
  try {
    execSync('docker info', { stdio: 'ignore' });
    run('npm run infra:up', 'Starting Infrastructure (Docker)');
  } catch {
    console.log('⚠️ Docker is not running. Skipping infrastructure start.');
  }

  // Prisma Generation
  run('npm run generate', 'Prisma Generate');
  
  // Prisma Migration (Skip if docker not running because we need DB)
  try {
    execSync('docker info', { stdio: 'ignore' });
    run('npm run db:push', 'Database Schema Push (Skipping migrations for initial dev setup speed)');
    run('npm run db:seed', 'Seeding Database');
  } catch {
    console.log('⚠️ Skipping DB migrations since Docker is not running.');
  }

  console.log('\n🎉 Setup Complete! Run `npm run dev` to start the application.');
}

setup();
