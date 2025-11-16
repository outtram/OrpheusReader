/**
 * Setup Verification Script
 *
 * Checks if the application is properly configured and ready to run
 * Run with: node verify-setup.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║          Orpheus Reader - Setup Verification            ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

let issuesFound = 0;
let warningsFound = 0;

// Helper functions
function checkExists(filepath, description) {
  const exists = fs.existsSync(filepath);
  console.log(`${exists ? '✓' : '✗'} ${description}: ${exists ? 'Found' : 'Missing'}`);
  if (!exists) issuesFound++;
  return exists;
}

function checkEnvVar(varName, description) {
  // Try to load .env
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log(`⚠ ${description}: No .env file found`);
    warningsFound++;
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const hasVar = envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your_`);
  console.log(`${hasVar ? '✓' : '⚠'} ${description}: ${hasVar ? 'Configured' : 'Not configured'}`);
  if (!hasVar) warningsFound++;
  return hasVar;
}

// Check required files
console.log('Checking required files...\n');

checkExists('package.json', 'Package configuration');
checkExists('src/backend/server.js', 'Server entry point');
checkExists('src/frontend/index.html', 'Homepage');
checkExists('src/frontend/history.html', 'History page');
checkExists('src/frontend/styles.css', 'Stylesheets');
checkExists('src/frontend/app.js', 'Frontend JavaScript');
checkExists('.env.example', 'Environment template');

// Check backend structure
console.log('\nChecking backend structure...\n');

checkExists('src/backend/providers/base.js', 'Base TTS provider');
checkExists('src/backend/providers/deepinfra.js', 'DeepInfra provider');
checkExists('src/backend/providers/huggingface.js', 'Hugging Face provider');
checkExists('src/backend/providers/index.js', 'Provider factory');

checkExists('src/backend/utils/chunker.js', 'Text chunker');
checkExists('src/backend/utils/fileParser.js', 'File parser');
checkExists('src/backend/utils/audioProcessor.js', 'Audio processor');
checkExists('src/backend/utils/storage.js', 'Storage system');

// Check directories
console.log('\nChecking directories...\n');

checkExists('conversions', 'Conversions directory');
checkExists('conversions/audio', 'Audio storage directory');
checkExists('temp', 'Temporary files directory');
checkExists('public', 'Public assets directory');

// Check environment configuration
console.log('\nChecking environment configuration...\n');

checkEnvVar('DEEPINFRA_API_KEY', 'DeepInfra API key');
checkEnvVar('HF_API_KEY', 'Hugging Face API key');

// Check for FFmpeg
console.log('\nChecking optional dependencies...\n');

try {
  const { execSync } = await import('child_process');
  execSync('ffmpeg -version', { stdio: 'ignore' });
  console.log('✓ FFmpeg: Installed');
} catch (error) {
  console.log('⚠ FFmpeg: Not installed (optional but recommended)');
  warningsFound++;
}

// Check Node.js version
console.log('\nChecking Node.js version...\n');

const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion >= 16) {
  console.log(`✓ Node.js version: ${nodeVersion} (compatible)`);
} else {
  console.log(`✗ Node.js version: ${nodeVersion} (requires v16 or higher)`);
  issuesFound++;
}

// Check package.json dependencies
console.log('\nChecking dependencies...\n');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const requiredDeps = [
  'express',
  'cors',
  'dotenv',
  'multer',
  'pdf-parse',
  'mammoth',
  'marked',
  'node-fetch',
  'uuid'
];

const installedDeps = fs.existsSync('node_modules');
if (installedDeps) {
  console.log('✓ Dependencies: Installed');

  // Check if required packages are in package.json
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
  if (missingDeps.length > 0) {
    console.log(`⚠ Missing from package.json: ${missingDeps.join(', ')}`);
    warningsFound++;
  }
} else {
  console.log('✗ Dependencies: Not installed (run: npm install)');
  issuesFound++;
}

// Summary
console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║                   Verification Summary                   ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

if (issuesFound === 0 && warningsFound === 0) {
  console.log('🎉 Perfect! Your setup is complete and ready to run.\n');
  console.log('Next steps:');
  console.log('  1. Run: npm start');
  console.log('  2. Open: http://localhost:3000\n');
} else {
  if (issuesFound > 0) {
    console.log(`❌ Found ${issuesFound} issue(s) that must be fixed:\n`);
    console.log('Required actions:');

    if (!fs.existsSync('node_modules')) {
      console.log('  • Run: npm install');
    }

    if (!fs.existsSync('.env')) {
      console.log('  • Create .env file: cp .env.example .env');
      console.log('  • Add your API key(s) to .env');
    }
  }

  if (warningsFound > 0) {
    console.log(`\n⚠️  Found ${warningsFound} warning(s):\n`);
    console.log('Recommended actions:');

    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      console.log('  • Configure .env with your API keys');
    }

    try {
      const { execSync } = await import('child_process');
      execSync('ffmpeg -version', { stdio: 'ignore' });
    } catch (error) {
      console.log('  • Install FFmpeg for better audio concatenation');
      console.log('    macOS: brew install ffmpeg');
      console.log('    Ubuntu: sudo apt-get install ffmpeg');
    }
  }

  console.log('\n📚 See QUICKSTART.md for detailed setup instructions.\n');
}

// Exit with appropriate code
process.exit(issuesFound > 0 ? 1 : 0);
