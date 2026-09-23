import { ShapeCluster } from '@tldraw/dotcom-shared'
import { Environment, McpClusterIndexKey } from '../../types'
import { getRoomDurableObject } from '../../utils/durableObjects'
import {
	PageClusterIndex,
	ResolvedPageOk,
	clustersFromIndex,
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
//
// Fresh relative to the snapshot, not to the board. An index is keyed to the content version it was
// measured from, so it can never be staler than the snapshot the call is already reading — and that
// snapshot is the last persisted one, which for a shared file lags the live room by the persist
// interval. A tool carries that same lag whether it hit this cache or measured from scratch, so no
// expiry here would shorten it (see "Open questions" in browser-run-thumbnails.md).

interface CacheContext {
	env: Environment
	request?: Request
	ctx?: ExecutionContext
}

/**
 * The ceiling on a stored index, above which a page is never cached and keeps measuring.
 *
 * A page of a few thousand shapes serializes to tens of kilobytes. The cap is for the outlier, and it
 * is deliberately generous — the biggest pages are the most expensive to measure, so refusing to
 * cache them is refusing the cache's best case. What it bounds is the worst case a file can hold:
 * this times its page count times the two board kinds, paid for as long as the file lives, since rows
 * are replaced and pruned but never expired. Measured in UTF-16 units, so a page of
 * non-ASCII text stores more bytes than the number suggests — well inside any storage limit either way.
 */
export const MAX_CLUSTER_INDEX_LENGTH = 256 * 1024

function keyFor(
	board: ResolvedThumbnailBoard,
	pageId: string,
	snapshotVersion: string
): McpClusterIndexKey {
	return { kind: board.kind, pageId, version: snapshotVersion }
}

/**
 * A page's clusters as stored, or null if there isn't a usable index for it.
 *
 * "Usable" is decided here in full — the row exists, it is for this content version, it parses as
 * this build's format, and it names the shapes that are on the page — so a caller gets clusters it
 * can answer from or nothing at all, and never a third case to handle.
 */
export async function readPageClusters(
	{ env, request, ctx }: CacheContext,
	board: ResolvedThumbnailBoard,
	page: ResolvedPageOk,
	snapshotVersion: string
): Promise<ShapeCluster[] | null> {
	try {
		const stored = await getRoomDurableObject(env, board.fileId).getMcpClusterIndex(
			keyFor(board, page.pageId, snapshotVersion)
		)
		if (!stored) return null

		const index = parseClusterIndex(stored)
		// A row written by a build with a different format, or one that disagrees with the snapshot,
		// is a miss rather than an error: the next measure overwrites it.
		return index && clustersFromIndex(page, index)
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
	index: PageClusterIndex,
	snapshotVersion: string
): Promise<void> {
	try {
		const payload = JSON.stringify(index)
		if (payload.length > MAX_CLUSTER_INDEX_LENGTH) return

		await getRoomDurableObject(env, board.fileId).putMcpClusterIndex(
			keyFor(board, page.pageId, snapshotVersion),
			payload,
			page.pageIds
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
			extras: { kind: board.kind, pageId: page.pageId },
		})
	}
}
