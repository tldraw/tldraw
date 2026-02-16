/**
 * Tool for creating code block shapes
 */

import { BaseBoxShapeTool } from 'tldraw'
import { CODE_BLOCK_SHAPE_TYPE } from '../shapes/CodeBlockShape'

export class CodeBlockTool extends BaseBoxShapeTool {
	static override id = 'code-block'
	static override initial = 'idle'
	override shapeType = CODE_BLOCK_SHAPE_TYPE
}
