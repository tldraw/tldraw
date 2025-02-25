import { DurableObject } from 'cloudflare:workers'
import { IRequest } from 'itty-router'
import { Environment, isDebugLogging } from './types'

export class TLLoggerDurableObject extends DurableObject<Environment> {
	private readonly isDebugEnv
	private readonly db
	constructor(ctx: DurableObjectState, env: Environment) {
		super(ctx, env)
		this.isDebugEnv = isDebugLogging(env)
		this.db = this.ctx.storage.sql
		this.db.exec(
			`CREATE TABLE IF NOT EXISTS logs (
				message TEXT NOT NULL
			);
			CREATE TRIGGER IF NOT EXISTS limit_logs
			AFTER INSERT ON logs
			BEGIN
				DELETE FROM logs WHERE rowid NOT IN (
					SELECT rowid FROM logs ORDER BY rowid DESC LIMIT 20000
				);
			END;`
		)
	}

	private sockets = new Set<WebSocket>()

	async debug(messages: string[]) {
		if (!this.isDebugEnv) return
		for (const message of messages) {
			this.db.exec(`INSERT INTO logs (message) VALUES (?)`, message)
		}

		const sockets = Array.from(this.sockets)
		if (this.sockets.size === 0) return
		for (const message of messages) {
			sockets.forEach((socket) => {
				socket.send(message + '\n')
			})
		}
	}

	getFullHistory() {
		return this.db
			.exec('SELECT message FROM logs ORDER BY rowid ASC')
			.toArray()
			.map((row) => row.message)
	}

	async clear() {
		this.db.exec('DELETE FROM logs')
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
		serverWebSocket.send('Connected to logger\n' + this.getFullHistory().join('\n'))
		return new Response(null, { status: 101, webSocket: clientWebSocket })
	}
}
