---
title: Fairy worker
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - fairy
  - ai
  - agent
  - cloudflare
  - worker
---

The fairy-worker is a Cloudflare Worker that provides AI agent interaction capabilities for tldraw, enabling intelligent canvas assistants.

## Overview

Fairies are visual AI agents with sprite avatars that can:

- Interact with the tldraw canvas
- Perform automated drawing tasks
- Collaborate with users and other fairies
- Respond to natural language requests

## Architecture

### Worker entry point

```typescript
export default class extends WorkerEntrypoint<Environment> {
	override fetch(request: Request): Promise<Response> {
		return router.fetch(request, this.env, this.ctx)
	}
}
```

### Agent Durable Object

Manages individual AI agent sessions:

```typescript
export class AgentDurableObject extends DurableObject {
	async fetch(request: Request): Promise<Response> {
		// Handle agent requests with streaming responses
		// Process tldraw action streams
		// Manage agent state and context
	}
}
```

## Request flow

1. Client sends POST request to `/stream`
2. Worker routes to `AgentDurableObject` using session ID
3. Durable Object processes request and streams responses
4. Responses formatted as Server-Sent Events (SSE)

## Streaming responses

```typescript
return new Response(responseBody, {
	headers: {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache, no-transform',
		Connection: 'keep-alive',
		'X-Accel-Buffering': 'no',
	},
})
```

## Environment configuration

```typescript
export interface Environment {
	AGENT_DURABLE_OBJECT: DurableObjectNamespace
	OPENAI_API_KEY: string
	ANTHROPIC_API_KEY: string
	GOOGLE_API_KEY: string
	FAIRY_MODEL: string
	CLERK_SECRET_KEY: string
	CLERK_PUBLISHABLE_KEY: string
}
```

## Deployment

```toml
# wrangler.toml
name = "fairydraw"
main = "src/worker.ts"

[dev]
port = 8789

[env.staging]
route = { pattern = "staging-fairy.tldraw.xyz", custom_domain = true }

[env.production]
route = { pattern = "fairy.tldraw.xyz", custom_domain = true }

[durable_objects]
bindings = [
  { name = "AGENT_DURABLE_OBJECT", class_name = "AgentDurableObject" },
]
```

## Client integration

```typescript
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
	applyAgentAction(chunk)
}
```

## Fairy system

The client-side fairy system uses a two-level architecture:

### FairyApp (application level)

Central coordinator managing:

- Global fairy state
- Agent lifecycle
- Projects and tasks
- State persistence

### FairyAgent (agent level)

Individual fairy behavior:

- Mode state machine
- Chat history
- Canvas actions
- Position management

## Agent modes

Fairies operate in different modes:

**Basic modes**

- `sleeping` - Dormant state
- `idling` - Default awake state
- `soloing` - Working independently
- `standing-by` - Passive waiting

**Orchestration modes**

- `orchestrating-active` - Coordinating a project
- `orchestrating-waiting` - Waiting for drones
- `duo-orchestrating-active` - Leading duo project

## Actions system

Actions are operations fairies perform on the canvas:

```typescript
class CreateActionUtil extends AgentActionUtil<CreateAction> {
	static override type = 'create' as const

	applyAction(action, helpers) {
		this.editor.createShape(action.shape)
	}
}
```

**Available actions**

- Canvas: create, update, delete, move, resize, rotate
- Organization: align, distribute, stack, place
- Drawing: pen strokes
- Navigation: change page, fly to bounds
- Tasks: create/complete solo tasks, manage projects

## Prompt parts

Context provided to the AI model:

- `SelectedShapesPartUtil` - Selected shapes
- `PeripheralShapesPartUtil` - Nearby shapes
- `ChatHistoryPartUtil` - Conversation history
- `UserViewportBoundsPartUtil` - User's visible area

## Development

```bash
# Start local development
yarn dev  # Runs on localhost:8789

# Run tests
yarn test

# Type checking
yarn typecheck
```

## Service endpoints

| Environment | URL                                       |
| ----------- | ----------------------------------------- |
| Development | `http://localhost:8789/stream`            |
| Staging     | `https://staging-fairy.tldraw.xyz/stream` |
| Production  | `https://fairy.tldraw.xyz/stream`         |

## Key features

- **Multi-provider AI**: OpenAI, Anthropic, Google support
- **Edge deployment**: Global Cloudflare network
- **Session isolation**: Per-user Durable Objects
- **Streaming**: Real-time progressive responses
- **Canvas awareness**: Understands drawing context

## Key files

- `apps/dotcom/fairy-worker/` - Worker implementation
- `apps/dotcom/client/src/fairy/` - Client-side fairy system
- `packages/fairy-shared/` - Shared fairy utilities

## Related

- [tldraw.com client](../apps/dotcom-client.md) - Frontend integration
- [Sync worker](./sync-worker.md) - Room synchronization
- [AI template](../templates/ai.md) - AI integration template
