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
app.use(express.static('public'));

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test route to check API connectivity
app.get('/test-api', async (req, res) => {
  try {
    const response = await axios.get('https://api.perplexity.ai/health');
    res.json({ status: 'API reachable', response: response.data });
  } catch (error) {
    console.error('API Test Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to reach API', 
      message: error.message,
      code: error.code 
    });
  }
});

// API route to query Perplexity Sonar
app.post('/qualify-lead', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { companyName } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    // Create the prompt for lead qualification
    const promptText = `Research ${companyName} with detailed citations. Provide concise information.`;
    
    // Call Perplexity API
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: "sonar-deep-research",
      messages: [
        {
          role: "system",
          content: "You are a lead qualification assistant."
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
      timeout: 60000 // Increased to 60 seconds
    });
    
    // Calculate research time
    const endTime = Date.now();
    const researchDuration = endTime - startTime;
    const minutes = Math.floor(researchDuration / 60000);
    const seconds = Math.floor((researchDuration % 60000) / 1000);

    // Extract the assistant's message
    const result = response.data.choices[0].message.content;
    
    // Extract sources
    const sourceRegex = /\[Source:\s*(https?:\/\/[^\]]+)\]/g;
    const sources = [];
    let match;
    while ((match = sourceRegex.exec(result)) !== null) {
      if (!sources.includes(match[1])) {
        sources.push(match[1]);
      }
    }
    const sourceCount = sources.length;
    
    // Ensure we're returning valid JSON
    res.json({ 
      result, 
      researchTime: { minutes, seconds },
      sourceCount 
    });
  } catch (error) {
    // More detailed error logging
    console.error('Full error in /qualify-lead:', error);
    
    if (error.code === 'ECONNABORTED') {
      res.status(504).json({ 
        error: 'Research timed out',
        details: 'The research took too long to complete'
      });
    } else if (error.response) {
      res.status(error.response.status).json({ 
        error: 'Failed to complete research',
        details: error.response.data
      });
    } else {
      res.status(500).json({ 
        error: 'Unexpected error occurred',
        details: error.message
      });
    }
  }
});

// Catch-all error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'An unexpected error occurred',
    details: err.message 
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;