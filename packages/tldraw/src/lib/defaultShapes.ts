import { TLBaseShape, TLShapeInfo, coreShapes } from '@tldraw/editor'
import { ArrowShape } from './shapes/arrow/ArrowShape'
import { BookmarkShape } from './shapes/bookmark/BookmarkShape'
import { DrawShape } from './shapes/draw/DrawShape'
import { FrameShape } from './shapes/frame/FrameShape'
import { GeoShape } from './shapes/geo/GeoShape'
import { HighlightShape } from './shapes/highlight/HighlightShape'
import { LineShape } from './shapes/line/LineShape'
import { NoteShape } from './shapes/note/NoteShape'
import { TextShape } from './shapes/text/TextShape'

/** @public */
export const defaultShapes = [
	TextShape,
	BookmarkShape,
	DrawShape,
	GeoShape,
	NoteShape,
	LineShape,
	GeoShape,
	FrameShape,
	ArrowShape,
	HighlightShape,
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
