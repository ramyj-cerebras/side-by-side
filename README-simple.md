# Simple LLM Provider Comparison

A clean, simple side-by-side comparison tool for LLM providers with real-time streaming.

## Features

- **Real-time Streaming**: Watch responses appear as they're generated
- **Side-by-Side Comparison**: Compare two providers simultaneously
- **Performance Metrics**: Track first token time, total time, tokens, and TPS
- **Smooth Streaming**: Buffered output for better readability
- **No Authentication**: Simple environment variable configuration

## Quick Start

1. Set your API keys as environment variables:
   ```bash
   export OPENAI_API_KEY="your-openai-key"
   export ANTHROPIC_API_KEY="your-anthropic-key"
   export CEREBRAS_API_KEY="your-cerebras-key"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   node server-simple.js
   ```

4. Open http://localhost:3000

## Available Providers

- OpenAI GPT-3.5 Turbo
- Anthropic Claude 3 Haiku
- Cerebras Llama 3.1 8B

## Usage

1. Select two different providers from the dropdowns
2. Enter your prompt
3. Click "Compare Responses"
4. Watch the real-time streaming comparison

## Metrics Displayed

- **First Token Time**: Time to first response (TTFT)
- **Total Time**: Complete response generation time
- **Tokens**: Total completion tokens
- **TPS**: Tokens per second generation speed

## Architecture

- **Backend**: Node.js with Express and WebSocket
- **Frontend**: Vanilla JavaScript with modern CSS
- **Streaming**: Buffered WebSocket communication for smooth output
- **API**: OpenAI-compatible API standard

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | Optional |
| `ANTHROPIC_API_KEY` | Anthropic API key | Optional |
| `CEREBRAS_API_KEY` | Cerebras API key | Optional |

## Development

- Frontend source: `src/index-simple.js`
- Backend source: `server-simple.js`
- Build command: `npx webpack --config webpack-simple.config.js`