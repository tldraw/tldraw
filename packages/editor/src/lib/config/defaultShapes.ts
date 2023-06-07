import { TLImageShape, TLVideoShape } from '@tldraw/tlschema'
import { arrowShape } from '../editor/shapes/ArrowShape/arrowShape'
import { bookmarkShape } from '../editor/shapes/BookmarkShape/bookmarkShape'
import { drawShape } from '../editor/shapes/DrawShape/drawShape'
import { embedShape } from '../editor/shapes/EmbedShape/embedShape'
import { frameShape } from '../editor/shapes/FrameShape/frameShape'
import { geoShape } from '../editor/shapes/GeoShape/geoShape'
import { groupShape } from '../editor/shapes/GroupShape/groupShape'
import { highlightShape } from '../editor/shapes/HighlightShape/highlightShape'
import { lineShape } from '../editor/shapes/LineShape/lineShape'
import { noteShape } from '../editor/shapes/NoteShape/noteShape'
import { textShape } from '../editor/shapes/TextShape/textShape'
import { ImageShapeUtil } from '../editor/shapeutils/ImageShapeUtil/ImageShapeUtil'
import { VideoShapeUtil } from '../editor/shapeutils/VideoShapeUtil/VideoShapeUtil'
import { TLShapeInfo, createShape } from './createShape'

/** @public */
export const coreShapes: TLShapeInfo<any>[] = [
	createShape<TLImageShape>('image', {
		util: ImageShapeUtil,
	}),
	// created by copy and paste / file drop
	createShape<TLVideoShape>('video', {
		util: VideoShapeUtil,
	}),
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
	textShape,
	bookmarkShape,
	embedShape,
	groupShape,
]
