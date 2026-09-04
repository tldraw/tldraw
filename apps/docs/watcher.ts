import fs from 'fs'
import { WebSocketServer } from 'ws'
import { refreshContent } from './scripts/lib/refreshContent'
import { debounce } from './utils/debounce'
import { nicelog } from './utils/nicelog'

// set environment variable to development
// @ts-expect-error whatever
process.env.NODE_ENV = 'development'

// Refreshes are chained so they never overlap: each one drops and rebuilds every table in
// content.db, and two running at once fail with "no such table" / UNIQUE violations and can
// leave the db half-filled.
let refreshQueue: Promise<void> = Promise.resolve()
function queueRefresh(reason: string) {
	refreshQueue = refreshQueue.then(async () => {
		nicelog(`Refreshing after ${reason}`)
		try {
			await refreshContent({ silent: true })
			clients.forEach((ws) => ws.send('refresh'))
		} catch (e: any) {
			// an unhandled rejection would take down `yarn dev` (concurrently --kill-others)
			nicelog(`x Could not refresh content: ${e.message}`)
		}
	})
}

queueRefresh('startup')

fs.watch(
	'content',
	{ persistent: true, recursive: true },
	// todo: if a file was only updated, then only update the file that changed, any links that point to it, etc.
	debounce((eventType, fileName) => queueRefresh(`${eventType}: ${fileName}`), 250)
)

const wss = new WebSocketServer({ port: 3201 })

const clients = new Set<any>()

wss.on('connection', function connection(ws) {
	clients.add(ws)
	ws.on('error', console.error)
	ws.on('close', () => {
		clients.delete(ws)
	})
})
