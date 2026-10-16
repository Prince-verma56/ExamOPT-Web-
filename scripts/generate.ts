import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const generateModule = (name: string) => {
  const dir = path.join(process.cwd(), 'modules', name);
  if (fs.existsSync(dir)) {
    console.log(`❌ Module ${name} already exists.`);
    return;
  }
  
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'components'));
  fs.mkdirSync(path.join(dir, 'tests'));
  
  fs.writeFileSync(path.join(dir, 'actions.ts'), `// Actions for ${name}\nexport {};`);
  fs.writeFileSync(path.join(dir, 'queries.ts'), `// Queries for ${name}\nexport {};`);
  fs.writeFileSync(path.join(dir, 'schema.ts'), `// Zod schemas for ${name}\nimport { z } from 'zod';\nexport {};`);
  fs.writeFileSync(path.join(dir, 'types.ts'), `// Types for ${name}\nexport {};`);
  
  console.log(`✅ Module ${name} generated at modules/${name}`);
};

const generateTool = (name: string) => {
  const file = path.join(process.cwd(), 'ai', 'tools', `${name}.ts`);
  if (fs.existsSync(file)) {
    console.log(`❌ Tool ${name} already exists.`);
    return;
  }

  const content = `import { z } from 'zod';
import { AITool } from './registry';

export const ${name}Tool: AITool = {
  name: '${name}',
  description: 'Description of what this tool does',
  schema: z.object({
    // define input parameters here
  }),
  permissionLevel: 'READ',
  executor: async (input, context) => {
    // Implement tool logic
    return { success: true };
  }
};
`;
  fs.writeFileSync(file, content);
  console.log(`✅ Tool ${name} generated at ai/tools/${name}.ts\nDon't forget to register it in registry.ts!`);
};

const generateAgent = (name: string) => {
  const file = path.join(process.cwd(), 'ai', 'agents', `${name}.ts`);
  if (fs.existsSync(file)) { console.log(`❌ Agent ${name} already exists.`); return; }
  fs.writeFileSync(file, `// Agent: ${name}\nexport {};`);
  console.log(`✅ Agent ${name} generated.`);
};

const generateCrud = (name: string) => {
  const dir = path.join(process.cwd(), 'modules', name);
  generateModule(name); // creates base module
  fs.writeFileSync(path.join(dir, 'schema.ts'), `import { z } from 'zod';\nexport const ${name}Schema = z.object({ id: z.string() });`);
  console.log(`✅ CRUD scaffolded in modules/${name}`);
};

const generateApi = (name: string) => {
  const dir = path.join(process.cwd(), 'app', 'api', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'route.ts'), `import { NextResponse } from 'next/server';\nexport async function GET() { return NextResponse.json({ success: true }); }`);
  console.log(`✅ API Route generated at app/api/${name}/route.ts`);
};

const question = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

async function main() {
  const type = process.argv[2];
  const name = process.argv[3];

  if (type && name) {
    if (type === 'module') generateModule(name);
    else if (type === 'tool') generateTool(name);
    else if (type === 'crud') generateCrud(name);
    else if (type === 'agent') generateAgent(name);
    else if (type === 'api') generateApi(name);
    else console.log('❌ Unknown type.');
    rl.close();
    return;
  }

  console.log('\nWhat would you like to generate?');
  console.log('1. module\n2. tool\n3. crud\n4. agent\n5. api\n6. exit\n');
  
  const choice = await question('> ');
  
  if (choice === '1' || choice === 'module') {
    const moduleName = await question('Module name: ');
    generateModule(moduleName);
  } else if (choice === '2' || choice === 'tool') {
    const toolName = await question('Tool name (camelCase): ');
    generateTool(toolName);
  } else if (choice === '3' || choice === 'crud') {
    const name = await question('CRUD model name: ');
    generateCrud(name);
  } else if (choice === '4' || choice === 'agent') {
    const name = await question('Agent name: ');
    generateAgent(name);
  } else if (choice === '5' || choice === 'api') {
    const name = await question('API path (e.g. users): ');
    generateApi(name);
  } else {
    console.log('Exiting.');
  }

  rl.close();
}

main();
