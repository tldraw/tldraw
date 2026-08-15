import { TlaFile } from '@tldraw/dotcom-shared'

// A real Error so Sentry shows the slug and a stack; checks are DO-local instanceof.
// Lives outside TLFileDurableObject.ts (which pulls in cloudflare:workers) so it can be
// imported from plain Node tests.
export class RoomNotFoundError extends Error {
	constructor(slug: string) {
		super(`Room not found: ${slug}`)
		this.name = 'RoomNotFoundError'
	}
}

// A trashed file's room may never have existed; for live files a missing room is
// usually the duplicate-from-source race, which the outbox retry heals.
export function shouldSkipMissingRoomEffect(error: unknown, file: TlaFile): boolean {
	return error instanceof RoomNotFoundError && file.isDeleted
}
