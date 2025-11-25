# dotcom-fairy-worker

A Cloudflare Worker that provides AI agent interaction capabilities for tldraw applications. This worker enables AI-powered features like drawing assistants, automated sketching, and intelligent canvas interactions.

## Architecture

**Cloudflare Worker + Durable Object Pattern**

- Main worker handles HTTP requests via itty-router
- AgentDurableObject manages persistent AI agent sessions and state
- Integrates with multiple AI providers (OpenAI, Anthropic, Google)

## Core Responsibilities

### 1. AI Agent Sessions

- **Session Management**: `POST /stream` - Establishes and maintains agent conversation sessions
- **Streaming Responses**: Real-time Server-Sent Events (SSE) for progressive responses
- **State Persistence**: Agent context maintained across requests in Durable Objects

### 2. tldraw Integration

- **Canvas Understanding**: Processes tldraw drawing state
- **Action Generation**: Generates drawing commands (pen strokes, shapes, annotations)
- **Real-time Interaction**: Streams responses back to the canvas

### 3. Multi-Provider AI Support

- OpenAI integration
- Anthropic (Claude) integration
- Google AI integration
- Automatic provider selection and fallback

## Environment Configuration

Required environment variables:

```bash
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_API_KEY=your-google-key
```

## Key Components

### Worker (worker.ts)

Main entry point extending `WorkerEntrypoint`. Sets up routing with CORS support and delegates to Durable Objects.

### AgentDurableObject (do/AgentDurableObject.ts)

Durable Object that manages:

- AI agent conversation state
- Streaming response generation
- Integration with AI provider APIs
- Session persistence and cleanup

### AgentService (do/AgentService.ts)

Service layer handling:

- Request processing and validation
- AI provider communication
- Response streaming and formatting
- Error handling and recovery

## Dependencies

**Core tldraw packages:**

- `@tldraw/fairy-shared` - Shared utilities and types
- `@tldraw/worker-shared` - Worker utilities

**Infrastructure:**

- `itty-router` - HTTP request routing
- `esbuild` - Bundling and build tooling
- Cloudflare Workers types and APIs

## Development

- `yarn dev` - Start local development server with inspector on port 9559
- Uses wrangler for local development and deployment
- TypeScript configuration optimized for Cloudflare Workers environment

## Deployment

The fairy-worker runs as a completely independent Cloudflare Worker:

- **Development**: `http://localhost:8789` (port 8789)
- **Staging**: `https://staging-fairy.tldraw.xyz`
- **Production**: `https://fairy.tldraw.xyz`

## Usage Example

```typescript
// Client-side usage
const response = await fetch('http://localhost:8789/stream', {
	// Or in production: 'https://fairy.tldraw.xyz/stream'
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
	},
	body: JSON.stringify({
		messages: [{ role: 'user', content: 'Draw a cat' }],
		canvasState: editor.store.serialize(),
	}),
})

// Handle streaming response
const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
	const { done, value } = await reader.read()
	if (done) break

	const chunk = decoder.decode(value)
	// Process agent actions
	processAgentAction(chunk)
}
```

## Security & Performance

- CORS enabled with wildcard origin (configure as needed)
- Durable Objects provide isolated, stateful agent sessions
- Streaming architecture for low-latency responses
- Automatic scaling via Cloudflare Workers platform

## Deployment

The worker is deployed using Wrangler:

```bash
# Deploy to production
wrangler deploy

# Deploy with specific environment
wrangler deploy --env production
```

## Contribution

Please see our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md). Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## License

The code in this folder is Copyright (c) 2024-present tldraw Inc. The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

## Trademarks

Copyright (c) 2024-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).
