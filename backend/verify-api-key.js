/**
 * API Key Validator for DojiHunter
 * 
 * Run: node verify-api-key.js YOUR_API_KEY
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

const testApiKey = async (apiKey) => {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 GEMINI API KEY VALIDATOR');
  console.log('='.repeat(60));
  
  // Validate format
  console.log('\n📋 KEY FORMAT CHECK:');
  console.log(`   Length: ${apiKey.length} characters`);
  console.log(`   Starts with: ${apiKey.substring(0, 8)}...`);
  console.log(`   Expected length: 39 characters`);
  console.log(`   Expected start: AIzaSy...`);
  
  if (apiKey.length !== 39) {
    console.log('\n❌ INVALID: Key length should be 39 characters!');
    console.log('   Your key has', apiKey.length, 'characters');
    return false;
  }
  
  if (!apiKey.startsWith('AIzaSy')) {
    console.log('\n❌ INVALID: Key should start with "AIzaSy"!');
    return false;
  }
  
  console.log('\n✅ Format looks valid. Testing API connection...\n');
  
  // Test API call
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    console.log('📤 Sending test request...');
    const result = await model.generateContent('Reply with just the word: SUCCESS');
    const text = (await result.response).text();
    
    console.log('\n✅ API KEY IS VALID!');
    console.log('   Response:', text.trim());
    console.log('\n🎉 You can use this API key in your .env file');
    return true;
    
  } catch (error) {
    console.log('\n❌ API KEY ERROR:');
    
    if (error.message.includes('400')) {
      console.log('   Status: 400 Bad Request');
      console.log('   Reason: API key is INVALID');
      console.log('\n   Solutions:');
      console.log('   1. Go to https://aistudio.google.com/apikey');
      console.log('   2. Create a NEW API key');
      console.log('   3. Copy the EXACT key (39 characters)');
    } else if (error.message.includes('429')) {
      console.log('   Status: 429 Too Many Requests');
      console.log('   Reason: Quota exceeded');
      console.log('\n   Solutions:');
      console.log('   1. Wait for quota to reset (usually per minute/day)');
      console.log('   2. Or create API key from NEW Google account/project');
    } else if (error.message.includes('403')) {
      console.log('   Status: 403 Forbidden');
      console.log('   Reason: API not enabled or blocked');
      console.log('\n   Solutions:');
      console.log('   1. Enable Generative AI API in Google Cloud Console');
      console.log('   2. Check API restrictions');
    } else {
      console.log('   Error:', error.message.substring(0, 200));
    }
    
    return false;
  }
};

// Get API key from command line or environment
const apiKey = process.argv[2] || process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  console.log('\nUsage: node verify-api-key.js YOUR_API_KEY');
  console.log('\nOr set GOOGLE_AI_API_KEY in .env file and run:');
  console.log('       node verify-api-key.js');
  process.exit(1);
}

testApiKey(apiKey);
