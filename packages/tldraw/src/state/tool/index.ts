import type { TLDrawState } from '~state'
import { TLDrawShapeType } from '~types'
import { ArrowTool } from './ArrowTool'
import { DrawTool } from './DrawTool'
import { EllipseTool } from './EllipseTool'
import { RectangleTool } from './RectangleTool'
import { SelectTool } from './SelectTool'
import { StickyTool } from './StickyTool'
import { TextTool } from './TextTool'

export type ToolType =
  | 'select'
  | TLDrawShapeType.Text
  | TLDrawShapeType.Draw
  | TLDrawShapeType.Ellipse
  | TLDrawShapeType.Rectangle
  | TLDrawShapeType.Arrow
  | TLDrawShapeType.PostIt

export interface ToolsMap {
  select: typeof SelectTool
  [TLDrawShapeType.Text]: typeof TextTool
  [TLDrawShapeType.Draw]: typeof DrawTool
  [TLDrawShapeType.Ellipse]: typeof EllipseTool
  [TLDrawShapeType.Rectangle]: typeof RectangleTool
  [TLDrawShapeType.Arrow]: typeof ArrowTool
  [TLDrawShapeType.PostIt]: typeof StickyTool
}

export type ToolOfType<K extends ToolType> = ToolsMap[K]

export type ArgsOfType<K extends ToolType> = ConstructorParameters<ToolOfType<K>>

export const tools: { [K in ToolType]: ToolsMap[K] } = {
  select: SelectTool,
  [TLDrawShapeType.Text]: TextTool,
  [TLDrawShapeType.Draw]: DrawTool,
  [TLDrawShapeType.Ellipse]: EllipseTool,
  [TLDrawShapeType.Rectangle]: RectangleTool,
  [TLDrawShapeType.Arrow]: ArrowTool,
  [TLDrawShapeType.PostIt]: StickyTool,
}

export const getTool = <K extends ToolType>(type: K): ToolOfType<K> => {
  return tools[type]
}

export function createTools(state: TLDrawState) {
  return {
    select: new SelectTool(state),
    [TLDrawShapeType.Text]: new TextTool(state),
    [TLDrawShapeType.Draw]: new DrawTool(state),
    [TLDrawShapeType.Ellipse]: new EllipseTool(state),
    [TLDrawShapeType.Rectangle]: new RectangleTool(state),
    [TLDrawShapeType.Arrow]: new ArrowTool(state),
    [TLDrawShapeType.PostIt]: new StickyTool(state),
  }
}
