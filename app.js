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
   
   // More detailed prompt with clear instructions
   const promptText = `Provide a comprehensive yet concise research summary for ${companyName}. 
   Strictly limit your response to:
   • Company Overview
   • Size (employees & revenue)
   • Primary Industry
   • Key Products/Services
   • Recent Funding & Valuation
   • Notable Investors
   
   Use clear, bullet-point format. Maximum 300 words.`;
   
   // Call Perplexity API with extended timeout
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
     timeout: 300000 // Extended to 5 minutes (300 seconds)
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
   const sourceCount = sources.length || 1;
   
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