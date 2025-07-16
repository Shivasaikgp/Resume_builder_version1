const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// AI enhancement endpoint
app.post('/api/enhance', async (req, res) => {
  try {
    const { text, context, section } = req.body;
    
    // Mock AI response for now - replace with actual OpenAI integration
    const enhancedText = await enhanceWithAI(text, context, section);
    
    res.json({ enhancedText });
  } catch (error) {
    console.error('Enhancement error:', error);
    res.status(500).json({ error: 'Failed to enhance text' });
  }
});

async function enhanceWithAI(text, context, section) {
  // Placeholder for AI enhancement logic
  // In production, integrate with OpenAI API
  return `Enhanced: ${text} (optimized for ${section})`;
}

app.listen(PORT, () => {
  console.log(`Resume builder running on http://localhost:${PORT}`);
});