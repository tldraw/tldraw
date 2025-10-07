import { ArrowShapeTool } from './shapes/arrow/ArrowShapeTool'
import { DrawShapeTool } from './shapes/draw/DrawShapeTool'
import { FrameShapeTool } from './shapes/frame/FrameShapeTool'
import { GeoShapeTool } from './shapes/geo/GeoShapeTool'
import { HighlightShapeTool } from './shapes/highlight/HighlightShapeTool'
import { LineShapeTool } from './shapes/line/LineShapeTool'
import { NoteShapeTool } from './shapes/note/NoteShapeTool'
import { RulerShapeTool } from './shapes/ruler/RulerShapeTool'
import { TextShapeTool } from './shapes/text/TextShapeTool'

/** @public */
export const defaultShapeTools = [
	TextShapeTool,
	DrawShapeTool,
	GeoShapeTool,
	NoteShapeTool,
	LineShapeTool,
	RulerShapeTool,
	FrameShapeTool,
	ArrowShapeTool,
	HighlightShapeTool,
] as const
