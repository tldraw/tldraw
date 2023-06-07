import { groupShape } from '../editor/shapes/GroupShape/groupShape'
import { ArrowShapeUtil } from '../editor/shapeutils/ArrowShapeUtil/ArrowShapeUtil'
import { BookmarkShapeUtil } from '../editor/shapeutils/BookmarkShapeUtil/BookmarkShapeUtil'
import { DrawShapeUtil } from '../editor/shapeutils/DrawShapeUtil/DrawShapeUtil'
import { EmbedShapeUtil } from '../editor/shapeutils/EmbedShapeUtil/EmbedShapeUtil'
import { FrameShapeUtil } from '../editor/shapeutils/FrameShapeUtil/FrameShapeUtil'
import { GeoShapeUtil } from '../editor/shapeutils/GeoShapeUtil/GeoShapeUtil'
import { HighlightShapeUtil } from '../editor/shapeutils/HighlightShapeUtil/HighlightShapeUtil'
import { ImageShapeUtil } from '../editor/shapeutils/ImageShapeUtil/ImageShapeUtil'
import { LineShapeUtil } from '../editor/shapeutils/LineShapeUtil/LineShapeUtil'
import { NoteShapeUtil } from '../editor/shapeutils/NoteShapeUtil/NoteShapeUtil'
import { TextShapeUtil } from '../editor/shapeutils/TextShapeUtil/TextShapeUtil'
import { VideoShapeUtil } from '../editor/shapeutils/VideoShapeUtil/VideoShapeUtil'
import { TLShapeInfo } from './createTLStore'

/** @public */
export const coreShapes: Record<string, TLShapeInfo> = {
	// created by grouping interactions, probably the corest core shape that we have
	group: groupShape,
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
	draw: {
		util: DrawShapeUtil,
	},
	geo: {
		util: GeoShapeUtil,
	},
	line: {
		util: LineShapeUtil,
	},
	note: {
		util: NoteShapeUtil,
	},
	frame: {
		util: FrameShapeUtil,
	},
	arrow: {
		util: ArrowShapeUtil,
	},
	highlight: {
		util: HighlightShapeUtil,
	},
}
