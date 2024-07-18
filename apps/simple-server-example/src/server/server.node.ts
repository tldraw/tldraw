import cors from '@fastify/cors'
import websocketPlugin from '@fastify/websocket'
import fastify from 'fastify'
import { loadAsset, storeAsset } from './assets'
import { makeOrLoadRoom } from './rooms'
import { unfurl } from './unfurl'

const PORT = 5858

const app = fastify()

app.register(websocketPlugin)
app.register(cors, { origin: '*' })
app.register(async (app) => {
	// sync
	app.get('/connect/:roomId', { websocket: true }, async (socket, req) => {
		const roomId = (req.params as any).roomId as string
		const sessionId = (req.query as any)?.['sessionKey'] as string | undefined
		if (typeof sessionId !== 'string') {
			socket.close(4000, 'sessionKey must be a string')
			return
		}
		const room = await makeOrLoadRoom(roomId)
		room.handleSocketConnect({ sessionId, socket })
	})
	// assets
	// allow uploading any file
	app.addContentTypeParser('*', (_, __, done) => done(null))
	app.put('/uploads/:id', {}, async (req, res) => {
		try {
			const id = (req.params as any).id as string
			await storeAsset(id, req.raw)
			res.send({ ok: true })
		} catch (e) {
			console.error(e)
		}
	})
	app.get('/uploads/:id', async (req, res) => {
		const id = (req.params as any).id as string
		const data = await loadAsset(id)
		res.send(data)
	})
	// bookmarks
	app.get('/unfurl', async (req, res) => {
		const url = (req.query as any).url as string
		if (typeof url !== 'string') {
			res.status(400).send({ error: 'url must be a string' })
			return
		}
		res.send(await unfurl(url))
	})
})

app.listen({ port: PORT }, (err) => {
	if (err) {
		console.error(err)
		process.exit(1)
	}

	console.log(`Server started on port ${PORT}`)
})
