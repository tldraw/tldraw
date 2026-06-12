import { createShapeId, Editor, TLShapeId } from 'tldraw'
import {
	BATCH_GAP,
	CAPTION_ANGLES,
	CAPTION_HEIGHT,
	FOOTER_HEIGHT,
	getDisplaySize,
	getOutputType,
} from '../constants'
import { blobToDataUrl, urlToDataUrl } from './assetBytes'
import { getAssetShapes, getAssetSrc } from './assetRecord'
import { MARKETING_ASSET_TYPE, MarketingAssetShape } from './assetShape'
import { renderFromBrief } from './renderVersion'

/**
 * The Batch seam: turning one brief into a grid of distinct ideas. Everything that
 * spreads a batch across the design space lives here — the grid geometry, the per-tile
 * direction hints, the per-tile caption angles, and the guidance composed from the
 * previous round's verdicts (a refine round) or from a canvas selection (a selection
 * variation). `planBatch` is the pure core: it decides where every tile sits and what
 * prompt it carries; the orchestrators below apply a plan to the canvas and kick off
 * the renders.
 */

// Per-tile nudges so a batch explores distinct directions instead of returning
// near-identical images. Cycled by tile index; the first tile gets none.
const DIRECTION_HINTS = [
	'Explore a bold, graphic direction with a strong focal shape.',
	'Explore a photographic, lifestyle direction.',
	'Explore a minimal, lots-of-whitespace direction.',
	'Explore a vivid, high-energy direction with saturated colour.',
	'Explore an abstract, textured direction.',
	'Explore a clean, product-led direction.',
	'Explore a dark, premium direction.',
	'Explore a playful, illustrative direction.',
]

/** How many approved ideas to feed back into the next batch as references. */
const MAX_FEEDBACK_REFERENCES = 3

/** One planned tile: where it sits (relative to the grid origin) and what it asks for. */
export interface BatchTile {
	x: number
	y: number
	prompt: string
	/** A distinct messaging angle so the tile's caption is unique; batches of one get none. */
	captionAngle?: string
}

/** A laid-out batch, ready to be applied to the canvas at some origin. */
export interface BatchPlan {
	cols: number
	rows: number
	gridW: number
	gridH: number
	tiles: BatchTile[]
}

/**
 * Plan a batch: a near-square grid of tiles, each with its own prompt. Every tile
 * carries the brief plus any feedback; tiles after the first also get a direction hint,
 * and every tile in a multi-tile batch gets a caption angle, so the batch spreads
 * across the design space (and the copy across messaging angles) instead of repeating
 * one idea.
 */
export function planBatch(opts: {
	prompt: string
	feedback?: string
	count: number
	/** The full on-canvas tile size, including any footer/caption chrome. */
	tile: { w: number; h: number }
}): BatchPlan {
	const count = Math.max(1, Math.floor(opts.count))
	const cols = Math.min(count, Math.ceil(Math.sqrt(count)))
	const rows = Math.ceil(count / cols)
	const { w, h } = opts.tile

	const tiles: BatchTile[] = []
	for (let i = 0; i < count; i++) {
		tiles.push({
			x: (i % cols) * (w + BATCH_GAP),
			y: Math.floor(i / cols) * (h + BATCH_GAP),
			prompt: composeTilePrompt(opts.prompt, opts.feedback, i, count),
			captionAngle: count > 1 ? CAPTION_ANGLES[i % CAPTION_ANGLES.length] : undefined,
		})
	}

	return {
		cols,
		rows,
		gridW: cols * w + (cols - 1) * BATCH_GAP,
		gridH: rows * h + (rows - 1) * BATCH_GAP,
		tiles,
	}
}

/**
 * Compose the guidance for a refine round from the reviewer's notes and the previous
 * round's verdicts. Returns '' when there is nothing to say.
 */
export function composeRefineGuidance(opts: {
	notes: string
	referenceCount: number
	rejectedCount: number
}): string {
	return [
		opts.notes.trim() ? `Reviewer notes: ${opts.notes.trim()}` : '',
		opts.referenceCount > 0
			? 'Reference images from approved ideas are provided. Produce fresh variations in the same spirit — keep what works, but do not copy them exactly.'
			: '',
		opts.rejectedCount > 0 ? 'Move away from the rejected directions from the previous round.' : '',
	]
		.filter(Boolean)
		.join(' ')
}

/**
 * Create a grid of asset frames and generate them in parallel — the first batch
 * of ideas, or a follow-up round when `below` is set.
 */
export function createAndGenerateBatch(
	editor: Editor,
	opts: {
		prompt: string
		outputTypeId: string
		count: number
		/** References every tile receives (a reference shot, approved ideas, …). */
		references?: string[]
		/** Extra guidance appended to every tile's prompt (e.g. reviewer feedback). */
		feedback?: string
		/** Place the grid below existing content instead of at the viewport centre. */
		below?: boolean
	}
): TLShapeId[] {
	const outputType = getOutputType(opts.outputTypeId)
	const { w, h } = getDisplaySize(outputType)
	const plan = planBatch({
		prompt: opts.prompt,
		feedback: opts.feedback,
		count: opts.count,
		tile: { w, h: h + FOOTER_HEIGHT + CAPTION_HEIGHT },
	})
	const origin = gridOrigin(editor, plan.gridW, plan.gridH, opts.below ?? false)

	const ids: TLShapeId[] = []
	for (const tile of plan.tiles) {
		const id = createShapeId()
		editor.createShape<MarketingAssetShape>({
			id,
			type: MARKETING_ASSET_TYPE,
			x: origin.x + tile.x,
			y: origin.y + tile.y,
			props: {
				w,
				h,
				outputTypeId: opts.outputTypeId,
				prompt: opts.prompt,
				versions: [],
				currentVersion: 0,
				status: 'generating',
				error: '',
				generatingStartedAt: Date.now(),
				verdict: 'none',
			},
		})
		ids.push(id)

		void renderFromBrief(editor, id, {
			outputType,
			prompt: tile.prompt,
			references: opts.references ?? [],
			captionAngle: tile.captionAngle,
		})
	}

	editor.select(...ids)
	editor.centerOnPoint(
		{ x: origin.x + plan.gridW / 2, y: origin.y + plan.gridH / 2 },
		{ animation: { duration: 400 } }
	)
	return ids
}

/**
 * Generate a fresh batch informed by the current verdicts — a refine round: approved
 * ideas are passed back as references to riff on, rejected ones and the reviewer's
 * notes are folded into the guidance. Placed below the existing rounds so the canvas
 * reads as a top-to-bottom history of iterations.
 */
export async function generateNextBatch(
	editor: Editor,
	opts: { prompt: string; outputTypeId: string; count: number; feedback: string }
): Promise<void> {
	const assets = getAssetShapes(editor)
	const liked = assets.filter((s) => s.props.verdict === 'liked')
	const disliked = assets.filter((s) => s.props.verdict === 'disliked')

	const references = (
		await Promise.all(
			liked.slice(0, MAX_FEEDBACK_REFERENCES).map((s) => getCurrentImageDataUrl(editor, s))
		)
	).filter((x): x is string => !!x)

	createAndGenerateBatch(editor, {
		prompt: opts.prompt,
		outputTypeId: opts.outputTypeId,
		count: opts.count,
		references,
		feedback: composeRefineGuidance({
			notes: opts.feedback,
			referenceCount: references.length,
			rejectedCount: disliked.length,
		}),
		below: true,
	})
}

/**
 * Generate a batch seeded by the current canvas selection — a selection variation:
 * the selected shapes are exported to one image and passed as the key visual
 * reference, so the user can ring an area they like and spin new ideas off it.
 */
export async function createVariationsFromSelection(
	editor: Editor,
	opts: { prompt: string; outputTypeId: string; count: number }
): Promise<void> {
	const selectedIds = editor.getSelectedShapeIds()
	if (selectedIds.length === 0) return

	const { blob } = await editor.toImage(selectedIds, {
		format: 'png',
		background: true,
		padding: 16,
		scale: 2,
	})
	const reference = await blobToDataUrl(blob)

	createAndGenerateBatch(editor, {
		prompt: opts.prompt,
		outputTypeId: opts.outputTypeId,
		count: opts.count,
		references: [reference],
		feedback:
			'The provided image is a region of the canvas the user selected as inspiration. Create variations that build on its look and feel.',
		below: true,
	})
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Combine the brief, any feedback, and a per-tile direction hint. */
function composeTilePrompt(
	prompt: string,
	feedback: string | undefined,
	index: number,
	count: number
): string {
	const parts = [prompt]
	if (feedback?.trim()) parts.push(feedback.trim())
	// Only spread directions when generating more than one idea.
	if (count > 1 && index > 0) parts.push(DIRECTION_HINTS[index % DIRECTION_HINTS.length])
	return parts.filter(Boolean).join('\n')
}

/** Top-left of a new grid: centred on the viewport, or below existing content. */
function gridOrigin(
	editor: Editor,
	gridW: number,
	gridH: number,
	below: boolean
): { x: number; y: number } {
	const content = below ? editor.getCurrentPageBounds() : undefined
	if (content) {
		return { x: content.center.x - gridW / 2, y: content.maxY + BATCH_GAP * 2 }
	}
	const view = editor.getViewportPageBounds().center
	return { x: view.x - gridW / 2, y: view.y - gridH / 2 }
}

/** An asset's current background as a data URL (read back from R2), if any. */
async function getCurrentImageDataUrl(
	editor: Editor,
	shape: MarketingAssetShape
): Promise<string | undefined> {
	const current = shape.props.versions[shape.props.currentVersion]
	if (!current) return undefined
	const src = getAssetSrc(editor, current)
	if (!src) return undefined
	try {
		return await urlToDataUrl(src)
	} catch {
		return undefined
	}
}
