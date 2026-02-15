import fs from 'fs'
import { WebSocketServer } from 'ws'
import { refreshContent } from './refresh-content-fn'

// @ts-expect-error set environment variable
process.env.NODE_ENV = 'development'

function nicelog(...args: unknown[]) {
	// eslint-disable-next-line no-console
	console.log(...args)
}

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
	let timeout: ReturnType<typeof setTimeout> | null = null
	return ((...args: any[]) => {
		if (timeout) clearTimeout(timeout)
		timeout = setTimeout(() => fn(...args), ms)
	}) as unknown as T
}

refreshContent({ silent: true })

fs.watch(
	'content',
	{ persistent: true, recursive: true },
	debounce(async (_eventType: string, fileName: string | null) => {
		nicelog(`Refreshing after change: ${fileName}`)
		try {
			await refreshContent({ silent: true })
			clients.forEach((ws) => ws.send('refresh'))
		} catch (e: any) {
			nicelog(`✗ Could not refresh content: ${e.message}`)
		}
	}, 250)
)

const wss = new WebSocketServer({ port: 3003 })
const clients = new Set<any>()

wss.on('connection', function connection(ws) {
	clients.add(ws)
	ws.on('error', console.error)
	ws.on('close', () => {
		clients.delete(ws)
	})
})
