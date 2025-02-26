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

// API route to query Perplexity Sonar
app.post('/qualify-lead', async (req, res) => {
  try {
    const { companyName } = req.body;
    
    // Create the prompt for lead qualification
    const prompt = `Research ${companyName} and provide the following information in a structured format:
    1. Company size (employees and revenue if available)
    2. Industry and sub-industry
    3. Current tech stack, especially any CRM or sales tools
    4. Recent funding or financial status
    5. Growth indicators (hiring, expansion, new products)
    6. Key decision-makers in sales/marketing
    7. Potential pain points that our sales solution could address`;
    
    // Call Perplexity Sonar API
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: "sonar-medium-online",
      messages: [
        {
          role: "system",
          content: "You are a lead qualification assistant that researches companies and provides structured information for sales teams."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Extract the assistant's message from the response
    const result = response.data.choices[0].message.content;
    
    res.json({ result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to qualify lead', message: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});