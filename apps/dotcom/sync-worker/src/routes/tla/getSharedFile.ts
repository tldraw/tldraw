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
	const file = await createPostgresConnectionPool(env, 'getSharedFileInfo')
		.selectFrom('file')
		.select(['id', 'shared', 'isDeleted'])
		.where('id', '=', slug)
		.executeTakeFirst()

	return file ?? null
}

/**
 * Whether a file may be screenshotted by the anonymous, image-only MCP tool. This mirrors the
 * anonymous read gate enforced by the file room itself (`TLFileDurableObject.onRequest`): the file
 * must exist, not be deleted, and be shared via link. `sharedLinkType` (`view` vs `edit`) is
 * irrelevant to viewing. Test-slug files require admin auth to read, which the anonymous tool never
 * has, so they are refused outright.
 */
export function isFileAnonymouslyViewable(file: SharedFileInfo | null): file is SharedFileInfo {
	return !!file && !file.isDeleted && file.shared === true && !isTestFile(file.id)
}

// Read the live room snapshot for an anonymously-shared file from R2. Re-checks the share gate so a
// board that was un-shared after a render token was minted is not served during the token's window.
export async function getSharedFileRoomSnapshot(
	env: Environment,
	slug: string
): Promise<RoomSnapshot | undefined> {
	const file = await getSharedFileInfo(env, slug)
	if (!isFileAnonymouslyViewable(file)) throw Error('not shared')

	return (await env.ROOMS.get(getR2KeyForRoom({ slug, isApp: true })).then((r) => r?.json())) as
		| RoomSnapshot
		| undefined
}
