import fs from 'fs'

import { WebSocketServer } from 'ws'
import { refreshContent } from './scripts/functions/refreshContent'
import { debounce } from './utils/debounce'
import { nicelog } from './utils/nicelog'

refreshContent({ silent: true })

fs.watch(
	'content',
	{ persistent: true, recursive: true },
	debounce(async (eventType, fileName) => {
		nicelog(`Refreshing after ${eventType}: ${fileName}`)
		// todo: if a file was only updated, then only update the file that changed, any links that point to it, etc.
		try {
			await refreshContent({ silent: true })
			clients.forEach((ws) => ws.send('refresh'))
		} catch (e: any) {
			nicelog(`x Could not refresh content: ${e.message}`)
		}
	}, 250)
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
