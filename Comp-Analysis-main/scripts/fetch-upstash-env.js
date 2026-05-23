#!/usr/bin/env node

/**
 * Fetch Upstash Redis credentials from Vercel environment variables
 * 
 * Usage:
 *   node scripts/fetch-upstash-env.js <vercel-token> <project-id>
 * 
 * Or set env vars:
 *   VERCEL_TOKEN=<token>
 *   VERCEL_PROJECT_ID=<project-id>
 *   node scripts/fetch-upstash-env.js
 */

const fs = require('fs');
const path = require('path');

async function fetchUpstashEnv() {
  const vercelToken = process.argv[2] || process.env.VERCEL_TOKEN;
  const projectId = process.argv[3] || process.env.VERCEL_PROJECT_ID;

  if (!vercelToken) {
    console.error('❌ Error: VERCEL_TOKEN not provided');
    console.log('\nUsage:');
    console.log('  node scripts/fetch-upstash-env.js <vercel-token> <project-id>');
    console.log('\nOr set environment variables:');
    console.log('  $env:VERCEL_TOKEN = "<your-token>"');
    console.log('  $env:VERCEL_PROJECT_ID = "<your-project-id>"');
    console.log('  node scripts/fetch-upstash-env.js');
    console.log('\nGet your Vercel token from: https://vercel.com/account/tokens');
    process.exit(1);
  }

  if (!projectId) {
    console.error('❌ Error: VERCEL_PROJECT_ID not provided');
    console.log('\nUsage:');
    console.log('  node scripts/fetch-upstash-env.js <vercel-token> <project-id>');
    console.log('\nOr set environment variables:');
    console.log('  $env:VERCEL_TOKEN = "<your-token>"');
    console.log('  $env:VERCEL_PROJECT_ID = "<your-project-id>"');
    console.log('  node scripts/fetch-upstash-env.js');
    console.log('\nFind your project ID in Vercel dashboard URL: vercel.com/<team>/<project-id>');
    process.exit(1);
  }

  try {
    console.log('🔄 Fetching environment variables from Vercel...');
    
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/env`,
      {
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vercel API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const envs = data.envs || [];

    // Find Upstash variables
    const upstashUrl = envs.find(e => e.key === 'UPSTASH_REDIS_REST_URL');
    const upstashToken = envs.find(e => e.key === 'UPSTASH_REDIS_REST_TOKEN');

    if (!upstashUrl || !upstashToken) {
      console.warn('⚠️  Upstash environment variables not found in Vercel');
      console.log('\nTo set them up:');
      console.log('1. Create a Redis database at https://console.upstash.com');
      console.log('2. Copy the REST API URL and token');
      console.log('3. Add to Vercel: https://vercel.com/<team>/<project>/settings/environment-variables');
      console.log('   - UPSTASH_REDIS_REST_URL');
      console.log('   - UPSTASH_REDIS_REST_TOKEN');
      process.exit(1);
    }

    // Update .env file
    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');

    // Replace or add Upstash variables
    const urlValue = upstashUrl.value;
    const tokenValue = upstashToken.value;

    if (envContent.includes('UPSTASH_REDIS_REST_URL=')) {
      envContent = envContent.replace(
        /UPSTASH_REDIS_REST_URL=.*/,
        `UPSTASH_REDIS_REST_URL=${urlValue}`
      );
    } else {
      envContent += `\nUPSTASH_REDIS_REST_URL=${urlValue}`;
    }

    if (envContent.includes('UPSTASH_REDIS_REST_TOKEN=')) {
      envContent = envContent.replace(
        /UPSTASH_REDIS_REST_TOKEN=.*/,
        `UPSTASH_REDIS_REST_TOKEN=${tokenValue}`
      );
    } else {
      envContent += `\nUPSTASH_REDIS_REST_TOKEN=${tokenValue}`;
    }

    fs.writeFileSync(envPath, envContent);

    console.log('✅ Successfully fetched and updated .env file');
    console.log(`   UPSTASH_REDIS_REST_URL: ${urlValue.substring(0, 50)}...`);
    console.log(`   UPSTASH_REDIS_REST_TOKEN: ${tokenValue.substring(0, 20)}...`);
    console.log('\n🚀 Your app is now ready to use Upstash Redis!');
    console.log('   Restart your dev server: npm run dev');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fetchUpstashEnv();
