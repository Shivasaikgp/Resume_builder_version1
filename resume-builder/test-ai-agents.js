#!/usr/bin/env node

// Simple test script to verify AI agents are working with the OpenAI API key
const { config } = require('dotenv');
config();

console.log('🧪 Testing AI Agents...\n');

// Check if OpenAI API key is configured
const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) {
  console.error('❌ No OpenAI API key found');
  process.exit(1);
}

console.log('✅ OpenAI API key found:', openaiKey.substring(0, 20) + '...');

// Test a simple OpenAI API call
async function testOpenAI() {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: 'Analyze this resume experience: "Software Engineer at Tech Corp, built web applications". Provide a brief quality score out of 10 and one improvement suggestion.'
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI API Response:');
    console.log(data.choices[0].message.content);
    console.log('\n🎉 AI agents are working properly with the configured API key!');
    
  } catch (error) {
    console.error('❌ OpenAI API Error:', error.message);
    process.exit(1);
  }
}

testOpenAI();