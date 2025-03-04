require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve HTML pages
app.get(['/', '/index', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get(['/history', '/history.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'history.html'));
});

app.get(['/saved', '/saved.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'saved.html'));
});

app.get(['/settings', '/settings.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

// API endpoints
app.get('/api/history', (req, res) => {
  // Placeholder for history API
  res.json([]);
});

app.get('/api/saved', (req, res) => {
  // Placeholder for saved research API
  res.json([]);
});

// API route to query Perplexity Sonar
app.post('/qualify-lead', async (req, res) => {
  // Track research duration
  const startTime = Date.now();
  
  try {
    const { companyName } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    // Define the research prompt with specific sections we want info about
    
    const promptText = `Provide a comprehensive yet concise research summary for ${companyName}. 
    Strictly limit your response to:
    • Company Overview
    • Size (employees & revenue)
    • Primary Industry
    • Key Products/Services
    • Recent Funding & Valuation
    • Notable Investors
    
    Use clear, bullet-point format. Maximum 300 words.`;
    
    // Make API call to Perplexity with a 5-minute timeout
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: "sonar-deep-research",
      messages: [
        {
          role: "system",
          content: "You are a precise research assistant providing structured company insights."
        },
        {
          role: "user",
          content: promptText
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minutes in milliseconds
    });
    
    // Calculate research time
    const endTime = Date.now();
    const researchDuration = endTime - startTime;
    const minutes = Math.floor(researchDuration / 60000);
    const seconds = Math.floor((researchDuration % 60000) / 1000);

    // Extract the assistant's message
    const result = response.data.choices[0].message.content;
    
    // Extract and deduplicate source URLs from the research results
    const sourceRegex = /\[Source:\s*(https?:\/\/[^\]]+)\]/g;
    const sources = [];
    let match;
    while ((match = sourceRegex.exec(result)) !== null) {
      if (!sources.includes(match[1])) {
        sources.push(match[1]);
      }
    }
    const sourceCount = sources.length || 1;
    
    // Return research results with metadata
    res.json({ 
      result, 
      researchTime: { minutes, seconds },
      sourceCount 
    });
  } catch (error) {
    console.error('Research error:', error);
    
    // Handle different types of errors with appropriate status codes
    if (error.code === 'ECONNABORTED') {
      res.status(504).json({ 
        error: 'Research timed out',
        details: 'Unable to complete research within the time limit'
      });
    } else if (error.response) {
      res.status(error.response.status).json({ 
        error: 'Research failed',
        details: error.response.data
      });
    } else {
      res.status(500).json({ 
        error: 'Unexpected research error',
        details: error.message
      });
    }
  }
});

// Optional: Add a route for saving and retrieving shared research
app.post('/save-research', async (req, res) => {
  const { companyName, result } = req.body;
  
  // In a production app, you'd:
  // 1. Generate a unique ID
  // 2. Save to database
  // 3. Return shareable URL
  
  const shareId = Math.random().toString(36).substring(2, 15);
  
  res.json({
    shareId,
    shareUrl: `${req.protocol}://${req.get('host')}/research/${shareId}`
  });
});

app.get('/research/:shareId', async (req, res) => {
  // In a production app, retrieve saved research from database
  // For now, just a placeholder
  res.send('Shared research page');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;