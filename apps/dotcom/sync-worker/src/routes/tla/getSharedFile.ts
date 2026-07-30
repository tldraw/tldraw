import { RoomSnapshot } from '@tldraw/sync-core'
import { createPostgresConnectionPool } from '../../postgres'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'
import { isTestFile } from '../../utils/tla/isTestFile'

export interface SharedFileInfo {
	id: string
	shared: boolean
	isDeleted: boolean
}

// Look up an app file directly by its id (the `:slug` in tldraw.com/f/:slug) without loading the
// room snapshot. Returns null when the file is unknown.
export async function getSharedFileInfo(
	env: Environment,
	slug: string
): Promise<SharedFileInfo | null> {
	// createPostgresConnectionPool news up a pg.Pool; destroy it so idle pools don't pile up in the
	// isolate across MCP resolves, OG image requests, and queue re-resolves.
	const db = createPostgresConnectionPool(env, 'getSharedFileInfo')
	try {
		const file = await db
			.selectFrom('file')
			.select(['id', 'shared', 'isDeleted'])
			.where('id', '=', slug)
			.executeTakeFirst()
		return file ?? null
	} finally {
		await db.destroy()
	}
}

/**
 * Whether a file is worth rendering a thumbnail of at all: it exists, is not deleted, and is not a
 * test file. Says nothing about who may *see* that thumbnail — thumbnails are generated for every
 * board, including private ones, so that an owner-facing surface has one to show. Serving is gated
 * separately, at the point of serving.
 *
 * Test-slug files are excluded because reading them requires admin auth, so they have no business
 * being pulled through the render page.
 */
export function isFileRenderable(file: SharedFileInfo | null): file is SharedFileInfo {
	return !!file && !file.isDeleted && !isTestFile(file.id)
}

/**
 * Whether a file may be served to an anonymous caller — the MCP tool, the OG image route, the
 * crawler HTML. Renderable, plus actually shared via link. This mirrors the anonymous read gate
 * enforced by the file room itself (`TLFileDurableObject.onRequest`). `sharedLinkType` (`view` vs
 * `edit`) is irrelevant to viewing.
 */
export function isFileAnonymouslyViewable(file: SharedFileInfo | null): file is SharedFileInfo {
	return isFileRenderable(file) && file.shared === true
}

/**
 * How much of a board a caller is entitled to. `public` is the anonymous gate: the board must be
 * shared via link. `render` is for generating a thumbnail we will store but not necessarily serve
 * publicly, so it only requires that the board exists and has content.
 *
 * Required at every call site rather than defaulted, because a default would be the wrong one for
 * half of them and silence is the wrong way to pick a gate.
 */
export type ThumbnailBoardAccess = 'public' | 'render'

// Read the live room snapshot for an app file from R2. Re-checks the caller's gate rather than
// trusting whatever check happened earlier: a `public` read of a board un-shared since a render
// token was minted must stop resolving inside that token's window.
export async function getSharedFileRoomSnapshot(
	env: Environment,
	slug: string,
	{ access }: { access: ThumbnailBoardAccess }
): Promise<RoomSnapshot | undefined> {
	const file = await getSharedFileInfo(env, slug)
	const allowed = access === 'public' ? isFileAnonymouslyViewable(file) : isFileRenderable(file)
	if (!allowed) throw Error(access === 'public' ? 'not shared' : 'not renderable')

	return (await env.ROOMS.get(getR2KeyForRoom({ slug, isApp: true })).then((r) => r?.json())) as
		| RoomSnapshot
		| undefined
}
