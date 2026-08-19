import { Environment, McpClusterIndexKey } from '../../types'
import { getRoomDurableObject } from '../../utils/durableObjects'
import {
	CLUSTER_INDEX_FORMAT_VERSION,
	PageClusterIndex,
	ResolvedPageOk,
	isClusterIndexUsable,
	parseClusterIndex,
} from './boardTools'
import { ResolvedThumbnailBoard } from './thumbnailRender'
import { reportThumbnailError } from './thumbnailShared'

// The cache that keeps the clustering tools off Browser Run. What it holds and why is documented
// where it is built, in boardTools.ts; this is where it is stored and read.
//
// A cache in the strict sense: every path through here falls back to measuring, nothing depends on a
// read succeeding, and a tool never fails because a write did not.
//
// The store is the file's own Durable Object, addressed by `ResolvedThumbnailBoard.fileId`. That is
// the only Durable Object hop in the MCP request path — the tools otherwise read the room's
// persisted snapshot straight out of R2 and never talk to the object that wrote it.

/**
 * The ceiling on a stored index, above which a page is never cached and keeps measuring.
 *
 * A page of a few thousand shapes serializes to tens of kilobytes. The cap is for the outlier: rows
 * are replaced on edit but never expired, so whatever is written is paid for as long as the file lives.
 */
export const MAX_CLUSTER_INDEX_BYTES = 256 * 1024

interface CacheContext {
	env: Environment
	request?: Request
	ctx?: ExecutionContext
}

function keyFor(board: ResolvedThumbnailBoard, pageId: string): McpClusterIndexKey {
	return { kind: board.kind, slug: board.slug, pageId, version: String(board.version) }
}

/**
 * The stored index for a page, or null if there isn't a usable one.
 *
 * "Usable" is decided here in full — the row exists, it is for this content version, it parses as
 * this build's format, and it names the shapes that are on the page — so a caller gets an index it
 * can serve from or nothing at all, and never a third case to handle.
 */
export async function readPageClusterIndex(
	{ env, request, ctx }: CacheContext,
	board: ResolvedThumbnailBoard,
	page: ResolvedPageOk
): Promise<PageClusterIndex | null> {
	try {
		const stored = await getRoomDurableObject(env, board.fileId).getMcpClusterIndex(
			keyFor(board, page.pageId)
		)
		if (!stored) return null

		const index = parseClusterIndex(stored)
		// A row written by a build with a different format, or one that disagrees with the snapshot,
		// is a miss rather than an error: the next measure overwrites it.
		if (!index || !isClusterIndexUsable(page, index)) return null
		return index
	} catch (error) {
		// A cache that cannot be read costs a render, and the caller is about to pay it anyway. Worth
		// reporting all the same: silently falling back means every call re-measures at full price.
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'mcp_cluster_index_read',
			extras: { kind: board.kind, pageId: page.pageId },
		})
		return null
	}
}

/**
 * Stores a page's index for the content it was measured from.
 *
 * Awaited rather than fired off in the background: a background write would leave the very next tool
 * call — usually get_cluster_info on the clusters just listed — racing the write it depends on.
 */
export async function writePageClusterIndex(
	{ env, request, ctx }: CacheContext,
	board: ResolvedThumbnailBoard,
	page: ResolvedPageOk,
	index: PageClusterIndex
): Promise<void> {
	try {
		const payload = JSON.stringify(index)
		if (payload.length > MAX_CLUSTER_INDEX_BYTES) return

		await getRoomDurableObject(env, board.fileId).putMcpClusterIndex(
			keyFor(board, page.pageId),
			payload
		)
	} catch (error) {
		// Reported, never raised. The measurements are in hand and the tool's answer is correct; a
		// failed write costs the next caller a render, which is exactly what they would have paid
		// without a cache at all.
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'mcp_cluster_index_write',
			extras: { kind: board.kind, pageId: page.pageId, format: CLUSTER_INDEX_FORMAT_VERSION },
		})
	}
}
