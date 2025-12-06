# Fairy Worker Context

## Overview

The `fairy-worker` (also known as `dotcom-fairy-worker`) is a Cloudflare Worker that provides AI agent interaction capabilities for tldraw. It handles streaming responses from AI agents that can interact with tldraw drawings, enabling AI-powered features like drawing assistants, automated sketching, and intelligent canvas interactions.

## Architecture

### Core Components

The fairy-worker consists of a main worker and a specialized Durable Object:

#### Worker (worker.ts)

Main entry point extending `WorkerEntrypoint`. Sets up routing with CORS support and delegates agent interactions to Durable Objects.

```typescript
export default class extends WorkerEntrypoint<Environment> {
	override fetch(request: Request): Promise<Response> {
		return router.fetch(request, this.env, this.ctx)
	}
}
```

The worker handles:

- POST /stream - Main endpoint for AI agent streaming responses
- CORS configuration for cross-origin requests
- Request routing to the appropriate Durable Object

#### AgentDurableObject - Agent Session Management

Manages individual AI agent sessions and their interactions with tldraw:

```typescript
export class AgentDurableObject extends DurableObject {
	async fetch(request: Request): Promise<Response> {
		// Handle agent requests with streaming responses
		// Process tldraw action streams
		// Manage agent state and context
	}
}
```

The Durable Object provides:

- Persistent agent sessions
- Streaming response handling
- Integration with AI providers (OpenAI, Anthropic, Google)
- State management for agent interactions

### Request Flow

1. Client sends POST request to `/stream` with agent request data
2. Worker routes request to `AgentDurableObject` using a session identifier
3. Durable Object processes the request and streams responses back
4. Responses are formatted as Server-Sent Events (SSE) for real-time updates

## Core Responsibilities

### 1. AI Agent Management

- **Session Management**: Each agent session is isolated in its own Durable Object instance
- **State Persistence**: Agent context and conversation history maintained across requests
- **Multi-Provider Support**: Integration with OpenAI, Anthropic, and Google AI services

### 2. Streaming Responses

The worker provides real-time streaming of AI responses:

```typescript
// Streaming response with Server-Sent Events
return new Response(responseBody, {
	headers: {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache, no-transform',
		Connection: 'keep-alive',
		'X-Accel-Buffering': 'no',
	},
})
```

### 3. tldraw Integration

The agent can:

- Read and understand tldraw canvas state
- Generate drawing actions (pen strokes, shapes, etc.)
- Respond to user queries about drawings
- Provide intelligent drawing assistance

## Environment Configuration

### Required Environment Variables

```typescript
export interface Environment {
	AGENT_DURABLE_OBJECT: DurableObjectNamespace
	OPENAI_API_KEY: string
	ANTHROPIC_API_KEY: string
	GOOGLE_API_KEY: string
	FAIRY_MODEL: string
	SENTRY_DSN: string | undefined
	IS_LOCAL: string | undefined
	CLERK_SECRET_KEY: string
	CLERK_PUBLISHABLE_KEY: string
}
```

### Deployment Configuration

The worker runs as a completely independent service configured via `wrangler.toml`:

```toml
name = "fairydraw"
main = "src/worker.ts"
compatibility_date = "2024-12-30"

[dev]
port = 8789  # Runs on port 8789 in development

[env.dev]
name = "fairydraw-dev"

[env.staging]
name = "fairydraw-staging"
route = { pattern = "staging-fairy.tldraw.xyz", custom_domain = true }

[env.production]
name = "fairydraw"
route = { pattern = "fairy.tldraw.xyz", custom_domain = true }

[durable_objects]
bindings = [
    { name = "AGENT_DURABLE_OBJECT", class_name = "AgentDurableObject" },
]
```

## Dependencies

**Core tldraw packages:**

- `@tldraw/fairy-shared` - Shared utilities and types
- `@tldraw/worker-shared` - Shared worker utilities

**Infrastructure:**

- `itty-router` - HTTP request routing
- Cloudflare Workers runtime and APIs
- Durable Objects for stateful sessions

## Development

```bash
# Start local development server
yarn dev  # Runs on localhost with inspector on port 9559

# Run tests
yarn test

# Type checking
yarn typecheck

# Linting
yarn lint
```

## Key Features

### AI-Powered Drawing Assistance

- **Natural Language Understanding**: Interpret user requests about drawings
- **Drawing Generation**: Create shapes, strokes, and compositions
- **Contextual Awareness**: Understand existing canvas content
- **Real-time Feedback**: Stream responses as they're generated

### Scalability and Performance

- **Edge Deployment**: Runs globally on Cloudflare's edge network
- **Durable Object Isolation**: Each session gets its own compute instance
- **Streaming Architecture**: Low latency with progressive responses
- **Automatic Scaling**: Handles traffic spikes seamlessly

### Security

- **CORS Support**: Configurable cross-origin access
- **API Key Management**: Secure storage of AI provider credentials
- **Session Isolation**: Each agent session is isolated from others

## Integration with tldraw

The fairy-worker runs independently from the sync-worker, with its own endpoints:

- **Development**: `http://localhost:8789/stream`
- **Staging**: `https://staging-fairy.tldraw.xyz/stream`
- **Production**: `https://fairy.tldraw.xyz/stream`

Client-side integration example:

```typescript
// Client-side integration
const agentUrl =
	process.env.NODE_ENV === 'production'
		? 'https://fairy.tldraw.xyz/stream'
		: 'http://localhost:8789/stream'

const response = await fetch(agentUrl, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		messages: conversationHistory,
		canvasState: editor.store.serialize(),
	}),
})

// Handle streaming responses
const reader = response.body.getReader()
for await (const chunk of readStream(reader)) {
	// Process agent actions
	applyAgentAction(chunk)
}
```

## Service Architecture

The fairy-worker operates as a completely independent service:

```
tldraw Agent Template (Client)
        ↓
fairy-worker:8789 (AI Agent) [Independent Service]
├── AgentDurableObject (Session management)
└── AI Providers (OpenAI, Anthropic, Google)
        ↓
    Streaming Response
        ↓
    tldraw Canvas Updates

Note: Runs separately from sync-worker
- Development: localhost:8789
- Production: fairy.tldraw.xyz
```

The fairy-worker enables AI-powered features in tldraw by providing a scalable, real-time agent interaction service that bridges natural language understanding with canvas manipulation.
