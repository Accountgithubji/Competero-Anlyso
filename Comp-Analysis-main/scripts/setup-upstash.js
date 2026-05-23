#!/usr/bin/env node

/**
 * Interactive Upstash setup wizard
 * Usage: node scripts/setup-upstash.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         Upstash Redis Setup Wizard                         ║');
  console.log('║    Configure persistent database for Vercel deployment     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📋 This wizard will help you set up Upstash Redis.\n');
  console.log('Prerequisites:');
  console.log('  1. Upstash account (free at https://console.upstash.com)');
  console.log('  2. Redis database created');
  console.log('  3. REST API credentials copied\n');

  const proceed = await question('Do you have your Upstash credentials ready? (yes/no): ');
  if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
    console.log('\n📖 Please follow these steps first:');
    console.log('  1. Go to https://console.upstash.com');
    console.log('  2. Create a new Redis database');
    console.log('  3. Click "REST API" tab');
    console.log('  4. Copy the URL and token');
    console.log('  5. Run this script again\n');
    rl.close();
    process.exit(0);
  }

  console.log('\n🔐 Enter your Upstash credentials:\n');

  const url = await question('UPSTASH_REDIS_REST_URL: ');
  if (!url.startsWith('https://')) {
    console.error('\n❌ Invalid URL. Must start with https://');
    rl.close();
    process.exit(1);
  }

  const token = await question('UPSTASH_REDIS_REST_TOKEN: ');
  if (token.length < 10) {
    console.error('\n❌ Invalid token. Token seems too short.');
    rl.close();
    process.exit(1);
  }

  console.log('\n🧪 Testing connection...');
  try {
    const response = await fetch(`${url}/ping`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log('✅ Connection successful!\n');
  } catch (error) {
    console.error(`❌ Connection failed: ${error.message}`);
    console.log('   Please verify your credentials and try again.\n');
    rl.close();
    process.exit(1);
  }

  console.log('💾 Updating .env file...');
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');

  // Replace or add Upstash variables
  if (envContent.includes('UPSTASH_REDIS_REST_URL=')) {
    envContent = envContent.replace(
      /UPSTASH_REDIS_REST_URL=.*/,
      `UPSTASH_REDIS_REST_URL=${url}`
    );
  } else {
    envContent += `\nUPSTASH_REDIS_REST_URL=${url}`;
  }

  if (envContent.includes('UPSTASH_REDIS_REST_TOKEN=')) {
    envContent = envContent.replace(
      /UPSTASH_REDIS_REST_TOKEN=.*/,
      `UPSTASH_REDIS_REST_TOKEN=${token}`
    );
  } else {
    envContent += `\nUPSTASH_REDIS_REST_TOKEN=${token}`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file updated\n');

  console.log('📝 Next steps:\n');
  console.log('  1. Restart your dev server:');
  console.log('     npm run dev\n');
  console.log('  2. Test the connection:');
  console.log('     curl http://localhost:3000/api/health\n');
  console.log('  3. For Vercel deployment, add these env vars:');
  console.log('     https://vercel.com/dashboard → Settings → Environment Variables\n');
  console.log('  4. Deploy to Vercel:');
  console.log('     vercel deploy --prod\n');

  console.log('📚 For more info, see: UPSTASH_SETUP.md\n');

  rl.close();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  rl.close();
  process.exit(1);
});
