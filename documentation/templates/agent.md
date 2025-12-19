---
title: Agent template
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - agent
  - ai
  - assistant
  - template
---

The agent template demonstrates how to integrate AI agents with tldraw, enabling intelligent assistants that can interact with the canvas through natural language.

## Quick start

```bash
npx create-tldraw my-app --template agent
cd my-app
npm install
# Configure API keys in .dev.vars
npm run dev
```

## What's included

- AI agent that can draw on the canvas
- Multi-provider support (OpenAI, Anthropic, Google)
- Streaming responses with real-time canvas updates
- Cloudflare Workers backend
- Natural language to drawing actions

## Architecture

### Frontend

The agent interface provides a chat panel for communicating with the AI:

```typescript
function AgentPanel() {
  const editor = useEditor()
  const [messages, setMessages] = useState<Message[]>([])

  const handleSend = async (input: string) => {
    // Get current canvas state
    const shapes = editor.getCurrentPageShapes()

    // Stream response from agent
    const response = await fetch('/api/agent', {
      method: 'POST',
      body: JSON.stringify({
        messages: [...messages, { role: 'user', content: input }],
        canvasState: shapes,
      }),
    })

    // Apply agent actions to canvas
    for await (const action of readStream(response)) {
      applyAction(editor, action)
    }
  }

  return (
    <div className="agent-panel">
      <ChatHistory messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  )
}
```

### Backend

Cloudflare Worker processing agent requests:

```typescript
// worker.ts
export default {
	async fetch(request: Request, env: Env) {
		const { messages, canvasState } = await request.json()

		const systemPrompt = buildSystemPrompt(canvasState)

		const response = await streamAgent({
			model: env.AGENT_MODEL,
			systemPrompt,
			messages,
			tools: canvasTools,
		})

		return new Response(response.body, {
			headers: { 'Content-Type': 'text/event-stream' },
		})
	},
}
```

## Agent capabilities

The agent can perform various canvas operations:

### Create shapes

```typescript
const createAction = {
	type: 'create',
	shape: {
		type: 'geo',
		x: 100,
		y: 100,
		props: {
			geo: 'rectangle',
			w: 200,
			h: 100,
			fill: 'solid',
			color: 'blue',
		},
	},
}
```

### Update shapes

```typescript
const updateAction = {
	type: 'update',
	shapeId: 'shape:abc123',
	props: {
		color: 'red',
		w: 300,
	},
}
```

### Delete shapes

```typescript
const deleteAction = {
	type: 'delete',
	shapeIds: ['shape:abc123', 'shape:def456'],
}
```

### Draw freehand

```typescript
const drawAction = {
	type: 'draw',
	points: [
		{ x: 0, y: 0 },
		{ x: 50, y: 25 },
		{ x: 100, y: 0 },
	],
}
```

## Action execution

Apply agent actions to the editor:

```typescript
function applyAction(editor: Editor, action: AgentAction) {
	switch (action.type) {
		case 'create':
			editor.createShape({
				id: createShapeId(),
				...action.shape,
			})
			break

		case 'update':
			editor.updateShape({
				id: action.shapeId,
				...action.props,
			})
			break

		case 'delete':
			editor.deleteShapes(action.shapeIds)
			break

		case 'draw':
			editor.createShape({
				id: createShapeId(),
				type: 'draw',
				props: {
					segments: [{ type: 'free', points: action.points }],
				},
			})
			break
	}
}
```

## Multi-provider support

Configure different AI providers:

```typescript
// OpenAI
import { openai } from '@ai-sdk/openai'
const model = openai('gpt-4')

// Anthropic
import { anthropic } from '@ai-sdk/anthropic'
const model = anthropic('claude-3-opus-20240229')

// Google
import { google } from '@ai-sdk/google'
const model = google('gemini-pro')
```

## Configuration

### Environment variables

```bash
# .dev.vars
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
AGENT_MODEL=gpt-4
```

### System prompt

Build context-aware prompts:

```typescript
function buildSystemPrompt(canvasState: TLShape[]) {
	return `You are an AI assistant that can draw on a canvas.

Current canvas contains ${canvasState.length} shapes:
${describeShapes(canvasState)}

Available actions:
- create: Create new shapes
- update: Modify existing shapes
- delete: Remove shapes
- draw: Create freehand drawings

Respond with JSON actions to modify the canvas.`
}
```

## Streaming

Handle streaming responses with partial actions:

```typescript
async function* readStream(response: Response) {
	const reader = response.body.getReader()
	const decoder = new TextDecoder()
	let buffer = ''

	while (true) {
		const { done, value } = await reader.read()
		if (done) break

		buffer += decoder.decode(value)

		// Parse complete actions from buffer
		const actions = parseActions(buffer)
		for (const action of actions) {
			yield action
		}
	}
}
```

## Tool definitions

Define agent tools using Zod schemas:

```typescript
import { z } from 'zod'

const createShapeTool = {
	name: 'createShape',
	description: 'Create a new shape on the canvas',
	parameters: z.object({
		type: z.enum(['geo', 'text', 'arrow']),
		x: z.number(),
		y: z.number(),
		props: z.object({
			geo: z.enum(['rectangle', 'ellipse', 'star']).optional(),
			text: z.string().optional(),
			w: z.number().optional(),
			h: z.number().optional(),
		}),
	}),
}
```

## Project structure

```
/agent
├── client/
│   ├── App.tsx
│   ├── AgentPanel.tsx
│   └── actions.ts
├── worker/
│   ├── worker.ts
│   ├── tools.ts
│   └── prompts.ts
├── wrangler.toml
└── package.json
```

## Deployment

```bash
npm run build
npx wrangler deploy
```

## Related

- [Fairy worker](../infrastructure/fairy-worker.md) - tldraw.com's AI system
- [Branching chat template](./branching-chat.md) - Chat interface
- [Custom tools](../guides/custom-tools.md) - Creating tools
