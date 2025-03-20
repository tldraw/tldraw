import { TLSocketRoom } from '@tldraw/sync-core'
import { IRequest, Router, RouterType, cors, json } from 'itty-router'
import { loadAsset, storeAsset } from './assets'
import { makeOrLoadRoom } from './rooms'
import { unfurl } from './unfurl'
const PORT = 5858

// For this example we use Bun.serve and a basic router to handle requests
// To keep things simple we're skipping normal production concerns like rate limiting and input validation.

const { corsify, preflight } = cors({ origin: '*' })

const router: RouterType<IRequest, any, any> = Router()
	.all('*', preflight)

	// This is the main entrypoint for the multiplayer sync
	.get('/connect/:roomId', async (req) => {
		// The roomId comes from the URL pathname
		const roomId = req.params.roomId
		// The sessionId is passed from the client as a query param,
		// you need to extract it and pass it to the room.
		const sessionId = req.query.sessionId
		// Now we pass the params to the upgrade function so that
		// when the socket connects, it can be associated with the correct room
		// and session.
		server.upgrade(req, { data: { roomId, sessionId } })
		return new Response(null, { status: 101 })
	})

	// To enable blob storage for assets, we add a simple endpoint supporting PUT and GET requests
	.put('/uploads/:id', async (req) => {
		const id = (req.params as any).id as string
		await storeAsset(id, (await req.blob()).stream() as any)
		return json({ ok: true })
	})
	.get('/uploads/:id', async (req) => {
		const id = (req.params as any).id as string
		return new Response(await loadAsset(id))
	})

	// To enable unfurling of bookmarks, we add a simple endpoint that takes a URL query param
	.get('/unfurl', async (req) => {
		const url = (req.query as any).url as string
		return json(await unfurl(url))
	})
	.all('*', () => {
		new Response('Not found', { status: 404 })
	})

const server = Bun.serve<{ room?: TLSocketRoom<any, void>; sessionId: string; roomId: string }>({
	port: PORT,
	fetch(req) {
		try {
			return router.fetch(req).then(corsify)
		} catch (e) {
			console.error(e)
			return new Response('Something went wrong', {
				status: 500,
			})
		}
	},
	websocket: {
		async open(socket) {
			// get the params extracted from the URL in the GET /connect/:roomId handler above
			const { sessionId, roomId } = socket.data

			// Here we make or get an existing instance of TLSocketRoom for the given roomId
			const room = await makeOrLoadRoom(roomId)
			// and finally connect the socket to the room
			room.handleSocketConnect({ sessionId, socket })
			// store the room on the socket so we can access it easily later
			socket.data.room = room
		},
		async message(ws, message) {
			// pass the message along to the room
			ws.data.room?.handleSocketMessage(ws.data.sessionId, message)
		},
		drain(ws) {
			// If the socket was was overloaded with backpressure, let's just close it
			// and let the client reconnect and send all the data again.
			ws.close()
		},
		close(ws) {
			// let the room know the socket has closed
			ws.data.room?.handleSocketClose(ws.data.sessionId)
		},
	},
})

console.log(`Listening on localhost:${server.port}`)
