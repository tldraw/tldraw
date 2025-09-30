import { WebSocketMinimal } from '@tldraw/sync-core'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { loadAsset, storeAsset } from './assets'
import { makeOrLoadRoom } from './rooms'
import { unfurl } from './unfurl'

const PORT = 5858

// For this example we use Socket.IO with Express
// To keep things simple we're skipping normal production concerns like rate limiting and input validation.
// Create Express app and HTTP server for Socket.IO
const app = express()
const server = createServer(app)

// Enable CORS and parse JSON
app.use(express.json())
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*')
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
	next()
})

export interface ServerToClientMessage {
	'tldraw-message': (message: string) => void
}

export interface ClientToServerMessage {
	'tldraw-message': (message: string) => void
}

// Create Socket.IO server
const io = new Server<ClientToServerMessage, ServerToClientMessage>(server, {
	cors: {
		origin: '*',
		methods: ['GET', 'POST'],
	},
})

// This is the main entrypoint for the multiplayer sync
io.on('connection', async (socket) => {
	console.log('Socket.IO client connected:', socket.id)

	// The roomId and sessionId are passed from the client as query params,
	// you need to extract them and pass them to the room.
	const sessionId = socket.handshake.query.sessionId as string
	const roomId = socket.handshake.query.roomId as string

	if (!sessionId || !roomId) {
		console.log('Missing required parameters, disconnecting:', socket.id)
		socket.disconnect()
		return
	}

	console.log('Connecting to room:', roomId, 'with session:', sessionId)

	try {
		// Here we make or get an existing instance of TLSocketRoom for the given roomId
		const room = await makeOrLoadRoom(roomId)

		// Create a socket adapter for TLSocketRoom
		const socketAdapter: WebSocketMinimal = {
			send: (message) => {
				socket.emit('tldraw-message', JSON.parse(message))
			},
			close: () => {
				socket.disconnect()
			},
			get readyState() {
				return socket.connected ? 1 : 3 // 1 = OPEN, 3 = CLOSED
			},
		}

		// and finally connect the socket to the room
		room.handleSocketConnect({
			sessionId: sessionId,
			socket: socketAdapter,
		})

		// Handle tldraw sync messages
		socket.on('tldraw-message', (message) => {
			// Ensure message is a string - Socket.IO might send it as an object or buffer
			room.handleSocketMessage(sessionId, message)
		})

		// Handle disconnect
		socket.on('disconnect', () => {
			console.log('Socket.IO client disconnected:', socket.id)
		})
	} catch (error) {
		console.error('Error setting up room connection:', error)
		socket.disconnect()
	}
})

// To enable blob storage for assets, we add simple endpoints supporting PUT and GET requests
app.put('/uploads/:id', express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
	try {
		const id = req.params.id
		await storeAsset(id, req.body)
		res.json({ ok: true })
	} catch (error) {
		console.error('Asset upload error:', error)
		res.status(500).json({ error: 'Upload failed' })
	}
})

app.get('/uploads/:id', async (req, res) => {
	try {
		const id = req.params.id
		const data = await loadAsset(id)
		res.send(data)
	} catch (error) {
		console.error('Asset download error:', error)
		res.status(404).json({ error: 'Asset not found' })
	}
})

// To enable unfurling of bookmarks, we add a simple endpoint that takes a URL query param
app.get('/unfurl', async (req, res) => {
	try {
		const url = req.query.url as string
		if (!url) {
			return res.status(400).json({ error: 'URL parameter required' })
		}
		const result = await unfurl(url)
		return res.json(result)
	} catch (error) {
		console.error('Unfurl error:', error)
		return res.status(500).json({ error: 'Unfurl failed' })
	}
})

// Start server
server.listen(PORT, () => {
	console.log(`Server started on port ${PORT}`)
})
