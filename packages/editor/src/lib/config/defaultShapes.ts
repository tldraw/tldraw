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

/** @public */
export const coreShapes = {
	// created by grouping interactions, probably the corest core shape that we have
	group: GroupShapeUtil,
	// created by embed menu / url drop
	embed: EmbedShapeUtil,
	// created by copy and paste / url drop
	bookmark: BookmarkShapeUtil,
	// created by copy and paste / file drop
	image: ImageShapeUtil,
	// created by copy and paste / file drop
	video: VideoShapeUtil,
	// created by copy and paste
	text: TextShapeUtil,
}

/** @public */
export const defaultShapes = {
	draw: DrawShapeUtil,
	geo: GeoShapeUtil,
	line: LineShapeUtil,
	note: NoteShapeUtil,
	frame: FrameShapeUtil,
	arrow: ArrowShapeUtil,
	highlight: HighlightShapeUtil,
}
