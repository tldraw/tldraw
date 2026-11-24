import { ThumbnailRenderParams, ThumbnailSnapshotResponseBody } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { TLRecord } from '@tldraw/tlschema'
import { sliceSnapshotForRender } from './sliceSnapshotForRender'

/** One render of one board page: which records to draw and how. */
export interface ThumbnailRenderJob {
	/**
	 * `content` fits the board's current page content into the requested output size; when omitted, the
	 * render page uses x/y/z directly.
	 *
	 * Every surface asks for `content`, so the explicit-viewport path is unexercised in production.
	 */
	camera?: 'content'
	/**
	 * The TLPageId of the single page to render. When omitted, the render page exports whichever page
	 * the snapshot opens to (used by OG images).
	 */
	pageId?: string
	/**
	 * Restricts the export to these shape ids. The render page fits the camera to their common bounds
	 * and draws only them. Omitted means the whole page.
	 */
	shapeIds?: string[]
	/** `live`: the page prunes to `shapeIds`, settles, and lets the screenshot rasterize the canvas. */
	capture?: 'live'
	/**
	 * `measure` skips the export and returns the page's shape geometry instead — the only way a Worker
	 * can obtain bounds, since sizing a shape needs an editor and font metrics.
	 */
	mode?: 'screenshot' | 'measure'
	/** The viewport the render page sets directly when `camera` is omitted. */
	x: number
	y: number
	z: number
	width: number
	height: number
	theme: 'light' | 'dark'
}

function renderParamsForJob(job: ThumbnailRenderJob): ThumbnailRenderParams {
	return {
		...(job.camera ? { camera: job.camera } : null),
		...(job.pageId ? { pageId: job.pageId } : null),
		...(job.shapeIds ? { shapeIds: job.shapeIds } : null),
		...(job.capture ? { capture: job.capture } : null),
		...(job.mode ? { mode: job.mode } : null),
		x: job.x,
		y: job.y,
		z: job.z,
		width: job.width,
		height: job.height,
		theme: job.theme,
	}
}

/**
 * What the render page draws for a job: the payload pushed into the page (see
 * captureThumbnailScreenshot) and handed to the headless editor's shadow (see headlessShadow.ts). One
 * builder, so the two cannot draw different records.
 */
export function thumbnailSnapshotBodyFor(
	snapshot: RoomSnapshot | undefined,
	job: ThumbnailRenderJob
): ThumbnailSnapshotResponseBody {
	// A corrupt or partial R2 payload can carry schema metadata without a documents array; guard it
	// so it returns a controlled 404 rather than throwing on the .map below and 500ing the render.
	if (!snapshot?.schema || !snapshot.documents) {
		return { error: true, message: 'Board not found' }
	}

	// A job can target a specific page, chosen from an earlier read of the board. If the page is gone
	// from this snapshot the render page would silently fall back to whichever page the snapshot opens
	// to, and the caller would get a picture of the wrong page. Fail instead, so the capture surfaces
	// as a retryable render error rather than a wrong image.
	if (
		job.pageId &&
		!snapshot.documents.some((d) => (d.state as TLRecord | undefined)?.id === job.pageId)
	) {
		return { error: true, message: 'Page not found' }
	}

	// Same reasoning as the page check above, and it matters more here: with every requested shape
	// gone the render page would have nothing to fit the camera to and would export a blank frame,
	// which the caller would take for a picture of those shapes. Requiring every id to still be
	// present turns a stale request into a retryable render error instead.
	if (job.shapeIds) {
		const presentIds = new Set(snapshot.documents.map((d) => (d.state as TLRecord | undefined)?.id))
		if (!job.shapeIds.every((id) => presentIds.has(id as TLRecord['id']))) {
			return { error: true, message: 'Shape not found' }
		}
	}

	const records = snapshot.documents.map((d) => d.state) as TLRecord[]
	return {
		error: false,
		// The rest of the board costs parse, migration and store load inside the Browser Run budget.
		records: sliceSnapshotForRender(records, job) ?? records,
		schema: snapshot.schema,
		renderParams: renderParamsForJob(job),
	}
}
