const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const googleIt = require('google-it');

dotenv.config();

// Startup validation
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ CRITICAL ERROR: GEMINI_API_KEY is not set in the environment variables.");
    console.error("Please add your API key to backend/.env and restart the server.");
    process.exit(1); // Exit early if no key is found
}

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL, // Set this in Render env vars to your Vercel URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Initialize Gemini Engine with Self-Healing Fallback
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getModel = (requireGrounding = false) => {
    try {
        const tools = requireGrounding ? [{ googleSearchRetrieval: {} }] : [];
        return genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash-latest",
            tools,
            systemInstruction: `You are DEVIL AI, the ultimate high-performance personal assistant for 'Devil Boss'.
            - Your tone is bold, elite, extremely concise, and authoritative. 
            - Zero fluff. Zero theatrical language.
            - When performing a search (Google Search tool), provide a unified, deep-researched answer.
            - If asked to COMPARE things, create a bulleted comparison report.
            - Standard responses should be under 20 words.
            - Deep research responses should be structured and data-rich but still direct.`
        });
    } catch (err) {
        console.error("Model Generation Failure:", err);
        // Fallback to basic model
        return genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    }
};

// Background Internet Search Endpoint (Zero-AI)
app.post('/api/search', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: "Query is required" });

        const results = await googleIt({ 
            query,
            limit: 5,
            disableConsole: true
        });

        res.json({ results });
    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ error: "Search failed", details: error.message });
    }
});

// AI Chat Streaming Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Check if grounding is explicitly requested
        const requireGrounding = message.includes("RESEARCH AND COMPARE");
        const activeModel = getModel(requireGrounding);

        const chat = activeModel.startChat({
            history: history || [],
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const result = await chat.sendMessageStream(message);
        
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
        }

        res.end();
    } catch (error) {
        console.error("Chat Protocol Error:", error);
        // If not already streaming, send JSON error
        if (!res.headersSent) {
            res.status(500).json({ 
                error: "Neural link failed", 
                details: error.message || "An unknown instability occurred." 
            });
        } else {
            res.end("\n[Neural Interruption: " + error.message + "]");
        }
    }
});

// Grounded Search (Using Gemini's inherent knowledge for Phase 1)
app.post('/api/search', async (req, res) => {
    try {
        const { query } = req.body;
        const result = await model.generateContent(`Search ground for: ${query}. Provide top results summarized.`);
        const response = await result.response;
        res.json({ results: response.text() });
    } catch (error) {
        res.status(500).json({ error: "Search failed" });
    }
});

// Safety Check Endpoint (Explicit)
app.post('/api/safety-check', async (req, res) => {
    const { text } = req.body;
    // Basic keyword safety for Phase 1
    const harmfulKeywords = ['hack', 'kill', 'bomb', 'steal', 'virus'];
    const isHarmful = harmfulKeywords.some(kw => text.toLowerCase().includes(kw));
    
    if (isHarmful) {
        return res.json({ safe: false, warning: "Halt! This action violates security protocols. Threat detected." });
    }
    res.json({ safe: true });
});

app.listen(port, () => {
    console.log(`DEVIL AI Backend running on port ${port}`);
});
