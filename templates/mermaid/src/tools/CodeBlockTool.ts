/**
 * Tool for creating code block shapes
 */

import { BaseBoxShapeTool } from 'tldraw'

export class CodeBlockTool extends BaseBoxShapeTool {
	static override id = 'code-block'
	static override initial = 'idle'
	override shapeType = 'code-block' as const
}
