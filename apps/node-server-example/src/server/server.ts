import websocketPlugin from '@fastify/websocket'
import fastify from 'fastify'
import { makeOrLoadRoom } from './rooms'

const PORT = 5858

const app = fastify()

app.register(websocketPlugin)
app.register(async (app) => {
	app.get('/connect/:roomId', { websocket: true }, async (socket, req) => {
		const roomId = (req.params as any).roomId as string
		const sessionKey = (req.query as any)?.['sessionKey'] as string | undefined
		if (typeof sessionKey !== 'string') {
			socket.close(4000, 'sessionKey must be a string')
			return
		}
		const room = await makeOrLoadRoom(roomId)
		room.handleSocketConnect(sessionKey, socket)
	})
})
app.listen({ port: PORT }, (err) => {
	if (err) {
		// eslint-disable-next-line no-console
		console.error(err)
		process.exit(1)
	}

	// eslint-disable-next-line no-console
	console.log(`Server started on port ${PORT}`)
})
