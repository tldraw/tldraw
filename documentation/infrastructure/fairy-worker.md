---
title: Fairy worker
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - fairy
  - ai
  - agent
  - cloudflare
  - worker
status: published
date: 12/19/2025
order: 1
---

The fairy worker provides AI agent streaming for tldraw.com. Each session is backed by a Durable Object that streams actions to the client using Server-Sent Events (SSE).

## Key components

### Worker entry and routing

The worker routes `/stream` requests to an Agent Durable Object keyed by session.

### Agent Durable Object

The Durable Object manages model calls, conversation context, and action streaming for a single agent session.

### Streaming responses

Responses are sent as SSE to enable progressive updates:

```typescript
return new Response(body, {
	headers: {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache, no-transform',
		Connection: 'keep-alive',
		'X-Accel-Buffering': 'no',
	},
})
```

## Data flow

1. Client posts to `/stream` with conversation state and canvas context.
2. The worker routes the request to an Agent Durable Object.
3. The agent streams actions and messages over SSE.
4. The client applies streamed actions to the editor.

## Development workflow

```bash
yarn dev

yarn test

yarn typecheck
```

## Key files

- apps/dotcom/fairy-worker/src/worker.ts - Worker entry and routing
- apps/dotcom/fairy-worker/src/do/AgentDurableObject.ts - Agent session logic
- apps/dotcom/fairy-worker/src/routes/stream-actions.ts - Streaming route handler
- apps/dotcom/fairy-worker/src/prompt/ - Prompt assembly
- apps/dotcom/fairy-worker/wrangler.toml - Deployment configuration

## Related

- [tldraw.com client](../apps/dotcom-client.md)
- [Sync worker](./sync-worker.md)
- [AI template](../templates/ai.md)
