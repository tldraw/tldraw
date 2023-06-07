import { TLShapeInfo } from '../../../config/createTLStore'
import { TLStateNodeConstructor } from '../../tools/StateNode'
import { HighlightShapeTool } from './HighlightShapeTool/HighlightShapeTool'
import { HighlightShapeUtil } from './HighlightShapeUtil/HighlightShapeUtil'
import { highlightShapeMigrations } from './highlightShapeMigrations'
import { highlightShapeValidator } from './highlightShapeValidator'

/** @public */
export const highlightShape: TLShapeInfo & { tool?: TLStateNodeConstructor } = {
	util: HighlightShapeUtil,
	tool: HighlightShapeTool,
	migrations: highlightShapeMigrations,
	validator: highlightShapeValidator,
}
