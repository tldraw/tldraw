import { RoomSnapshot } from '@tldraw/sync-core'
import { createPostgresConnectionPool } from '../../postgres'
import { getR2KeyForRoom } from '../../r2'
import { Environment, ThumbnailBoardAccess } from '../../types'
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
 * Whether a file is worth rendering a thumbnail of at all: it exists, is not deleted, and is not a test
 * file (reading one requires admin auth, so it has no business going through the render page). Says
 * nothing about who may *see* that thumbnail — every board gets one, private ones included, and serving
 * is gated separately.
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
 * Applies the gate an access level asks for. The mapping lives here, once, so that resolving a board
 * and reading its snapshot cannot end up applying different gates to the same access level — which
 * would mean a board resolving publicly and then being read under the weaker one.
 */
export function isFileViewableFor(
	file: SharedFileInfo | null,
	access: ThumbnailBoardAccess
): file is SharedFileInfo {
	return access === 'public' ? isFileAnonymouslyViewable(file) : isFileRenderable(file)
}

/**
 * Read the live room snapshot for an app file from R2.
 *
 * The gate always runs here — never trust that whatever resolved this board already applied it. What
 * `file` decides is only whether the row it runs against is re-read or reused:
 *
 * - **Omitted (the default): re-read.** The row is fetched fresh, so a board un-shared since the
 *   caller last looked stops resolving. This is what a read separated from its resolve by a network
 *   hop needs — `getThumbnailSnapshot` serves a *private* board's document to the render page inside
 *   a token's window, and the un-share must land inside that window.
 * - **Supplied: reuse.** For a caller that resolved this board microseconds ago in the same function,
 *   a second query returns the same row and buys nothing but a Postgres connection. The gate is still
 *   applied to the row that was passed, so the check is not skipped — only the round trip is.
 *
 * Pass it only where the resolve is genuinely adjacent to the read. Anywhere else, the freshness is
 * the point.
 */
export async function getSharedFileRoomSnapshot(
	env: Environment,
	slug: string,
	{ access, file: resolvedFile }: { access: ThumbnailBoardAccess; file?: SharedFileInfo }
): Promise<RoomSnapshot | undefined> {
	const file = resolvedFile ?? (await getSharedFileInfo(env, slug))
	if (!isFileViewableFor(file, access)) {
		throw Error(access === 'public' ? 'not shared' : 'not renderable')
	}

	return (await env.ROOMS.get(getR2KeyForRoom({ slug, isApp: true })).then((r) => r?.json())) as
		| RoomSnapshot
		| undefined
}
