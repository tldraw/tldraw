import { ReadAnnotation } from './readAnnotations'

/**
 * Phrasing read annotations as instructions for the planner. This is the prose the
 * model reads — `readAnnotations` deliberately returns structured intent and stays free
 * of marketing voice (ADR-0005), so the wording lives here, beside the reader rather
 * than inside it.
 */

/** Phrase one read annotation as an instruction for the planner. */
export function formatAnnotation(annotation: ReadAnnotation): string {
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
