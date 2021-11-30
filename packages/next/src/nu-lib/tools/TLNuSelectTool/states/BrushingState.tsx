import { TLNuShape, TLNuState } from '~nu-lib'
import { BoundsUtils } from '~utils'
import type { TLNuBinding, TLNuKeyboardHandler, TLNuPointerHandler, TLNuWheelHandler } from '~types'

export class BrushingState<S extends TLNuShape, B extends TLNuBinding> extends TLNuState<S, B> {
  readonly id = 'brushing'

  private initialSelectedIds: string[] = []

  onEnter = () => (this.initialSelectedIds = [...this.app.selectedIds])

  onExit = () => (this.initialSelectedIds = [])

  onPan: TLNuWheelHandler<S> = (info, e) => {
    this.onPointerMove(info, e)
  }

  onPointerMove: TLNuPointerHandler<S> = () => {
    const {
      inputs: { shiftKey, ctrlKey, originPoint, currentPoint },
    } = this.app

    const brushBounds = BoundsUtils.getBoundsFromPoints([currentPoint, originPoint], 0)

    this.app.setBrush(brushBounds)

    const hits = this.app.currentPage.shapes
      .filter((shape) =>
        ctrlKey
          ? BoundsUtils.boundsContain(brushBounds, shape.bounds)
          : shape.hitTestBounds(brushBounds)
      )
      .map((shape) => shape.id)

    this.app.select(
      ...(shiftKey ? Array.from(new Set([...this.initialSelectedIds, ...hits]).values()) : hits)
    )
  }

  onPointerUp: TLNuPointerHandler<S> = () => {
    this.app.clearBrush()
    this.tool.transition('idle')
  }

  handleModifierKey: TLNuKeyboardHandler<S> = (info, e) => {
    switch (e.key) {
      case 'Escape': {
        this.app.clearBrush()
        this.app.select(...this.initialSelectedIds)
        this.tool.transition('idle')
        break
      }
    }
  }
}
