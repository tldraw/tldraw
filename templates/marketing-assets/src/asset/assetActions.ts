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
import { FOOTER_HEIGHT, getDisplaySize, getOutputType } from '../constants'
import { AssetVersion, MARKETING_ASSET_TYPE, MarketingAssetShape } from './assetShape'

// Shape types that count as annotations when they overlap an asset frame.
const ANNOTATION_TYPES = new Set(['arrow', 'text', 'draw', 'geo', 'note', 'line', 'highlight'])

// Cap on how many sequential render passes one re-render makes.
const MAX_RENDER_STEPS = 8

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

/** Create a new asset frame and kick off its first generation. */
export function createAndGenerate(
	editor: Editor,
	opts: { prompt: string; outputTypeId: string; shot: string | null }
): TLShapeId {
	const outputType = getOutputType(opts.outputTypeId)
	const { w, h } = getDisplaySize(outputType)
	const id = createShapeId()
	const center = editor.getViewportPageBounds().center

	editor.createShape<MarketingAssetShape>({
		id,
		type: MARKETING_ASSET_TYPE,
		x: center.x - w / 2,
		y: center.y - (h + FOOTER_HEIGHT) / 2,
		props: {
			w,
			h,
			outputTypeId: opts.outputTypeId,
			prompt: opts.prompt,
			versions: [],
			currentVersion: 0,
			status: 'generating',
			error: '',
		},
	})
	editor.select(id)

	void runFirstGeneration(editor, id, outputType, opts.prompt, opts.shot)
	return id
}

async function runFirstGeneration(
	editor: Editor,
	id: TLShapeId,
	outputType: OutputType,
	prompt: string,
	shot: string | null
) {
	try {
		const brand = getBrand(editor)
		const brandText = serializeBrand(brand)
		const referenceImages = brandReferenceImages(brand)
		if (shot) referenceImages.push(shot)

		// 1. A text-free background from the image model.
		const { imageUrl } = await apiGenerate({ prompt, brandText, outputType, referenceImages })
		const assetId = storeImageAsset(editor, imageUrl, outputType)

		// 2. The text layout from the planner, placed over that background.
		const { textLayers } = await apiPlan({ mode: 'create', prompt, brandText, outputType, image: imageUrl })

		pushVersion(editor, id, { assetId, textLayers, instruction: '', createdAt: Date.now() })
	} catch (e) {
		setError(editor, id, e)
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
			const { textLayers, backgroundInstructions } = await apiPlan({
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
				let currentImage = cleanSrc
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
				assetId = storeImageAsset(editor, currentImage, outputType)
			}

			pushVersion(editor, id, {
				assetId,
				textLayers,
				instruction: steps.length ? steps.join('\n') : 'Text updated',
				createdAt: Date.now(),
			})

			// The annotations have been consumed — clear them.
			editor.deleteShapes(ids)
		} catch (e) {
			setError(editor, id, e)
		} finally {
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

/** Reset any assets left mid-generation by a reload. */
export function resetInterruptedGenerations(editor: Editor): void {
	for (const shape of editor.getCurrentPageShapes()) {
		if (shape.type !== MARKETING_ASSET_TYPE) continue
		const s = shape as MarketingAssetShape
		if (s.props.status !== 'generating') continue
		editor.updateShape<MarketingAssetShape>({
			id: s.id,
			type: MARKETING_ASSET_TYPE,
			props: s.props.versions.length
				? { status: 'idle', error: '' }
				: { status: 'error', error: 'Generation was interrupted' },
		})
	}
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

function storeImageAsset(editor: Editor, dataUrl: string, outputType: OutputType): string {
	const assetId = AssetRecordType.createId()
	editor.createAssets([
		{
			id: assetId,
			typeName: 'asset',
			type: 'image',
			meta: {},
			props: {
				name: `${outputType.id}.png`,
				src: dataUrl,
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
		props: { versions, currentVersion: versions.length - 1, status: 'idle', error: '' },
	})
}

function setGenerating(editor: Editor, id: TLShapeId): void {
	editor.updateShape<MarketingAssetShape>({
		id,
		type: MARKETING_ASSET_TYPE,
		props: { status: 'generating', error: '' },
	})
}

function setError(editor: Editor, id: TLShapeId, e: unknown): void {
	editor.updateShape<MarketingAssetShape>({
		id,
		type: MARKETING_ASSET_TYPE,
		props: { status: 'error', error: e instanceof Error ? e.message : 'Something went wrong' },
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
	// points). The annotation tool binds an arrow from its note to its oval; a
	// hand-drawn arrow may be bound to nothing.
	const ends = new Map<TLShapeId, { start?: TLShapeId; end?: TLShapeId }>()
	for (const s of candidates) {
		if (s.type !== 'arrow') continue
		const b = getArrowBindings(editor, s as TLArrowShape)
		ends.set(s.id, { start: b.start?.toId, end: b.end?.toId })
	}

	// Arrows that point at the asset — either their own box overlaps it, or
	// they're bound to a shape that does (e.g. an oval drawn on the asset).
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
		return overlaps(assetBounds, b) || boundToArrow.has(s.id) || arrowBounds.some((ab) => overlaps(ab, b))
	})

	const ids: TLShapeId[] = [...arrows, ...notes].map((s) => s.id)
	const lines: string[] = []
	const usedNotes = new Set<TLShapeId>()

	for (const arrow of arrows) {
		const e = ends.get(arrow.id)!
		const ab = bounds.get(arrow.id)!
		// Candidate sources: shapes the arrow is bound to, plus shapes whose box
		// overlaps it. Prefer one that actually carries text — the annotation
		// tool's oval is a text-less geo, so without this it could be paired as
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
		// at (e.g. the oval ringing the area), else the resolved arrow head.
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
		if (text) lines.push(`Note near the ${regionOf(bounds.get(n.id)!.center, assetBounds)}: ${text}.`)
	}

	return { ids, lines }
}

function getText(editor: Editor, shape: TLShape): string {
	const util = editor.getShapeUtil(shape) as { getText?: (s: TLShape) => string | undefined }
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
