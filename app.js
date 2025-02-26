require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test route to check API connectivity
app.get('/test-api', async (req, res) => {
  try {
    // Simple HTTP request to check if we can reach the Perplexity domain
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
  const startTime = Date.now(); // Record start time
  
  try {
    const { companyName } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    // Create the prompt for lead qualification
    const promptText = `Research ${companyName} with detailed citations. For each key point, include a link to the source.

Provide information on:
1. Company size (employees and revenue if available)
2. Industry and sub-industry
3. Current tech stack, especially any CRM or sales tools
4. Recent funding or financial status
5. Growth indicators (hiring, expansion, new products)
6. Key decision-makers in sales/marketing
7. Potential pain points that our sales solution could address

FORMAT: After each significant statement, include [Source: URL] in square brackets.

At the end of your response, list:
- Total number of sources used
- A comprehensive list of sources with their URLs
`;
    
    // Call Perplexity API
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: "sonar-deep-research",
      messages: [
        {
          role: "system",
          content: "You are a lead qualification assistant that researches companies and provides structured information for sales teams."
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
      }
    });
    
    // Calculate research time
    const endTime = Date.now();
    const researchDuration = endTime - startTime;
    const minutes = Math.floor(researchDuration / 60000);
    const seconds = Math.floor((researchDuration % 60000) / 1000);

    // Extract the assistant's message and source count
    const result = response.data.choices[0].message.content;
    
    // Extract source count (assuming it's mentioned at the end)
    const sourceCountMatch = result.match(/Total number of sources used:\s*(\d+)/i);
    const sourceCount = sourceCountMatch ? parseInt(sourceCountMatch[1]) : 0;
    
    res.json({ 
      result, 
      researchTime: { minutes, seconds },
      sourceCount 
    });
  } catch (error) {
    console.error('Error details:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
      error: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});