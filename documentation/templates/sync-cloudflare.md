---
title: Sync Cloudflare template
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - sync
  - multiplayer
  - cloudflare
  - durable objects
  - template
---

The Sync Cloudflare template provides self-hosted real-time multiplayer using tldraw sync with Cloudflare Durable Objects.

## Quick start

```bash
npx create-tldraw my-app --template tldraw-sync-cloudflare
cd my-app
npm install
npm run dev
```

## What's included

- tldraw with multiplayer sync
- Cloudflare Worker backend
- Durable Objects for room state
- R2 storage for persistence
- Asset upload handling

## Project structure

```
my-app/
├── client/              # React frontend
│   ├── src/
│   │   └── App.tsx
│   └── vite.config.ts
├── worker/              # Cloudflare Worker
│   ├── src/
│   │   └── worker.ts
│   └── wrangler.toml
└── package.json
```

## Client setup

```typescript
// client/src/App.tsx
import { Tldraw } from 'tldraw'
import { useSync } from '@tldraw/sync'
import 'tldraw/tldraw.css'

function App() {
  const store = useSync({
    uri: `ws://localhost:5172/room/${roomId}`,
  })

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw store={store} />
    </div>
  )
}
```

## Worker setup

```typescript
// worker/src/worker.ts
import { TLSocketRoom } from '@tldraw/sync-core'

export class TldrawRoom extends DurableObject {
	private room: TLSocketRoom<TLRecord, void> | null = null

	async fetch(request: Request) {
		const { 0: clientSocket, 1: serverSocket } = new WebSocketPair()
		serverSocket.accept()

		const room = await this.getRoom()
		room.handleSocketConnect({
			sessionId: crypto.randomUUID(),
			socket: serverSocket,
		})

		return new Response(null, { status: 101, webSocket: clientSocket })
	}

	async getRoom() {
		if (!this.room) {
			this.room = new TLSocketRoom({
				// Configuration
			})
		}
		return this.room
	}
}

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url)
		const match = url.pathname.match(/^\/room\/(.+)$/)

		if (match) {
			const roomId = match[1]
			const id = env.TLDRAW_ROOMS.idFromName(roomId)
			const room = env.TLDRAW_ROOMS.get(id)
			return room.fetch(request)
		}

		return new Response('Not found', { status: 404 })
	},
}
```

## Wrangler configuration

```toml
# worker/wrangler.toml
name = "tldraw-sync"

[[durable_objects.bindings]]
name = "TLDRAW_ROOMS"
class_name = "TldrawRoom"

[[r2_buckets]]
binding = "ROOM_SNAPSHOTS"
bucket_name = "tldraw-snapshots"
```

## Development

```bash
# Start both client and worker
npm run dev

# Client only
npm run dev:client

# Worker only
npm run dev:worker
```

## Persistence

### Save room state

```typescript
async persistRoom() {
  const room = await this.getRoom()
  const snapshot = room.getCurrentSnapshot()
  await this.env.ROOM_SNAPSHOTS.put(
    this.roomId,
    JSON.stringify(snapshot)
  )
}
```

### Load room state

```typescript
async getRoom() {
  if (!this.room) {
    const saved = await this.env.ROOM_SNAPSHOTS.get(this.roomId)
    const initialSnapshot = saved ? JSON.parse(saved) : undefined

    this.room = new TLSocketRoom({
      initialSnapshot,
    })
  }
  return this.room
}
```

## Asset uploads

### Worker endpoint

```typescript
.post('/api/uploads/:id', async (request, env) => {
  const id = request.params.id
  await env.ASSETS.put(id, request.body)
  return new Response(JSON.stringify({ id }))
})

.get('/api/uploads/:id', async (request, env) => {
  const id = request.params.id
  const object = await env.ASSETS.get(id)
  return new Response(object?.body)
})
```

### Client configuration

```typescript
const store = useSync({
	uri: `ws://localhost:5172/room/${roomId}`,
	assets: {
		upload: async (file) => {
			const id = crypto.randomUUID()
			await fetch(`/api/uploads/${id}`, {
				method: 'POST',
				body: file,
			})
			return { id, src: `/api/uploads/${id}` }
		},
	},
})
```

## Deployment

### Deploy to Cloudflare

```bash
cd worker
npx wrangler deploy
```

### Deploy client

Build the client and deploy to any static hosting:

```bash
cd client
npm run build
# Deploy dist/ folder
```

## Scaling

Durable Objects automatically scale:

- Each room runs in its own isolate
- Rooms are distributed globally
- State is persisted to storage

## Security considerations

- Add authentication before production use
- Validate user permissions per room
- Consider rate limiting
- Use HTTPS in production

## Related

- [Multiplayer architecture](../architecture/multiplayer.md) - How sync works
- [@tldraw/sync](../packages/sync.md) - Sync hooks
- [@tldraw/sync-core](../packages/sync-core.md) - Core sync infrastructure
- [Vite template](./vite.md) - Single-player alternative
