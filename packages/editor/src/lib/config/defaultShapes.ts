import { arrowShape } from '../editor/shapes/ArrowShape/arrowShape'
import { bookmarkShape } from '../editor/shapes/BookmarkShape/bookmarkShape'
import { drawShape } from '../editor/shapes/DrawShape/drawShape'
import { embedShape } from '../editor/shapes/EmbedShape/embedShape'
import { frameShape } from '../editor/shapes/FrameShape/frameShape'
import { geoShape } from '../editor/shapes/GeoShape/geoShape'
import { groupShape } from '../editor/shapes/GroupShape/groupShape'
import { highlightShape } from '../editor/shapes/HighlightShape/highlightShape'
import { imageShape } from '../editor/shapes/ImageShape/imageShape'
import { lineShape } from '../editor/shapes/LineShape/lineShape'
import { noteShape } from '../editor/shapes/NoteShape/noteShape'
import { textShape } from '../editor/shapes/TextShape/textShape'
import { videoShape } from '../editor/shapes/VideoShape/videoShape'
import { TLShapeInfo } from './createShape'

/** @public */
export const coreShapes: TLShapeInfo<any>[] = [
	imageShape,
	videoShape,
	groupShape,
	textShape,
	bookmarkShape,
	embedShape,
]

/** @public */
export const defaultShapes: TLShapeInfo<any>[] = [
	drawShape,
	arrowShape,
	highlightShape,
	geoShape,
	lineShape,
	noteShape,
	frameShape,
]
