require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors'); // Add this line

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Add CORS support
app.use(express.json());
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.path}`);
  next();
});

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API route to query Perplexity Sonar
app.post('/qualify-lead', async (req, res) => {
  console.log('Qualify lead request received');
  console.log('Request body:', req.body);
  
  const startTime = Date.now();
  
  try {
    const { companyName } = req.body;
    
    if (!companyName) {
      console.error('No company name provided');
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    console.log(`Researching company: ${companyName}`);
    console.log(`API Key present: ${!!process.env.PERPLEXITY_API_KEY}`);
    
    // Validate API key
    if (!process.env.PERPLEXITY_API_KEY) {
      console.error('Perplexity API key is missing');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Perplexity API key is missing' 
      });
    }
    
    // Create the prompt for lead qualification
    const promptText = `Research ${companyName} with detailed citations.`;
    
    // Call Perplexity API
    console.log('Sending request to Perplexity API');
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
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Received response from Perplexity API');
    
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
    console.log('Sending response');
    res.json({ 
      result, 
      researchTime: { minutes, seconds },
      sourceCount 
    });
  } catch (error) {
    // More detailed error logging
    console.error('Full error in /qualify-lead:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    
    res.status(500).json({ 
      error: 'Failed to complete research',
      details: error.message
    });
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