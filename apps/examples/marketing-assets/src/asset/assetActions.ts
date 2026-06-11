import {
	AssetRecordType,
	atom,
	Box,
	createShapeId,
	Editor,
	getArrowBindings,
	getArrowInfo,
	TLArrowShape,
	TLAssetId,
	TLShape,
	TLShapeId,
} from 'tldraw'
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
import { uploadImageBytes, urlToDataUrl } from '../multiplayerAssetStore'
import { AssetVerdict, AssetVersion, MARKETING_ASSET_TYPE, MarketingAssetShape } from './assetShape'

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

// Shape types that count as annotations when they overlap an asset frame.
const ANNOTATION_TYPES = new Set(['arrow', 'text', 'draw', 'geo', 'note', 'line', 'highlight'])

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

/** Set (or clear) the like/dislike verdict on an asset. */
export function setVerdict(editor: Editor, id: TLShapeId, verdict: AssetVerdict): void {
	const shape = editor.getShape<MarketingAssetShape>(id)
	if (!shape) return
	editor.updateShape<MarketingAssetShape>({ id, type: MARKETING_ASSET_TYPE, props: { verdict } })
}

/** Every marketing-asset shape on the current page. */
export function getAssetShapes(editor: Editor): MarketingAssetShape[] {
	return editor
		.getCurrentPageShapes()
		.filter((s): s is MarketingAssetShape => s.type === MARKETING_ASSET_TYPE)
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
		setError(editor, id, e)
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

	const { ids, lines } = collectAnnotations(editor, id)
	if (ids.length === 0) return

	setGenerating(editor, id)

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

			// The annotations have been consumed — clear them.
			editor.deleteShapes(ids)
		} catch (e) {
			setError(editor, id, e)
		} finally {
			stopHeartbeat()
			clearRenderProgress(id)
		}
	})()
}

/** Point the asset at an earlier version, non-destructively. */
export function revertTo(editor: Editor, id: TLShapeId, index: number): void {
	const shape = editor.getShape<MarketingAssetShape>(id)
	if (!shape || index < 0 || index >= shape.props.versions.length) return
	editor.updateShape<MarketingAssetShape>({
		id,
		type: MARKETING_ASSET_TYPE,
		props: { currentVersion: index },
	})
}

/** Whether any annotations currently overlap the asset frame. */
export function hasAnnotations(editor: Editor, id: TLShapeId): boolean {
	return collectAnnotations(editor, id).ids.length > 0
}

/** The data URL of a version's stored image, if available. */
export function getAssetSrc(editor: Editor, version: AssetVersion): string | undefined {
	const asset = editor.getAsset(version.assetId as TLAssetId)
	const src = (asset?.props as { src?: string | null } | undefined)?.src
	return typeof src === 'string' ? src : undefined
}

/**
 * Reset assets whose generation was abandoned (e.g. the tab was closed mid-render).
 * In multiplayer another client may still be generating, so we only reset a shape
 * whose heartbeat has gone stale — an active render keeps refreshing it.
 */
export function resetInterruptedGenerations(editor: Editor): void {
	const now = Date.now()
	for (const shape of editor.getCurrentPageShapes()) {
		if (shape.type !== MARKETING_ASSET_TYPE) continue
		const s = shape as MarketingAssetShape
		if (s.props.status !== 'generating') continue
		if (now - s.props.generatingStartedAt < STALE_GENERATION_MS) continue
		editor.updateShape<MarketingAssetShape>({
			id: s.id,
			type: MARKETING_ASSET_TYPE,
			props: s.props.versions.length
				? { status: 'idle', error: '', generatingStartedAt: 0 }
				: { status: 'error', error: 'Generation was interrupted', generatingStartedAt: 0 },
		})
	}
}

/**
 * Keep a generating shape's heartbeat fresh while async work runs, so peers don't
 * mistake a long render for an abandoned one. Returns a stop function.
 */
function startHeartbeat(editor: Editor, id: TLShapeId): () => void {
	const beat = () => {
		const shape = editor.getShape<MarketingAssetShape>(id)
		if (!shape || shape.props.status !== 'generating') return
		editor.updateShape<MarketingAssetShape>({
			id,
			type: MARKETING_ASSET_TYPE,
			props: { generatingStartedAt: Date.now() },
		})
	}
	const interval = setInterval(beat, GENERATION_HEARTBEAT_MS)
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

function pushVersion(editor: Editor, id: TLShapeId, version: AssetVersion): void {
	const shape = editor.getShape<MarketingAssetShape>(id)
	if (!shape) return
	const versions = [...shape.props.versions, version]
	editor.updateShape<MarketingAssetShape>({
		id,
		type: MARKETING_ASSET_TYPE,
		props: {
			versions,
			currentVersion: versions.length - 1,
			status: 'idle',
			error: '',
			generatingStartedAt: 0,
		},
	})
}

function setGenerating(editor: Editor, id: TLShapeId): void {
	editor.updateShape<MarketingAssetShape>({
		id,
		type: MARKETING_ASSET_TYPE,
		props: { status: 'generating', error: '', generatingStartedAt: Date.now() },
	})
}

function setError(editor: Editor, id: TLShapeId, e: unknown): void {
	editor.updateShape<MarketingAssetShape>({
		id,
		type: MARKETING_ASSET_TYPE,
		props: {
			status: 'error',
			error: e instanceof Error ? e.message : 'Something went wrong',
			generatingStartedAt: 0,
		},
	})
}

/**
 * Gather the annotations for an asset and describe them as located, paired
 * instructions. Captures arrows that point at the asset and the text notes tied
 * to them — including notes drawn in the margin with an arrow into the image, so
 * a note's text is never dropped just because it sits outside the frame.
 */
function collectAnnotations(editor: Editor, id: TLShapeId): { ids: TLShapeId[]; lines: string[] } {
	const assetBounds = editor.getShapePageBounds(id)
	if (!assetBounds) return { ids: [], lines: [] }

	const candidates = editor
		.getCurrentPageShapes()
		.filter((s) => s.id !== id && ANNOTATION_TYPES.has(s.type))

	const bounds = new Map<TLShapeId, Box>()
	for (const s of candidates) {
		const b = editor.getShapePageBounds(s.id)
		if (b) bounds.set(s.id, b)
	}

	// What each arrow is bound to (start = where it's drawn from, end = where it
	// points). The annotation tool binds an arrow from its note to its rectangle; a
	// hand-drawn arrow may be bound to nothing.
	const ends = new Map<TLShapeId, { start?: TLShapeId; end?: TLShapeId }>()
	for (const s of candidates) {
		if (s.type !== 'arrow') continue
		const b = getArrowBindings(editor, s as TLArrowShape)
		ends.set(s.id, { start: b.start?.toId, end: b.end?.toId })
	}

	// Arrows that point at the asset — either their own box overlaps it, or
	// they're bound to a shape that does (e.g. a rectangle drawn on the asset).
	const onAsset = (shapeId?: TLShapeId) =>
		!!shapeId && bounds.has(shapeId) && overlaps(assetBounds, bounds.get(shapeId)!)
	const arrows = candidates.filter((s) => {
		if (s.type !== 'arrow' || !bounds.has(s.id)) return false
		if (overlaps(assetBounds, bounds.get(s.id)!)) return true
		const e = ends.get(s.id)!
		return onAsset(e.start) || onAsset(e.end)
	})
	const arrowBounds = arrows.map((s) => bounds.get(s.id)!)

	// Shapes bound to a detected arrow — these are part of an annotation even when
	// they sit off the asset and the arrow leaves a small gap to them.
	const boundToArrow = new Set<TLShapeId>()
	for (const a of arrows) {
		const e = ends.get(a.id)!
		if (e.start) boundToArrow.add(e.start)
		if (e.end) boundToArrow.add(e.end)
	}

	// Notes/text/shapes that sit on the asset, are bound to one of those arrows,
	// or overlap one (a note in the margin with an arrow drawn from it to the
	// image).
	const notes = candidates.filter((s) => {
		if (s.type === 'arrow' || !bounds.has(s.id)) return false
		const b = bounds.get(s.id)!
		return (
			overlaps(assetBounds, b) ||
			boundToArrow.has(s.id) ||
			arrowBounds.some((ab) => overlaps(ab, b))
		)
	})

	const ids: TLShapeId[] = [...arrows, ...notes].map((s) => s.id)
	const lines: string[] = []
	const usedNotes = new Set<TLShapeId>()

	for (const arrow of arrows) {
		const e = ends.get(arrow.id)!
		const ab = bounds.get(arrow.id)!
		// Candidate sources: shapes the arrow is bound to, plus shapes whose box
		// overlaps it. Prefer one that actually carries text — the annotation
		// tool's rectangle is a text-less geo, so without this it could be paired as
		// the arrow's source and swallow the real note.
		const linked = notes.filter(
			(n) =>
				!usedNotes.has(n.id) &&
				(n.id === e.start || n.id === e.end || overlaps(ab, bounds.get(n.id)!))
		)
		const source = linked.find((n) => getText(editor, n)) ?? linked[0]
		if (source) usedNotes.add(source.id)

		const message = [getText(editor, arrow), source ? getText(editor, source) : '']
			.filter(Boolean)
			.join(' — ')
		// Describe where the change is wanted. Prefer the shape the arrow points
		// at (e.g. the rectangle ringing the area), else the resolved arrow head.
		const endBounds = e.end ? bounds.get(e.end) : undefined
		const target = endBounds ? endBounds.center : arrowTarget(editor, arrow)
		const where = target ? regionOf(target, assetBounds) : 'the asset'

		lines.push(
			message
				? `Change the ${where} of the asset: ${message}.`
				: `Something at the ${where} of the asset needs changing (an arrow points there, but no text was given).`
		)
	}

	// Free-standing notes not attached to any arrow.
	for (const n of notes) {
		if (usedNotes.has(n.id)) continue
		const text = getText(editor, n)
		if (text)
			lines.push(`Note near the ${regionOf(bounds.get(n.id)!.center, assetBounds)}: ${text}.`)
	}

	return { ids, lines }
}

function getText(editor: Editor, shape: TLShape): string {
	const util = editor.getShapeUtil(shape) as { getText?(s: TLShape): string | undefined }
	const text = util.getText?.(shape)
	return typeof text === 'string' ? text.trim() : ''
}

/** The page-space point an arrow's head lands on. */
function arrowTarget(editor: Editor, arrow: TLShape): { x: number; y: number } | null {
	if (arrow.type !== 'arrow') return null
	const transform = editor.getShapePageTransform(arrow)
	if (!transform) return null
	// Resolve the real head position. For a bound arrow (like an annotation's
	// arrow) the live endpoint comes from the binding; props.end is only a stale
	// fallback, so prefer the computed arrow info.
	const info = getArrowInfo(editor, arrow as TLArrowShape)
	const end = info ? info.end.point : (arrow as TLArrowShape).props.end
	return transform.applyToPoint(end)
}

/** Describe where a point sits within the asset, e.g. "top left", "centre". */
function regionOf(point: { x: number; y: number }, b: Box): string {
	const nx = (point.x - b.minX) / b.width
	const ny = (point.y - b.minY) / b.height
	const col = nx < 0.34 ? 'left' : nx < 0.67 ? 'centre' : 'right'
	const row = ny < 0.34 ? 'top' : ny < 0.67 ? 'middle' : 'bottom'
	if (row === 'middle' && col === 'centre') return 'centre'
	if (row === 'middle') return `${col} side`
	if (col === 'centre') return `${row} centre`
	return `${row} ${col}`
}

function overlaps(a: Box, b: Box): boolean {
	return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY
}

async function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = () => reject(reader.error)
		reader.readAsDataURL(blob)
	})
}
