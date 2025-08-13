const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

app.post('/api/chat', async (req, res) => {
  try {
    const { history } = req.body;

    if (!history || !Array.isArray(history)) {
        return res.status(400).json({ error: 'Invalid history provided.' });
    }

    // Ensure history starts with a user part if not empty
    const firstUserIndex = history.findIndex(m => m.role === 'user');
    const validHistory = firstUser-index > -1 ? history.slice(firstUserIndex) : [];

    const result = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: validHistory.concat(history.slice(-1)), // Send valid history plus the last message
    });
    
    res.setHeader('Content-Type', 'text/event-stream');

    for await (const chunk of result) {
      if (chunk && chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.end();

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Server error during chat.' });
  }
});


app.post('/api/analyze', async (req, res) => {
    try {
        const { competitorContent, subject } = req.body;

        if (!competitorContent || !subject) {
            return res.status(400).json({ error: 'Missing competitorContent or subject.' });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyse le contenu de la page concurrente suivante sur le sujet "${subject}". Contenu à analyser: "${competitorContent}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        seoAnalysis: { 
                            type: 'OBJECT',
                            properties: {
                                h1: { type: 'STRING' },
                                metaTitle: { type: 'STRING' },
                                metaDescription: { type: 'STRING' }
                            }
                        },
                        contentAngle: { type: 'STRING' },
                        strengths: { type: 'ARRAY', items: { type: 'STRING' } },
                        weaknesses: { type: 'ARRAY', items: { type: 'STRING' } },
                        strategicOpportunity: { type: 'STRING' }
                    }
                }
            }
        });
        
        res.json(JSON.parse(response.text));

    } catch (error) {
        console.error('Analyze API error:', error);
        res.status(500).json({ error: 'Error processing analysis.' });
    }
});

// Fallback to index.html for single-page application routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Lynn-Ambassadrice-IA server listening on port ${port}`);
});