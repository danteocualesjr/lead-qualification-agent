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

// API route to query Perplexity Sonar
app.post('/qualify-lead', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { companyName } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    // Create a very specific, concise prompt
    const promptText = `Provide a ultra-concise research summary for ${companyName}. 
    Include:
    1. Company size (employees)
    2. Industry
    3. Key products/services
    4. Funding status
    
    Limit response to 500 characters. Use bullet points.`;
    
    // Call Perplexity API with reduced timeout
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: "sonar-small-query",
      messages: [
        {
          role: "system",
          content: "You are a concise research assistant providing quick company insights."
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
      timeout: 15000 // Reduced to 15 seconds
    });
    
    // Calculate research time
    const endTime = Date.now();
    const researchDuration = endTime - startTime;
    const minutes = Math.floor(researchDuration / 60000);
    const seconds = Math.floor((researchDuration % 60000) / 1000);

    // Extract the assistant's message
    const result = response.data.choices[0].message.content;
    
    // Simple source counting (placeholder)
    const sourceCount = 1;
    
    // Ensure we're returning valid JSON
    res.json({ 
      result, 
      researchTime: { minutes, seconds },
      sourceCount 
    });
  } catch (error) {
    console.error('Research error:', error);
    
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;