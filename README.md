# LLM Provider Comparison App

A web application for comparing responses from different LLM providers side-by-side with real-time streaming. Compare speed, quality, and performance of multiple AI providers simultaneously.

## Features

- **Side-by-side comparison**: Compare responses from 2 LLM providers simultaneously
- **Real-time streaming**: Watch responses appear in real-time as they're generated
- **Performance metrics**: See first token time and total response time for each provider
- **Provider management**: Add, configure, and manage multiple LLM providers
- **OpenAI API compatible**: Works with any provider supporting the OpenAI API format
- **Modern UI**: Clean, responsive interface with smooth animations

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   # Start backend server (terminal 1)
   npm run dev
   
   # Start frontend dev server (terminal 2)
   npm run dev:client
   ```

3. **Open your browser**:
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000

## Production Build

```bash
# Build frontend for production
npm run build

# Start production server
npm start
```

## Configuration

### Adding Providers

1. Navigate to the **Providers** page
2. Fill in the provider details:
   - **Name**: Display name for the provider
   - **Base URL**: API endpoint (e.g., `https://api.openai.com/v1`)
   - **API Key**: Your API key for the provider
   - **Model**: The model to use (e.g., `gpt-3.5-turbo`)

### Supported Providers

The app works with any OpenAI-compatible API. Here are some popular providers:

#### OpenAI
- **Base URL**: `https://api.openai.com/v1`
- **Models**: `gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo`

#### Cerebras
- **Base URL**: `https://api.cerebras.ai/v1`
- **Models**: `llama3.1-8b`, `llama3.1-70b`

#### Anthropic (via third-party proxy)
- **Base URL**: `https://api.anthropic-proxy.com/v1`
- **Models**: `claude-3-sonnet`, `claude-3-opus`

#### Local Models (Ollama)
- **Base URL**: `http://localhost:11434/v1`
- **Models**: `llama2`, `mistral`, `codellama`

## Usage

1. **Configure providers**: Add at least 2 providers in the Providers page
2. **Select providers**: Choose 2 different providers from the dropdowns
3. **Enter prompt**: Type your question or prompt in the text area
4. **Compare**: Click "Compare Responses" to send the prompt to both providers
5. **Watch results**: See responses stream in real-time with performance metrics

## Performance Metrics

- **First Token Time**: Time until the first token appears (measures initial response speed)
- **Total Time**: Total time to complete the response (measures overall speed)

## API Endpoints

### Providers
- `GET /api/providers` - Get all configured providers
- `POST /api/providers` - Add a new provider
- `PUT /api/providers/:id` - Update a provider
- `DELETE /api/providers/:id` - Delete a provider

### WebSocket
- Connect to `ws://localhost:3000` for real-time streaming

## File Structure

```
├── server.js              # Express server with WebSocket support
├── webpack.config.js      # Webpack configuration
├── src/
│   ├── index.html        # Main HTML file
│   └── index.js          # Frontend JavaScript
├── dist/                 # Built frontend files
├── providers.json        # Provider configuration storage
└── package.json          # Dependencies and scripts
```

## Development

### Adding New Features

The app is structured with:
- **Backend**: Express.js server with WebSocket for real-time communication
- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Styling**: Inline CSS for simplicity and easy customization

### Environment Variables

Create a `.env` file for configuration:
```env
PORT=3000
NODE_ENV=development
```

## Troubleshooting

### Common Issues

1. **WebSocket connection failed**: Ensure the backend server is running on port 3000
2. **Provider not responding**: Check API key and base URL configuration
3. **CORS errors**: The backend includes CORS middleware for development

### Logs

Check the console for:
- Backend logs in the terminal running `npm run dev`
- Frontend logs in browser developer tools
- WebSocket connection status in browser console

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.
