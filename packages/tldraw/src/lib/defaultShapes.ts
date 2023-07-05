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
	FrameShape,
	ArrowShape,
	HighlightShape,
] as const
