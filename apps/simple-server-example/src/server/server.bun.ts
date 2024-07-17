import { TLSocketRoom } from '@tldraw/sync-core'
import { IRequest, Router, RouterType, cors, json } from 'itty-router'
import { loadAsset, storeAsset } from './assets'
import { makeOrLoadRoom } from './rooms'
import { unfurl } from './unfurl'
const PORT = 5858

const { corsify, preflight } = cors({ origin: '*' })

const router: RouterType<IRequest, any, any> = Router()
	.all('*', preflight)
	// sync
	.get('/connect/:roomId', async (req) => {
		const roomId = req.params.roomId
		const sessionKey = req.query.sessionKey
		server.upgrade(req, { data: { roomId, sessionKey } })
		return new Response(null, { status: 101 })
	})
	// assets
	.put('/uploads/:id', async (req) => {
		const id = (req.params as any).id as string
		await storeAsset(id, req.raw)
		return json({ ok: true })
	})
	.get('/uploads/:id', async (req) => {
		const id = (req.params as any).id as string
		return new Response(await loadAsset(id))
	})
	// bookmarks
	.get('/unfurl', async (req) => {
		const url = (req.query as any).url as string
		if (typeof url !== 'string') {
			return new Response('url must be a string', { status: 400 })
		}
		return json(await unfurl(url))
	})
	.all('*', () => {
		new Response('Not found', { status: 404 })
	})

const server = Bun.serve<{ room?: TLSocketRoom<any, void>; sessionKey: string; roomId: string }>({
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
		async open(ws) {
			const { sessionKey, roomId } = ws.data
			const room = await makeOrLoadRoom(roomId)
			room.handleSocketConnect(sessionKey, ws)
			ws.data.room = room
		},
		async message(ws, message) {
			if (!ws.data.room) {
				return
			}
			const sessionKey = (ws.data as any).sessionKey as string
			ws.data.room.handleSocketMessage(sessionKey, message)
		},
		drain(ws) {
			// If the socket was was overloaded with backpressure, let's just close it
			// and let the client reconnect and send all the data again.
			ws.close()
		},
		// no need to implement close, the room will detect it via heartbeat
	},
})

console.log(`Listening on localhost:${server.port}`)
