import { EraserTool } from './tools/EraserTool/EraserTool'
import { HandTool } from './tools/HandTool/HandTool'
import { LaserTool } from './tools/LaserTool/LaserTool'
import { ScissorsTool } from './tools/ScissorsTool/ScissorsTool'
import { SelectTool } from './tools/SelectTool/SelectTool'
import { ZoomTool } from './tools/ZoomTool/ZoomTool'

/** @public */
export const defaultTools = [
	EraserTool,
	HandTool,
	LaserTool,
	ScissorsTool,
	ZoomTool,
	SelectTool,
] as const
