import { AssetRecordType, atom, Editor, TLShapeId } from 'tldraw'
import { apiGenerate, apiPlan, OutputType } from '../api/marketingApi'
import { brandReferenceImages, getBrand, serializeBrand } from '../brand/brandState'
import { blobToDataUrl, uploadImageBytes, urlToDataUrl } from './assetBytes'
import { markFailed, markGenerating, pushVersion, refreshHeartbeat } from './assetRecord'
import { AssetVersion } from './assetShape'

/**
 * The render seam: producing a new Version of an asset. Both entry points —
 * `renderFromBrief` (a fresh idea) and `renderFromAnnotations` (a re-render driven by
 * the reviewer's marks) — run the same two-stage interpret→render dance (ADR-0002) and
 * share one lifecycle, owned entirely here: mark the shape generating, keep its
 * heartbeat fresh while the async work runs (ADR-0006), append the produced Version on
 * success, and record the error on the shape on failure. The two callers differ only in
 * how they reach a Version, so that is all they supply.
 */

// How often a running generation refreshes its heartbeat on the shape. Paired with the
// stale threshold owned by the caller's recovery sweep (see ADR-0006).
const GENERATION_HEARTBEAT_MS = 15_000

// Cap on how many sequential background-edit passes one re-render makes (ADR-0003).
const MAX_RENDER_STEPS = 8

/** A Version before it's stamped with a timestamp and committed to the timeline. */
type DraftVersion = Omit<AssetVersion, 'createdAt'>

// --- live progress (transient, off the shape so it isn't synced) ---

interface RenderProgress {
	step: number
	total: number
}
// Keyed by shape id. Transient UI state for the current render, not persisted.
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

// --- entry points ---

/**
 * Render a Version from a brief: a text-free background from the image model, then a
 * single headline laid over it by the planner. Used for first generations and every
 * batch tile. `references` are extra reference images to fold in beside the brand's.
 */
export function renderFromBrief(
	editor: Editor,
	id: TLShapeId,
	input: { outputType: OutputType; prompt: string; references: string[]; captionAngle?: string }
): Promise<boolean> {
	return commitVersion(editor, id, async () => {
		const brand = getBrand(editor)
		const brandText = serializeBrand(brand)
		const referenceImages = [...brandReferenceImages(brand), ...input.references]

		// 1. A text-free background from the image model.
		const { imageUrl } = await apiGenerate({
			prompt: input.prompt,
			brandText,
			outputType: input.outputType,
			referenceImages,
		})
		const assetId = await storeImageAsset(editor, imageUrl, input.outputType)

		// 2. The text layout from the planner: one headline over the background plus the
		// accompanying caption shown beside the asset.
		const { textLayers, caption } = await apiPlan({
			mode: 'create',
			prompt: input.prompt,
			brandText,
			outputType: input.outputType,
			image: imageUrl,
			captionAngle: input.captionAngle,
		})

		return { assetId, textLayers, caption, instruction: '' }
	})
}

/**
 * Render a Version from annotations: the asset and its marks are exported as one
 * composite for the interpreter, which rewrites the text layers directly and returns
 * only the background edits that still need the image model. Those edits are applied one
 * pass each; the background is reused untouched when none are returned.
 */
export function renderFromAnnotations(
	editor: Editor,
	id: TLShapeId,
	input: {
		outputType: OutputType
		prompt: string
		/** The version being revised — its layers seed the plan, its background is reused. */
		currentVersion: AssetVersion
		/** The current background as a resolvable URL, read back before the first edit. */
		currentSrc: string
		/** Shapes to export alongside the asset as the annotated composite. */
		compositeShapeIds: TLShapeId[]
		/** The annotations phrased as instructions for the interpreter. */
		instructions: string[]
	}
): Promise<boolean> {
	return commitVersion(editor, id, async () => {
		const brand = getBrand(editor)
		const brandText = serializeBrand(brand)

		// Export the asset plus its annotations as one composite image. The 2× scale and
		// padding keep the arrows and any handwritten marks legible to the interpreter.
		const { blob } = await editor.toImage([id, ...input.compositeShapeIds], {
			format: 'png',
			background: true,
			padding: 16,
			scale: 2,
		})
		const composite = await blobToDataUrl(blob)

		// The planner updates the text layers directly and hands back only the edits that
		// need the image model (background changes).
		const { textLayers, caption, backgroundInstructions } = await apiPlan({
			mode: 'revise',
			prompt: input.prompt,
			brandText,
			outputType: input.outputType,
			image: composite,
			currentLayers: input.currentVersion.textLayers,
			annotations: input.instructions,
		})

		// Apply any background edits one pass each; reuse the old background if nothing
		// about it changed.
		let assetId = input.currentVersion.assetId
		const steps = limitSteps(backgroundInstructions)
		if (steps.length) {
			const referenceImages = brandReferenceImages(brand)
			// The stored background is an R2 URL; the image model needs the bytes, so read
			// it back as a data URL before the first edit pass.
			let currentImage = await urlToDataUrl(input.currentSrc)
			for (let i = 0; i < steps.length; i++) {
				setRenderProgress(id, i + 1, steps.length)
				const { imageUrl } = await apiGenerate({
					prompt: input.prompt,
					brandText,
					outputType: input.outputType,
					referenceImages,
					currentImage,
					instruction: steps[i],
				})
				currentImage = imageUrl
			}
			assetId = await storeImageAsset(editor, currentImage, input.outputType)
		}

		return {
			assetId,
			textLayers,
			caption,
			instruction: steps.length ? steps.join('\n') : 'Text updated',
		}
	})
}

// ---------------------------------------------------------------------------
// Lifecycle + internals
// ---------------------------------------------------------------------------

/**
 * Run a producer under the generation lifecycle: mark the shape generating (before the
 * first await, so callers never see an idle gap), keep the heartbeat fresh, commit the
 * produced Version on success, record the error on the shape on failure. Returns whether
 * a Version was committed, so the caller can run its own post-render cleanup.
 */
async function commitVersion(
	editor: Editor,
	id: TLShapeId,
	produce: () => Promise<DraftVersion>
): Promise<boolean> {
	markGenerating(editor, id, Date.now())
	const stopHeartbeat = startHeartbeat(editor, id)
	try {
		const draft = await produce()
		pushVersion(editor, id, { ...draft, createdAt: Date.now() })
		return true
	} catch (e) {
		markFailed(editor, id, e)
		return false
	} finally {
		stopHeartbeat()
		clearRenderProgress(id)
	}
}

/**
 * Keep a generating shape's heartbeat fresh while async work runs, so peers don't
 * mistake a long render for an abandoned one (ADR-0006). Returns a stop function.
 */
function startHeartbeat(editor: Editor, id: TLShapeId): () => void {
	const interval = setInterval(
		() => refreshHeartbeat(editor, id, Date.now()),
		GENERATION_HEARTBEAT_MS
	)
	return () => clearInterval(interval)
}

/** Cap the instruction list, bundling any overflow into the final step. */
function limitSteps(instructions: string[]): string[] {
	const steps = instructions.map((s) => s.trim()).filter(Boolean)
	if (steps.length <= MAX_RENDER_STEPS) return steps
	return [...steps.slice(0, MAX_RENDER_STEPS - 1), steps.slice(MAX_RENDER_STEPS - 1).join(' ')]
}

/** Upload a generated background to R2 and create the image asset record for it. */
async function storeImageAsset(
	editor: Editor,
	dataUrl: string,
	outputType: OutputType
): Promise<string> {
	// Upload the bytes to R2 and store only the URL on the asset record, so the (large)
	// image isn't synced inline through the room.
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
