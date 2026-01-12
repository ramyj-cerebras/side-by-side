// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const OpenAI = require('openai');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist-simple')));

// Hardcoded providers - no authentication needed
const PROVIDERS = [
  {
    id: 'HF - Fireworks - gpt-oss-120b',
    name: 'HuggingFace - Fireworks - gpt-oss-120b',
    baseUrl: 'https://router.huggingface.co/v1',
    apiKey: process.env.HF_token || 'your-openai-key-here',
    model: 'openai/gpt-oss-120b:fireworks-ai'
  },
  {
    id: 'cerebras',
    name: 'Cerebras gpt-oss-120b',
    baseUrl: 'https://api.cerebras.ai/v1',
    apiKey: process.env.CEREBRAS_API_KEY || 'your-cerebras-key-here',
    model: 'gpt-oss-120b'
  },
    {
    id: 'FW API - gpt-oss-120b',
    name: 'Fireworks API - gpt-oss-120b',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    apiKey: process.env.FW_API_KEY || 'your-fireworks-key-here',
    model: 'accounts/fireworks/models/gpt-oss-120b'
  },
  {
    id: 'Gemini API',
    name: 'Gemini API - gemini flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKey: process.env.GEMINI_API_KEY || 'your-gemini-key-here',
    model: 'gemini-2.5-flash'
  }
];

// Simple API to get providers (no auth needed)
app.get('/api/providers', (req, res) => {
  res.json({ providers: PROVIDERS });
});

// WebSocket handler for streaming LLM responses
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'COMPARE') {
        const { prompt, provider1Id, provider2Id } = data;
        
        // Validate required fields
        if (!prompt || !provider1Id || !provider2Id) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            message: 'Prompt and both providers are required'
          }));
          return;
        }
        
        if (provider1Id === provider2Id) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            message: 'Please select different providers for comparison'
          }));
          return;
        }
        
        const provider1 = PROVIDERS.find(p => p.id === provider1Id);
        const provider2 = PROVIDERS.find(p => p.id === provider2Id);
        
        if (!provider1 || !provider2) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            message: 'One or both providers not found'
          }));
          return;
        }
        
        // Send responses to both providers simultaneously
        const startTime = Date.now();
        
        Promise.all([
          streamResponse(ws, provider1, prompt, 'provider1', startTime),
          streamResponse(ws, provider2, prompt, 'provider2', startTime)
        ]).then(() => {
          ws.send(JSON.stringify({
            type: 'COMPLETE',
            message: 'Both providers have responded'
          }));
        }).catch(error => {
          ws.send(JSON.stringify({
            type: 'ERROR',
            message: error.message
          }));
        });
      } else {
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'Unknown message type'
        }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid message format'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

async function streamResponse(ws, provider, prompt, providerKey, startTime) {
  console.log(`Starting stream for ${providerKey} with provider:`, provider.name);
  
  try {
    const openai = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl
    });
    
    const requestPayload = {
      model: provider.model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    };
    
    console.log(`\n📤 REQUEST PAYLOAD for ${providerKey} (${provider.name}):`);
    console.log(`   URL: ${provider.baseUrl}/chat/completions`);
    console.log(`   Model: ${provider.model}`);
    console.log(`   Messages:`, JSON.stringify(requestPayload.messages, null, 2));
    console.log(`   Stream: ${requestPayload.stream}`);
    console.log('');
    
    const stream = await openai.chat.completions.create(requestPayload);
    
    console.log(`Stream started successfully for ${providerKey}`);
    
    let fullResponse = '';
    let firstTokenTime = null;
    let completionTokens = 0;
    let buffer = '';
    let lastFlushTime = Date.now();
    const BUFFER_INTERVAL = 50; // Flush every 50ms for smoother streaming
    
    const flushBuffer = () => {
      if (buffer.trim()) {
        ws.send(JSON.stringify({
          type: 'STREAM',
          provider: providerKey,
          content: buffer,
          firstTokenTime: firstTokenTime,
          totalTime: Date.now() - startTime
        }));
        buffer = '';
        lastFlushTime = Date.now();
      }
    };
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      
      if (content && !firstTokenTime) {
        firstTokenTime = Date.now() - startTime;
        console.log(`First token received for ${providerKey} at ${firstTokenTime}ms`);
      }
      
      if (content) {
        fullResponse += content;
        buffer += content;
        
        // Flush buffer if interval has passed or buffer is getting large
        const now = Date.now();
        if (now - lastFlushTime >= BUFFER_INTERVAL || buffer.length > 100) {
          flushBuffer();
        }
      }
      
      // Extract completion tokens from usage if available
      if (chunk.usage && chunk.usage.completion_tokens) {
        completionTokens = chunk.usage.completion_tokens;
      }
    }
    
    // Flush any remaining content
    flushBuffer();
    
    const totalTime = Date.now() - startTime;
    const generationTime = totalTime - firstTokenTime;
    const tps = generationTime > 0 && completionTokens > 0 ? (completionTokens / (generationTime / 1000)).toFixed(2) : 0;
    
    console.log(`Stream completed for ${providerKey}`);
    console.log(`   Completion tokens: ${completionTokens}`);
    console.log(`   Generation time: ${generationTime}ms`);
    console.log(`   Tokens per second: ${tps}`);
    
    ws.send(JSON.stringify({
      type: 'STREAM_COMPLETE',
      provider: providerKey,
      fullResponse: fullResponse,
      firstTokenTime: firstTokenTime,
      totalTime: totalTime,
      completionTokens: completionTokens,
      tps: parseFloat(tps)
    }));
    
  } catch (error) {
    console.error(`Error in streamResponse for ${providerKey}:`, error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      stack: error.stack
    });
    
    let errorMessage = error.message;
    if (error.status === 404) {
      errorMessage = `Model not found (404). Check if model "${provider.model}" exists at ${provider.baseUrl}`;
    } else if (error.status === 401) {
      errorMessage = `Authentication failed (401). Check your API key for ${provider.name}`;
    } else if (error.status === 429) {
      errorMessage = `Rate limit exceeded (429). Please try again later`;
    }
    
    ws.send(JSON.stringify({
      type: 'PROVIDER_ERROR',
      provider: providerKey,
      message: errorMessage
    }));
  }
}

// Serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist-simple', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Simple LLM Comparison Server running on port ${PORT}`);
  console.log(`Available providers: ${PROVIDERS.map(p => p.name).join(', ')}`);
});