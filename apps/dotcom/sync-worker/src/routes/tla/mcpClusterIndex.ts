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

// The cache that keeps get_cluster_info off Browser Run.
//
// Three of the four MCP tools have to cluster a page before they can answer anything, and clustering
// needs a measure render: a full browser session, the same cost as a screenshot, spent to learn where
// each shape sits and what text it holds. That answer only changes when the board's content changes,
// so the first tool call to measure a page stores the result here and every later call for the same
// content reads it instead.
//
// It is a cache in the strict sense: a miss is always safe, and every path through here falls back to
// measuring. Nothing depends on a read succeeding, and a tool never fails because a write did not.
//
// The store is the file's own Durable Object, addressed by file id (`ResolvedThumbnailBoard.fileId`)
// — see the table comment on TLFileDurableObject.ensureMcpClusterIndex for why it lives there. This
// is the only Durable Object hop in the MCP request path; the tools otherwise read the room's
// persisted snapshot straight out of R2 and never talk to the object that wrote it.

/**
 * The ceiling on a stored index, above which a page is simply never cached.
 *
 * A page of a few thousand shapes serializes to tens of kilobytes; the cap is there for the outlier
 * that would otherwise park hundreds of kilobytes of shape ids in a file's Durable Object storage
 * permanently — the row is replaced on edit, never expired, so what is written is paid for as long
 * as the file lives. A page over the cap keeps measuring, which is what it did before this existed.
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
 * "Usable" is decided here in full — the row exists, it is for this content version (the object
 * checks that), it parses as this build's format, and the shapes it names are the shapes on the page
 * — so a caller gets an index it can serve from or nothing at all, and never a third case to handle.
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
 * Awaited by its caller rather than fired off in the background: the write is a single small row, and
 * the tool that just spent a render is the one call in the sequence that can afford the few
 * milliseconds. Doing it after the response went out would leave the very next tool call — usually
 * get_cluster_info on the clusters that were just listed — racing the write it depends on.
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
