import { Editor, TLShapeId } from 'tldraw'
import { ReadAnnotation, deleteAnnotations, readAnnotations } from '../annotate/readAnnotations'
import { getOutputType } from '../constants'
import { getAssetShapes, getAssetSrc, recoverIfStale, revertTo, setVerdict } from './assetRecord'
import { MarketingAssetShape } from './assetShape'
import { getRenderProgress, renderFromAnnotations } from './renderVersion'

// Reads and writes of the asset record live in ./assetRecord, and producing a Version
// lives in ./renderVersion; both are re-exported here so callers keep reaching asset
// operations through one module. Batch generation lives in ./batch.
export { getAssetShapes, getAssetSrc, getRenderProgress, revertTo, setVerdict }

// How long a 'generating' shape can go without a heartbeat before a peer treats it as
// abandoned. In multiplayer this distinguishes an active render from one whose client
// navigated away mid-generation. The render itself refreshes the heartbeat (see
// ./renderVersion); this is the threshold the recovery sweep below reads.
const STALE_GENERATION_MS = 45_000

/** Re-render an asset from its annotations: interpret → render → new version. */
export function reRender(editor: Editor, id: TLShapeId): void {
	const shape = editor.getShape<MarketingAssetShape>(id)
	if (!shape || shape.props.status === 'generating') return

	const current = shape.props.versions[shape.props.currentVersion]
	if (!current) return
	const currentSrc = getAssetSrc(editor, current)
	if (!currentSrc) return

	const annotations = readAnnotations(editor, id)
	if (annotations.length === 0) return

	void (async () => {
		const committed = await renderFromAnnotations(editor, id, {
			outputType: getOutputType(shape.props.outputTypeId),
			prompt: shape.props.prompt,
			currentVersion: current,
			currentSrc,
			compositeShapeIds: annotations.flatMap((a) => a.shapeIds),
			// The prose the model reads; readAnnotations itself stays free of marketing voice.
			instructions: annotations.map(formatAnnotation),
		})
		// The annotations have been consumed — clear them, group shells and all. Only
		// once a new Version actually landed, so a failed render leaves the marks to retry.
		if (committed) deleteAnnotations(editor, annotations)
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

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

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
