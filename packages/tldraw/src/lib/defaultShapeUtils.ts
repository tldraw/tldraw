import { TLAnyShapeUtilConstructor } from '@tldraw/editor'
import { ArrowShapeUtil } from './shapes/arrow/ArrowShapeUtil'
import { BookmarkShapeUtil } from './shapes/bookmark/BookmarkShapeUtil'
import { DrawShapeUtil } from './shapes/draw/DrawShapeUtil'
import { FrameShapeUtil } from './shapes/frame/FrameShapeUtil'
import { GeoShapeUtil } from './shapes/geo/GeoShapeUtil'
import { HighlightShapeUtil } from './shapes/highlight/HighlightShapeUtil'
import { LineShapeUtil } from './shapes/line/LineShapeUtil'
import { NoteShapeUtil } from './shapes/note/NoteShapeUtil'
import { TextShapeUtil } from './shapes/text/TextShapeUtil'

/** @public */
export const defaultShapeUtils: TLAnyShapeUtilConstructor[] = [
	TextShapeUtil,
	BookmarkShapeUtil,
	DrawShapeUtil,
	GeoShapeUtil,
	NoteShapeUtil,
	LineShapeUtil,
	FrameShapeUtil,
	ArrowShapeUtil,
	HighlightShapeUtil,
]
