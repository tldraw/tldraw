import { AssetRecordType, atom, createShapeId, Editor, TLShapeId } from 'tldraw'
import { ReadAnnotation, deleteAnnotations, readAnnotations } from '../annotate/readAnnotations'
import { apiGenerate, apiPlan, OutputType } from '../api/marketingApi'
import { brandReferenceImages, getBrand, serializeBrand } from '../brand/brandState'
import {
	BATCH_GAP,
	CAPTION_ANGLES,
	CAPTION_HEIGHT,
	FOOTER_HEIGHT,
	getDisplaySize,
	getOutputType,
} from '../constants'
import { blobToDataUrl, uploadImageBytes, urlToDataUrl } from './assetBytes'
import {
	getAssetShapes,
	getAssetSrc,
	markFailed,
	markGenerating,
	pushVersion,
	recoverIfStale,
	refreshHeartbeat,
	revertTo,
	setVerdict,
} from './assetRecord'
import { MARKETING_ASSET_TYPE, MarketingAssetShape } from './assetShape'

// Reads and writes of the asset record live in ./assetRecord; re-exported here so
// callers keep reaching asset operations through one module.
export { getAssetShapes, getAssetSrc, revertTo, setVerdict }

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

// Cap on how many sequential render passes one re-render makes.
const MAX_RENDER_STEPS = 8

// How often a running generation refreshes its heartbeat on the shape, and how
// long a 'generating' shape can go without one before a peer treats it as
// abandoned. In multiplayer this distinguishes an active render from one whose
// client navigated away mid-generation.
const GENERATION_HEARTBEAT_MS = 15_000
const STALE_GENERATION_MS = 45_000

// Live progress for multi-step re-renders, keyed by shape id. Kept off the shape
// so it isn't persisted — it's transient UI state for the current render.
interface RenderProgress {
	step: number
	total: number
}
const renderProgress = atom<Record<string, RenderProgress>>('marketing render progress', {})

function setRenderProgress(id: TLShapeId, step: number, total: number): void {
	renderProgress.update((m) => ({ ...m, [id]: { step, total } }))
}
function clearRenderProgress(id: TLShapeId): void {
	renderProgress.update((m) => {
		if (!(id in m)) return m
		const next = { ...m }
		delete next[id]
		return next
	})
}
/** Reactive progress for an in-flight multi-step re-render, if any. */
export function getRenderProgress(id: TLShapeId): RenderProgress | undefined {
	return renderProgress.get()[id]
}

/** Create a single asset frame at the viewport centre and generate it. */
export function createAndGenerate(
	editor: Editor,
	opts: { prompt: string; outputTypeId: string; shot: string | null }
): TLShapeId {
	const [id] = createAndGenerateBatch(editor, {
		prompt: opts.prompt,
		outputTypeId: opts.outputTypeId,
		count: 1,
		references: opts.shot ? [opts.shot] : [],
	})
	return id
}

/**
 * Create a grid of asset frames and generate them in parallel — the first batch
 * of ideas. Each tile gets a different direction hint so the batch spreads across
 * the design space rather than returning near-identical images.
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
	const tileH = h + FOOTER_HEIGHT + CAPTION_HEIGHT
	const count = Math.max(1, Math.floor(opts.count))
	const cols = Math.min(count, Math.ceil(Math.sqrt(count)))
	const rows = Math.ceil(count / cols)
	const gridW = cols * w + (cols - 1) * BATCH_GAP
	const gridH = rows * tileH + (rows - 1) * BATCH_GAP
	const origin = gridOrigin(editor, gridW, gridH, opts.below ?? false)

	const ids: TLShapeId[] = []
	for (let i = 0; i < count; i++) {
		const col = i % cols
		const row = Math.floor(i / cols)
		const id = createShapeId()
		editor.createShape<MarketingAssetShape>({
			id,
			type: MARKETING_ASSET_TYPE,
			x: origin.x + col * (w + BATCH_GAP),
			y: origin.y + row * (tileH + BATCH_GAP),
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

		const tilePrompt = composeTilePrompt(opts.prompt, opts.feedback, i, count)
		// A distinct messaging angle per tile so each asset's caption is unique;
		// single-asset generations get none (nothing to differ from).
		const captionAngle = count > 1 ? CAPTION_ANGLES[i % CAPTION_ANGLES.length] : undefined
		void runFirstGeneration(editor, id, outputType, tilePrompt, opts.references ?? [], captionAngle)
	}

	editor.select(...ids)
	editor.centerOnPoint(
		{ x: origin.x + gridW / 2, y: origin.y + gridH / 2 },
		{ animation: { duration: 400 } }
	)
	return ids
}

/**
 * Generate a fresh batch informed by the current verdicts: approved ideas are
 * passed back as references to riff on, rejected ones and the reviewer's notes are
 * folded into the guidance. Placed below the existing rounds so the canvas reads
 * as a top-to-bottom history of iterations.
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

	const feedback = [
		opts.feedback.trim() ? `Reviewer notes: ${opts.feedback.trim()}` : '',
		references.length
			? 'Reference images from approved ideas are provided. Produce fresh variations in the same spirit — keep what works, but do not copy them exactly.'
			: '',
		disliked.length ? 'Move away from the rejected directions from the previous round.' : '',
	]
		.filter(Boolean)
		.join(' ')

	createAndGenerateBatch(editor, {
		prompt: opts.prompt,
		outputTypeId: opts.outputTypeId,
		count: opts.count,
		references,
		feedback,
		below: true,
	})
}

/**
 * Generate a batch seeded by the current canvas selection: the selected shapes are
 * exported to one image and passed as the key visual reference, so the user can
 * ring an area they like and spin new ideas off it.
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

async function runFirstGeneration(
	editor: Editor,
	id: TLShapeId,
	outputType: OutputType,
	prompt: string,
	extraReferences: string[],
	captionAngle?: string
) {
	const stopHeartbeat = startHeartbeat(editor, id)
	try {
		const brand = getBrand(editor)
		const brandText = serializeBrand(brand)
		const referenceImages = [...brandReferenceImages(brand), ...extraReferences]

		// 1. A text-free background from the image model.
		const { imageUrl } = await apiGenerate({ prompt, brandText, outputType, referenceImages })
		const assetId = await storeImageAsset(editor, imageUrl, outputType)

		// 2. The text layout from the planner: a single headline placed over that
		// background, plus the accompanying caption shown beside the asset.
		const { textLayers, caption } = await apiPlan({
			mode: 'create',
			prompt,
			brandText,
			outputType,
			image: imageUrl,
			captionAngle,
		})

		pushVersion(editor, id, {
			assetId,
			textLayers,
			caption,
			instruction: '',
			createdAt: Date.now(),
		})
	} catch (e) {
		markFailed(editor, id, e)
	} finally {
		stopHeartbeat()
	}
}

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

/** Re-render an asset from its annotations: interpret → render → new version. */
export function reRender(editor: Editor, id: TLShapeId): void {
	const shape = editor.getShape<MarketingAssetShape>(id)
	if (!shape || shape.props.status === 'generating') return

	const current = shape.props.versions[shape.props.currentVersion]
	if (!current) return
	const cleanSrc = getAssetSrc(editor, current)
	if (!cleanSrc) return

	const annotations = readAnnotations(editor, id)
	if (annotations.length === 0) return
	const ids = annotations.flatMap((a) => a.shapeIds)
	const lines = annotations.map(formatAnnotation)

	markGenerating(editor, id, Date.now())

	void (async () => {
		const stopHeartbeat = startHeartbeat(editor, id)
		try {
			const outputType = getOutputType(shape.props.outputTypeId)
			const brand = getBrand(editor)
			const brandText = serializeBrand(brand)

			// Export the asset plus its annotations as one composite image. The 2×
			// scale and padding keep the arrows and any handwritten marks legible to
			// the interpreter.
			const { blob } = await editor.toImage([id, ...ids], {
				format: 'png',
				background: true,
				padding: 16,
				scale: 2,
			})
			const composite = await blobToDataUrl(blob)

			// The planner updates the text layers directly and hands back only the
			// edits that need the image model (background changes).
			const { textLayers, caption, backgroundInstructions } = await apiPlan({
				mode: 'revise',
				prompt: shape.props.prompt,
				brandText,
				outputType,
				image: composite,
				currentLayers: current.textLayers,
				annotations: lines,
			})

			// Apply any background edits one pass each; reuse the old background if
			// nothing about it changed.
			let assetId = current.assetId
			const steps = limitSteps(backgroundInstructions)
			if (steps.length) {
				const referenceImages = brandReferenceImages(brand)
				// The stored background is an R2 URL; the image model needs the bytes,
				// so read it back as a data URL before the first edit pass.
				let currentImage = await urlToDataUrl(cleanSrc)
				for (let i = 0; i < steps.length; i++) {
					setRenderProgress(id, i + 1, steps.length)
					const { imageUrl } = await apiGenerate({
						prompt: shape.props.prompt,
						brandText,
						outputType,
						referenceImages,
						currentImage,
						instruction: steps[i],
					})
					currentImage = imageUrl
				}
				assetId = await storeImageAsset(editor, currentImage, outputType)
			}

			pushVersion(editor, id, {
				assetId,
				textLayers,
				caption,
				instruction: steps.length ? steps.join('\n') : 'Text updated',
				createdAt: Date.now(),
			})

			// The annotations have been consumed — clear them, group shells and all.
			deleteAnnotations(editor, annotations)
		} catch (e) {
			markFailed(editor, id, e)
		} finally {
			stopHeartbeat()
			clearRenderProgress(id)
		}
	})()
}

/** Whether any annotations currently overlap the asset frame. */
export function hasAnnotations(editor: Editor, id: TLShapeId): boolean {
	return readAnnotations(editor, id).length > 0
}

/**
 * Reset assets whose generation was abandoned (e.g. the tab was closed mid-render).
 * In multiplayer another client may still be generating, so we only reset a shape
 * whose heartbeat has gone stale — an active render keeps refreshing it.
 */
export function resetInterruptedGenerations(editor: Editor): void {
	const now = Date.now()
	for (const shape of getAssetShapes(editor)) {
		recoverIfStale(editor, shape, now, STALE_GENERATION_MS)
	}
}

/**
 * Keep a generating shape's heartbeat fresh while async work runs, so peers don't
 * mistake a long render for an abandoned one. Returns a stop function.
 */
function startHeartbeat(editor: Editor, id: TLShapeId): () => void {
	const interval = setInterval(
		() => refreshHeartbeat(editor, id, Date.now()),
		GENERATION_HEARTBEAT_MS
	)
	return () => clearInterval(interval)
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Cap the instruction list, bundling any overflow into the final step. */
function limitSteps(instructions: string[]): string[] {
	const steps = instructions.map((s) => s.trim()).filter(Boolean)
	if (steps.length <= MAX_RENDER_STEPS) return steps
	return [...steps.slice(0, MAX_RENDER_STEPS - 1), steps.slice(MAX_RENDER_STEPS - 1).join(' ')]
}

async function storeImageAsset(
	editor: Editor,
	dataUrl: string,
	outputType: OutputType
): Promise<string> {
	// Upload the bytes to R2 and store only the URL on the asset record, so the
	// (large) image isn't synced inline through the room.
	const src = await uploadImageBytes(dataUrl, `${outputType.id}.png`)
	const assetId = AssetRecordType.createId()
	editor.createAssets([
		{
			id: assetId,
			typeName: 'asset',
			type: 'image',
			meta: {},
			props: {
				name: `${outputType.id}.png`,
				src,
				w: outputType.width,
				h: outputType.height,
				mimeType: 'image/png',
				isAnimated: false,
			},
		},
	])
	return assetId
}

/**
 * Phrase one read annotation as an instruction for the planner. This is the prose
 * the model reads; `readAnnotations` itself stays free of marketing voice.
 */
function formatAnnotation(annotation: ReadAnnotation): string {
	const where = `the ${regionOf(annotation.area)} of the asset`
	return annotation.text
		? `Change ${where}: ${annotation.text}.`
		: `Something at ${where} needs changing (an arrow points there, but no text was given).`
}

/** Describe where a normalized area sits within the asset, e.g. "top left", "centre". */
function regionOf(area: { x: number; y: number; w: number; h: number }): string {
	const cx = area.x + area.w / 2
	const cy = area.y + area.h / 2
	const col = cx < 0.34 ? 'left' : cx < 0.67 ? 'centre' : 'right'
	const row = cy < 0.34 ? 'top' : cy < 0.67 ? 'middle' : 'bottom'
	if (row === 'middle' && col === 'centre') return 'centre'
	if (row === 'middle') return `${col} side`
	if (col === 'centre') return `${row} centre`
	return `${row} ${col}`
}
