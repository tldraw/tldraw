import { TLNuApp, TLNuSelectTool, TLNuToolState } from '~nu-lib'
import { TLNuPinchHandler, TLNuPointerHandler, TLNuShortcut, TLNuTargetType } from '~types'
import { BoundsUtils, PointUtils } from '~utils'

export class IdleState<R extends TLNuApp, P extends TLNuSelectTool<R>> extends TLNuToolState<R, P> {
  static id = 'idle'

  static shortcuts: TLNuShortcut<TLNuApp>[] = [
    {
      keys: 'Delete,Backspace',
      fn: (app) => app.delete(),
    },
    {
      keys: 'cmd+a,ctrl+a',
      fn: (app) => app.selectAll(),
    },
  ]

  onExit = () => {
    this.app.hover(undefined)
  }

  onPointerEnter: TLNuPointerHandler = (info) => {
    if (info.order > 0) return

    if (info.type === TLNuTargetType.Shape) {
      this.app.hover(info.target.id)
    }
  }

  onPointerDown: TLNuPointerHandler = (info, event) => {
    const {
      selectedShapes,
      inputs: { ctrlKey },
    } = this.app

    // Holding ctrlKey should ignore shapes
    if (ctrlKey) {
      this.tool.transition('pointingCanvas')
      return
    }

    switch (info.type) {
      case TLNuTargetType.Bounds: {
        switch (info.target) {
          case 'center': {
            break
          }
          case 'background': {
            this.tool.transition('pointingBoundsBackground')
            break
          }
          case 'rotate': {
            this.tool.transition('pointingRotateHandle')
            break
          }
          default: {
            this.tool.transition('pointingResizeHandle', { target: info.target })
          }
        }
        break
      }
      case TLNuTargetType.Shape: {
        if (selectedShapes.includes(info.target)) {
          this.tool.transition('pointingSelectedShape', { target: info.target })
        } else {
          const { selectedBounds, inputs } = this.app
          if (selectedBounds && PointUtils.pointInBounds(inputs.currentPoint, selectedBounds)) {
            this.tool.transition('pointingShapeBehindBounds', { target: info.target })
          } else {
            this.tool.transition('pointingShape', { target: info.target })
          }
        }
        break
      }
      case TLNuTargetType.Canvas: {
        this.tool.transition('pointingCanvas')
        break
      }
    }
  }

  onPointerLeave: TLNuPointerHandler = (info) => {
    if (info.order > 0) return

    if (info.type === TLNuTargetType.Shape) {
      if (this.app.hoveredId) {
        this.app.hover(undefined)
      }
    }
  }

  onPinchStart: TLNuPinchHandler = (info, gesture, event) => {
    this.tool.transition('pinching', { info, gesture, event })
  }
}
