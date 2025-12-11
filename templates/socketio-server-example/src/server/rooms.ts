import { NodeSqliteWrapper, SQLiteSyncStorage, TLSocketRoom } from '@tldraw/sync-core'
import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { join } from 'path'

// For this example we're saving data to a SQLite database on the local filesystem
const DIR = './.rooms'
mkdirSync(DIR, { recursive: true })

// Sanitize roomId to prevent path traversal attacks
function sanitizeRoomId(roomId: string): string {
	return roomId.replace(/[^a-zA-Z0-9_-]/g, '_')
}

// We'll keep an in-memory map of active rooms
const rooms = new Map<string, TLSocketRoom<any, void>>()

export function makeOrLoadRoom(roomId: string): TLSocketRoom<any, void> {
	roomId = sanitizeRoomId(roomId)

	const existing = rooms.get(roomId)
	if (existing && !existing.isClosed()) {
		return existing
	}

	console.log('loading room', roomId)

	// Open the database - file is created if it doesn't exist
	const db = new Database(join(DIR, `${roomId}.db`))
	const sql = new NodeSqliteWrapper(db)
	const storage = new SQLiteSyncStorage({ sql })

	const room = new TLSocketRoom({
		storage,
		onSessionRemoved(room, args) {
			console.log('client disconnected', args.sessionId, roomId)
			if (args.numSessionsRemaining === 0) {
				console.log('closing room', roomId)
				room.close()
				db.close()
				rooms.delete(roomId)
			}
		},
	})

	rooms.set(roomId, room)
	return room
}
