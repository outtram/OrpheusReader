/**
 * Test script for Segmind Orpheus TTS provider
 *
 * This script tests the Segmind provider integration by:
 * 1. Loading the API key from .env
 * 2. Creating a Segmind provider instance
 * 3. Generating a short test audio
 * 4. Saving it to a file
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { SegmindProvider } from './src/backend/providers/segmind.js';

// Load environment variables
dotenv.config();

async function testSegmind() {
  console.log('🧪 Testing Segmind Orpheus TTS Provider\n');

  // Check API key
  const apiKey = process.env.SEGMIND_API_KEY;
  if (!apiKey) {
    console.error('❌ SEGMIND_API_KEY not found in .env file');
    console.log('\nPlease add your API key to .env:');
    console.log('SEGMIND_API_KEY=your_api_key_here\n');
    process.exit(1);
  }

  console.log(`✓ API Key loaded: ${apiKey.substring(0, 10)}...`);

  // Create provider
  const provider = new SegmindProvider(apiKey);
  console.log(`✓ Provider created: ${provider.name}`);
  console.log(`  Max characters: ${provider.getMaxCharacters()}`);

  // Test text
  const testText = "Hello! This is a test of the Orpheus text-to-speech system. It sounds pretty good, doesn't it?";
  console.log(`\n📝 Test text: "${testText}"`);
  console.log(`   Length: ${testText.length} characters\n`);

  try {
    console.log('🎤 Generating speech...');

    const startTime = Date.now();
    const audioBuffer = await provider.generateSpeech(testText, {
      voice: 'dan',
      temperature: 0.6,
      max_new_tokens: 500
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✓ Audio generated in ${duration}s`);
    console.log(`  Buffer size: ${(audioBuffer.length / 1024).toFixed(2)} KB`);

    // Save to file
    const outputDir = './test-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'segmind-test.mp3');
    fs.writeFileSync(outputPath, audioBuffer);

    console.log(`✓ Audio saved to: ${outputPath}`);
    console.log('\n✅ Segmind provider test PASSED!\n');
    console.log('You can now:');
    console.log('1. Play the audio file to verify quality');
    console.log('2. Start the server with: npm start');
    console.log('3. Visit http://localhost:3000\n');

  } catch (error) {
    console.error('\n❌ Test FAILED:');
    console.error(`   Error: ${error.message}`);

    if (error.message.includes('Invalid or missing API key')) {
      console.log('\n💡 Your API key may be invalid. Please check:');
      console.log('   - The key is correct in .env');
      console.log('   - You have credits in your Segmind account');
    } else if (error.message.includes('Rate limit')) {
      console.log('\n💡 Rate limit exceeded. Please wait a moment and try again.');
    } else if (error.message.includes('Insufficient credits')) {
      console.log('\n💡 Your Segmind account needs more credits.');
      console.log('   Visit: https://www.segmind.com/');
    }

    console.log('');
    process.exit(1);
  }
}

// Run test
testSegmind().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
