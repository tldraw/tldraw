import { ArrowShape } from '../editor/shapes/arrow/ArrowShape'
import { BookmarkShape } from '../editor/shapes/bookmark/BookmarkShape'
import { DrawShape } from '../editor/shapes/draw/DrawShape'
import { EmbedShape } from '../editor/shapes/embed/EmbedShape'
import { FrameShape } from '../editor/shapes/frame/FrameShape'
import { GeoShape } from '../editor/shapes/geo/GeoShape'
import { GroupShape } from '../editor/shapes/group/GroupShape'
import { HighlightShape } from '../editor/shapes/highlight/HighlightShape'
import { ImageShape } from '../editor/shapes/image/ImageShape'
import { LineShape } from '../editor/shapes/line/LineShape'
import { NoteShape } from '../editor/shapes/note/NoteShape'
import { TextShape } from '../editor/shapes/text/TextShape'
import { VideoShape } from '../editor/shapes/video/VideoShape'
import { AnyTLShapeInfo, TLShapeInfo } from './defineShape'

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
	LineShape,
	NoteShape,
	FrameShape,
	ArrowShape,
	HighlightShape,
	VideoShape,
] as const

const coreShapeTypes = new Set<string>(coreShapes.map((s) => s.type))
export function checkShapesAndAddCore(customShapes: readonly TLShapeInfo[]) {
	const shapes: AnyTLShapeInfo[] = [...coreShapes]

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
