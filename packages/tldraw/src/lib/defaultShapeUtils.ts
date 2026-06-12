import { ArrowShapeUtil } from './shapes/arrow/ArrowShapeUtil'
import { BookmarkShapeUtil } from './shapes/bookmark/BookmarkShapeUtil'
import { DrawShapeUtil } from './shapes/draw/DrawShapeUtil'
import { EmbedShapeUtil } from './shapes/embed/EmbedShapeUtil'
import { FrameShapeUtil } from './shapes/frame/FrameShapeUtil'
import { GeoShapeUtil } from './shapes/geo/GeoShapeUtil'
import { HighlightShapeUtil } from './shapes/highlight/HighlightShapeUtil'
import { ImageShapeUtil } from './shapes/image/ImageShapeUtil'
import { LineShapeUtil } from './shapes/line/LineShapeUtil'
import { NoteShapeUtil } from './shapes/note/NoteShapeUtil'
import { TableCellShapeUtil } from './shapes/table/TableCellShapeUtil'
import { TableShapeUtil } from './shapes/table/TableShapeUtil'
import { TextShapeUtil } from './shapes/text/TextShapeUtil'
import { VideoShapeUtil } from './shapes/video/VideoShapeUtil'

/** @public */
export const defaultShapeUtils = [
	TextShapeUtil,
	BookmarkShapeUtil,
	DrawShapeUtil,
	GeoShapeUtil,
	NoteShapeUtil,
	LineShapeUtil,
	FrameShapeUtil,
	TableShapeUtil,
	TableCellShapeUtil,
	ArrowShapeUtil,
	HighlightShapeUtil,
	EmbedShapeUtil,
	ImageShapeUtil,
	VideoShapeUtil,
] as const
