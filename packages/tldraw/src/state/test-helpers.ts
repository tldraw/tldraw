import { inputs, TLBoundsEdge, TLBoundsCorner } from '@tldraw/core'
import { TLDrawDocument, ColorStyle, DashStyle, SizeStyle, TLDrawShapeType } from '~types'
import type { TLDrawState } from './tlstate'

interface PointerOptions {
  id?: number
  x?: number
  y?: number
  shiftKey?: boolean
  altKey?: boolean
  ctrlKey?: boolean
}

export class TLStateUtils {
  tlstate: TLDrawState

  constructor(tlstate: TLDrawState) {
    this.tlstate = tlstate
  }

  pointCanvas = (options: PointerOptions = {}) => {
    this.tlstate.onPointCanvas(
      inputs.pointerDown(this.getPoint(options), 'canvas'),
      {} as React.PointerEvent
    )
  }

  pointShape = (id: string, options: PointerOptions = {}) => {
    this.tlstate.onPointShape(
      inputs.pointerDown(this.getPoint(options), id),
      {} as React.PointerEvent
    )
  }

  doubleClickShape = (id: string, options: PointerOptions = {}) => {
    this.tlstate.onDoubleClickShape(
      inputs.pointerDown(this.getPoint(options), id),
      {} as React.PointerEvent
    )
  }

  pointBounds = (options: PointerOptions = {}) => {
    this.tlstate.onPointBounds(
      inputs.pointerDown(this.getPoint(options), 'bounds'),
      {} as React.PointerEvent
    )
  }

  pointBoundsHandle = (
    id: TLBoundsCorner | TLBoundsEdge | 'rotate',
    options: PointerOptions = {}
  ) => {
    this.tlstate.onPointBounds(
      inputs.pointerDown(this.getPoint(options), 'bounds'),
      {} as React.PointerEvent
    )
  }

  stopPointing = (target = 'canvas', options: PointerOptions = {}) => {
    this.tlstate.onPointerUp(
      inputs.pointerDown(this.getPoint(options), target),
      {} as React.PointerEvent
    )
  }

  clickCanvas = (options: PointerOptions = {}) => {
    this.pointCanvas(options)
    this.stopPointing()
  }

  clickShape = (id: string, options: PointerOptions = {}) => {
    this.pointShape(id, options)
    this.stopPointing(id, options)
  }

  clickBounds = (options: PointerOptions = {}) => {
    this.pointBounds(options)
    this.stopPointing()
  }

  clickBoundsHandle = (
    id: TLBoundsCorner | TLBoundsEdge | 'rotate',
    options: PointerOptions = {}
  ) => {
    this.pointBoundsHandle(id, options)
    this.stopPointing(id)
  }

  getPoint(options: PointerOptions = {} as PointerOptions): PointerEvent {
    const { id = 1, x = 0, y = 0, shiftKey = false, altKey = false, ctrlKey = false } = options

    return {
      shiftKey,
      altKey,
      ctrlKey,
      pointerId: id,
      clientX: x,
      clientY: y,
    } as PointerEvent
  }
}

export const mockDocument: TLDrawDocument = {
  id: 'doc',
  pages: {
    page1: {
      id: 'page1',
      shapes: {
        rect1: {
          id: 'rect1',
          parentId: 'page1',
          name: 'Rectangle',
          childIndex: 1,
          type: TLDrawShapeType.Rectangle,
          point: [0, 0],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue,
          },
        },
        rect2: {
          id: 'rect2',
          parentId: 'page1',
          name: 'Rectangle',
          childIndex: 2,
          type: TLDrawShapeType.Rectangle,
          point: [100, 100],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue,
          },
        },
        rect3: {
          id: 'rect3',
          parentId: 'page1',
          name: 'Rectangle',
          childIndex: 3,
          type: TLDrawShapeType.Rectangle,
          point: [20, 20],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue,
          },
        },
      },
      bindings: {},
    },
  },
  pageStates: {
    page1: {
      id: 'page1',
      selectedIds: [],
      currentParentId: 'page1',
      camera: {
        point: [0, 0],
        zoom: 1,
      },
    },
  },
}
