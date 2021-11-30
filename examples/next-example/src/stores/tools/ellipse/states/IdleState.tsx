import { TLNuPointerHandler, TLNuState } from '@tldraw/next'
import type { Shape } from 'stores'

export class CreatingState extends TLNuState<Shape> {
  readonly id = 'idle'

  onPointerDown: TLNuPointerHandler<Shape> = (info, e) => {
    if (info.order > 0) return
    this.tool.transition('pointing')
  }

  onPointerUp: TLNuPointerHandler<Shape> = () => {
    this.tool.transition('idle')
    this.app.selectTool('select')
  }
}
