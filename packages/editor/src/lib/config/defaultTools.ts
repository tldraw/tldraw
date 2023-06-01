import { StateNodeConstructor } from '../app/statechart/StateNode'
import { TLArrowTool } from '../app/statechart/TLArrowTool/TLArrowTool'
import { TLDrawTool } from '../app/statechart/TLDrawTool/TLDrawTool'
import { TLEraserTool } from '../app/statechart/TLEraserTool/TLEraserTool'
import { TLFrameTool } from '../app/statechart/TLFrameTool/TLFrameTool'
import { TLGeoTool } from '../app/statechart/TLGeoTool/TLGeoTool'
import { TLHandTool } from '../app/statechart/TLHandTool/TLHandTool'
import { TLHighlightTool } from '../app/statechart/TLHighlightTool/TLHighlightTool'
import { TLLaserTool } from '../app/statechart/TLLaserTool/TLLaserTool'
import { TLLineTool } from '../app/statechart/TLLineTool/TLLineTool'
import { TLNoteTool } from '../app/statechart/TLNoteTool/TLNoteTool'
import { TLTextTool } from '../app/statechart/TLTextTool/TLTextTool'

/** @public */
export const defaultTools: StateNodeConstructor[] = [
	TLHandTool,
	TLEraserTool,
	TLLaserTool,
	TLDrawTool,
	TLTextTool,
	TLLineTool,
	TLArrowTool,
	TLGeoTool,
	TLNoteTool,
	TLFrameTool,
	TLHighlightTool,
]
