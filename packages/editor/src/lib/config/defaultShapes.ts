import { arrowShape } from '../editor/shapes/ArrowShape/arrowShape'
import { drawShape } from '../editor/shapes/DrawShape/drawShape'
import { geoShape } from '../editor/shapes/GeoShape/geoShape'
import { highlightShape } from '../editor/shapes/HighlightShape/highlightShape'
import { BookmarkShapeUtil } from '../editor/shapeutils/BookmarkShapeUtil/BookmarkShapeUtil'
import { EmbedShapeUtil } from '../editor/shapeutils/EmbedShapeUtil/EmbedShapeUtil'
import { FrameShapeUtil } from '../editor/shapeutils/FrameShapeUtil/FrameShapeUtil'
import { GroupShapeUtil } from '../editor/shapeutils/GroupShapeUtil/GroupShapeUtil'
import { ImageShapeUtil } from '../editor/shapeutils/ImageShapeUtil/ImageShapeUtil'
import { LineShapeUtil } from '../editor/shapeutils/LineShapeUtil/LineShapeUtil'
import { NoteShapeUtil } from '../editor/shapeutils/NoteShapeUtil/NoteShapeUtil'
import { TextShapeUtil } from '../editor/shapeutils/TextShapeUtil/TextShapeUtil'
import { VideoShapeUtil } from '../editor/shapeutils/VideoShapeUtil/VideoShapeUtil'
import { TLShapeInfo } from './createTLStore'

/** @public */
export const coreShapes: Record<string, TLShapeInfo> = {
	// created by grouping interactions, probably the corest core shape that we have
	group: {
		util: GroupShapeUtil,
	},
	// created by embed menu / url drop
	embed: {
		util: EmbedShapeUtil,
	},
	// created by copy and paste / url drop
	bookmark: {
		util: BookmarkShapeUtil,
	},
	// created by copy and paste / file drop
	image: {
		util: ImageShapeUtil,
	},
	// created by copy and paste / file drop
	video: {
		util: VideoShapeUtil,
	},
	// created by copy and paste
	text: {
		util: TextShapeUtil,
	},
}

/** @public */
export const defaultShapes: Record<string, TLShapeInfo> = {
	draw: drawShape,
	arrow: arrowShape,
	highlight: highlightShape,
	geo: geoShape,
	line: {
		util: LineShapeUtil,
	},
	note: {
		util: NoteShapeUtil,
	},
	frame: {
		util: FrameShapeUtil,
	},
}
