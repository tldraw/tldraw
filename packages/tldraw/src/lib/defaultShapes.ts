import {
	ArrowShape,
	BookmarkShape,
	DrawShape,
	EmbedShape,
	FrameShape,
	GroupShape,
	HighlightShape,
	ImageShape,
	NoteShape,
	TLBaseShape,
	TLShapeInfo,
	TextShape,
	VideoShape,
} from '@tldraw/editor'
import { GeoShape } from './shapes/geo/GeoShape'
import { LineShape } from './shapes/line/LineShape'

/** @public */
export const coreShapes = [
	// created by grouping interactions, probably the corest core shape that we have
	GroupShape,
	// created by embed menu / url drop
	EmbedShape,
	// created by copy and paste / url drop
	BookmarkShape,
	// created by copy and paste / file drop
	ImageShape,
	// created by copy and paste
	TextShape,
] as const

/** @public */
export const defaultShapes = [
	DrawShape,
	GeoShape,
	NoteShape,
	LineShape,
	GeoShape,
	FrameShape,
	ArrowShape,
	HighlightShape,
	VideoShape,
] as const

const coreShapeTypes = new Set<string>(coreShapes.map((s) => s.type))
export function checkShapesAndAddCore(customShapes: readonly TLShapeInfo[]) {
	const shapes: TLShapeInfo<TLBaseShape<any, any>>[] = [...coreShapes]

	const addedCustomShapeTypes = new Set<string>()
	for (const customShape of customShapes) {
		if (coreShapeTypes.has(customShape.type)) {
			throw new Error(
				`Shape type "${customShape.type}" is a core shapes type and cannot be overridden`
			)
		}
		if (addedCustomShapeTypes.has(customShape.type)) {
			throw new Error(`Shape type "${customShape.type}" is defined more than once`)
		}
		shapes.push(customShape)
		addedCustomShapeTypes.add(customShape.type)
	}

	return shapes
}
