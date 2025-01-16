import { DurableObject } from 'cloudflare:workers'
import { IRequest } from 'itty-router'
import { Environment } from './types'

export class TLLoggerDurableObject extends DurableObject<Environment> {
	private readonly isDebugEnv
	constructor(ctx: DurableObjectState, env: Environment) {
		super(ctx, env)
		this.isDebugEnv = env.TLDRAW_ENV === 'preview' || env.TLDRAW_ENV === 'development'
	}

	private sockets = new Set<WebSocket>()

	private history: string[] = []

	async debug(messages: string[]) {
		if (!this.isDebugEnv) return
		messages = messages.map((msg) => `[${new Date().toISOString()}]: ${msg}`)
		this.history.push(...messages)
		while (this.history.length > 10000) {
			this.history.shift()
		}
		const sockets = Array.from(this.sockets)
		if (this.sockets.size === 0) return
		for (const message of messages) {
			sockets.forEach((socket) => {
				socket.send(message + '\n')
			})
		}
	}

	override async fetch(_req: IRequest) {
		if (!this.isDebugEnv) return new Response('Not Found', { status: 404 })
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
		serverWebSocket.accept()

		this.sockets.add(serverWebSocket)
		const cleanup = () => {
			this.sockets.delete(serverWebSocket)
			serverWebSocket.close()
		}
		serverWebSocket.addEventListener('close', cleanup)
		serverWebSocket.addEventListener('error', cleanup)
		serverWebSocket.send('Connected to logger\n' + this.history.join('\n'))
		return new Response(null, { status: 101, webSocket: clientWebSocket })
	}
}
