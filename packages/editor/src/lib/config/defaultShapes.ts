import { ArrowShapeUtil } from '../app/shapeutils/ArrowShapeUtil/ArrowShapeUtil'
import { BookmarkShapeUtil } from '../app/shapeutils/BookmarkShapeUtil/BookmarkShapeUtil'
import { DrawShapeUtil } from '../app/shapeutils/DrawShapeUtil/DrawShapeUtil'
import { EmbedShapeUtil } from '../app/shapeutils/EmbedShapeUtil/EmbedShapeUtil'
import { FrameShapeUtil } from '../app/shapeutils/FrameShapeUtil/FrameShapeUtil'
import { GeoShapeUtil } from '../app/shapeutils/GeoShapeUtil/GeoShapeUtil'
import { GroupShapeUtil } from '../app/shapeutils/GroupShapeUtil/GroupShapeUtil'
import { HighlightShapeUtil } from '../app/shapeutils/HighlightShapeUtil/HighlightShapeUtil'
import { ImageShapeUtil } from '../app/shapeutils/ImageShapeUtil/ImageShapeUtil'
import { LineShapeUtil } from '../app/shapeutils/LineShapeUtil/LineShapeUtil'
import { NoteShapeUtil } from '../app/shapeutils/NoteShapeUtil/NoteShapeUtil'
import { TextShapeUtil } from '../app/shapeutils/TextShapeUtil/TextShapeUtil'
import { VideoShapeUtil } from '../app/shapeutils/VideoShapeUtil/VideoShapeUtil'
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
