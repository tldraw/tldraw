---
title: Branching chat template
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - chat
  - ai
  - branching
  - conversation
  - template
---

The branching chat template demonstrates how to build a visual conversation tree interface on tldraw's infinite canvas with AI integration.

## Quick start

```bash
npx create-tldraw my-app --template branching-chat
cd my-app
npm install
# Add OPENAI_API_KEY to .dev.vars
npm run dev
```

## What's included

- Visual conversation flow on infinite canvas
- AI chat integration with streaming responses
- Node-based message representation
- Connection system for branching dialogues
- Cloudflare Workers backend

## Architecture

### Frontend

**Node system** - Chat messages as custom shapes:

```typescript
// NodeShapeUtil.tsx
class NodeShapeUtil extends ShapeUtil<NodeShape> {
  override component(shape: NodeShape) {
    return <MessageNode shape={shape} />
  }
}
```

**Connection system** - Visual links between messages:

```typescript
// ConnectionShapeUtil.tsx
class ConnectionShapeUtil extends ShapeUtil<ConnectionShape> {
  // Bezier curves connecting message nodes
}
```

### Backend

**Cloudflare Worker** - AI streaming endpoint:

```typescript
// worker/worker.ts
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)

    if (url.pathname === '/stream') {
      return handleStream(request, env)
    }

    return new Response('Not found', { status: 404 })
  },
}
```

## Message nodes

Each conversation message is a custom shape:

```typescript
// MessageNode.tsx
interface MessageNodeProps {
  userInput: string
  assistantResponse: string
  isStreaming: boolean
}

function MessageNode({ shape }) {
  const [response, setResponse] = useState('')

  const handleSend = async (message: string) => {
    // Build context from connected nodes
    const history = buildConversationHistory(shape)

    // Stream AI response
    const stream = await fetch('/stream', {
      method: 'POST',
      body: JSON.stringify({ history, message }),
    })

    // Update response as it streams
    for await (const chunk of readStream(stream)) {
      setResponse(prev => prev + chunk)
    }
  }

  return (
    <div className="message-node">
      <input onSubmit={handleSend} />
      <div className="response">{response}</div>
    </div>
  )
}
```

## Conversation flow

### Building context

When sending a message, trace back through connected nodes:

```typescript
function buildConversationHistory(node: NodeShape): Message[] {
  const history: Message[] = []
  const visited = new Set<string>()

  function traverse(currentNode: NodeShape) {
    if (visited.has(currentNode.id)) return
    visited.add(currentNode.id)

    // Find parent nodes via input connections
    const parentConnections = getInputConnections(currentNode)
    parentConnections.forEach(conn => {
      const parentNode = getNode(conn.fromNodeId)
      traverse(parentNode)
    })

    // Add this node's messages to history
    history.push({
      role: 'user',
      content: currentNode.props.userInput,
    })
    if (currentNode.props.assistantResponse) {
      history.push({
        role: 'assistant',
        content: currentNode.props.assistantResponse,
      })
    }
  }

  traverse(node)
  return history
}
```

### Branching conversations

Create multiple branches from a single message:

```
[Start] → [Question A] → [Answer A1]
                      → [Answer A2]
       → [Question B] → [Answer B]
```

## AI integration

### Streaming endpoint

```typescript
// worker/worker.ts
async function handleStream(request: Request, env: Env) {
  const { history, message } = await request.json()

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [...history, { role: 'user', content: message }],
    stream: true,
  })

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const text = chunk.choices[0]?.delta?.content || ''
        controller.enqueue(new TextEncoder().encode(text))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}
```

### Client streaming

```typescript
async function* readStream(response: Response) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    yield decoder.decode(value)
  }
}
```

## Port system

Nodes have input and output ports for connections:

```typescript
interface Port {
  id: 'input' | 'output'
  position: Vec2
}

// Port interactions
function PointingPort extends StateNode {
  onPointerDown(info) {
    this.startPort = getPortAtPoint(info.point)
  }

  onPointerUp(info) {
    const endPort = getPortAtPoint(info.point)
    if (canConnect(this.startPort, endPort)) {
      createConnection(this.startPort, endPort)
    }
  }
}
```

## Configuration

### Environment variables

```bash
# .dev.vars
OPENAI_API_KEY=your_api_key_here
```

### Wrangler config

```toml
# wrangler.toml
name = "branching-chat"
main = "worker/worker.ts"
compatibility_date = "2024-01-01"

[vars]
# Environment variables
```

## Deployment

```bash
# Build frontend
npm run build

# Deploy to Cloudflare
npx wrangler deploy
```

## Project structure

```
/branching-chat
├── client/
│   ├── App.tsx              # Main app
│   ├── nodes/
│   │   ├── NodeShapeUtil.tsx
│   │   └── types/MessageNode.tsx
│   ├── connection/
│   │   ├── ConnectionShapeUtil.tsx
│   │   └── ConnectionBindingUtil.tsx
│   └── components/
│       └── WorkflowToolbar.tsx
├── worker/
│   ├── worker.ts            # Worker entry
│   └── types.ts
├── wrangler.toml
└── package.json
```

## Customization

### Custom AI provider

```typescript
// Switch to Anthropic, Google, etc.
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
const response = await client.messages.stream({
  model: 'claude-3-opus-20240229',
  messages: history,
})
```

### Custom node styling

```css
.message-node {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

## Related

- [Workflow template](./workflow.md) - Node-based workflows
- [Agent template](./agent.md) - AI agent integration
- [Custom shapes](../guides/custom-shapes.md) - Creating shapes
