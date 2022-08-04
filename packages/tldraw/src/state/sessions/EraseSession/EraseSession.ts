import { Vec } from '@tldraw/vec'
import type { TldrawApp } from '~state/TldrawApp'
import { BaseSession } from '~state/sessions/BaseSession'
import {
  PagePartial,
  SessionType,
  TDBinding,
  TDShape,
  TDStatus,
  TldrawCommand,
  TldrawPatch,
} from '~types'

export class EraseSession extends BaseSession {
  type = SessionType.Draw
  performanceMode = undefined
  status = TDStatus.Creating
  isLocked?: boolean
  lockedDirection?: 'horizontal' | 'vertical'
  erasedShapes = new Set<TDShape>()
  erasedBindings = new Set<TDBinding>()
  initialSelectedShapes: TDShape[]
  erasableShapes: Set<TDShape>
  prevPoint: number[]
  prevEraseShapesSize = 0

  constructor(app: TldrawApp) {
    super(app)
    this.prevPoint = [...app.originPoint]
    this.initialSelectedShapes = this.app.selectedIds.map((id) => this.app.getShape(id))
    this.erasableShapes = new Set(this.app.shapes.filter((shape) => !shape.isLocked))
    this.interval = this.loop()
  }

  interval: any
  timestamp1 = 0
  timestamp2 = 0
  prevErasePoint: number[] = []

  loop = () => {
    const now = Date.now()
    const elapsed1 = now - this.timestamp1
    const elapsed2 = now - this.timestamp2
    const { eraseLine } = this.app.appState

    let next = [...eraseLine]
    let didUpdate = false

    if (elapsed1 > 16 && this.prevErasePoint !== this.prevPoint) {
      didUpdate = true
      next = [...eraseLine, this.prevPoint]
      this.prevErasePoint = this.prevPoint
    }

    if (elapsed2 > 32) {
      if (next.length > 1) {
        didUpdate = true
        next.splice(0, Math.ceil(next.length * 0.1))
        this.timestamp2 = now
      }
    }

    if (didUpdate) {
      this.app.patchState(
        {
          appState: {
            eraseLine: next,
          },
        },
        'eraseline'
      )
    }

    this.interval = requestAnimationFrame(this.loop)
  }

  start = (): TldrawPatch | undefined => void null

  update = (): TldrawPatch | undefined => {
    const { page, shiftKey, originPoint, currentPoint, zoom } = this.app

    if (shiftKey) {
      if (!this.isLocked && Vec.dist(originPoint, currentPoint) > 4 / zoom) {
        // If we're locking before knowing what direction we're in, set it
        // early based on the bigger dimension.
        if (!this.lockedDirection) {
          const delta = Vec.sub(currentPoint, originPoint)
          this.lockedDirection = delta[0] > delta[1] ? 'horizontal' : 'vertical'
        }

        this.isLocked = true
      }
    } else if (this.isLocked) {
      this.isLocked = false
    }

    if (this.isLocked) {
      if (this.lockedDirection === 'vertical') {
        currentPoint[0] = originPoint[0]
      } else {
        currentPoint[1] = originPoint[1]
      }
    }

    const newPoint = Vec.toFixed(Vec.add(originPoint, Vec.sub(currentPoint, originPoint)))

    const deletedShapeIds = new Set<string>([])

    this.erasableShapes.forEach((shape) => {
      if (this.erasedShapes.has(shape)) return
      if (this.app.getShapeUtil(shape).hitTestLineSegment(shape, this.prevPoint, newPoint)) {
        this.erasedShapes.add(shape)
        deletedShapeIds.add(shape.id)

        if (shape.children !== undefined) {
          for (const childId of shape.children) {
            this.erasedShapes.add(this.app.getShape(childId))
            deletedShapeIds.add(childId)
          }
        }
      }
    })

    // Erase bindings that reference deleted shapes

    Object.values(page.bindings).forEach((binding) => {
      for (const id of [binding.toId, binding.fromId]) {
        if (deletedShapeIds.has(id)) {
          this.erasedBindings.add(binding)
        }
      }
    })

    this.erasedShapes.forEach((shape) => {
      // Has the shape been deleted? If so, pull it from the list.
      if (!this.app.getShape(shape.id)) {
        this.erasedShapes.delete(shape)
        this.erasableShapes.delete(shape)
        deletedShapeIds.delete(shape.id)
      }
    })

    const erasedShapes = Array.from(this.erasedShapes.values())

    this.prevPoint = newPoint

    if (erasedShapes.length === this.prevEraseShapesSize) {
      return
    }

    this.prevEraseShapesSize = erasedShapes.length

    return {
      document: {
        pages: {
          [page.id]: {
            shapes: Object.fromEntries(erasedShapes.map((shape) => [shape.id, { isGhost: true }])),
          },
        },
      },
    }
  }

  cancel = (): TldrawPatch | undefined => {
    const { page } = this.app

    cancelAnimationFrame(this.interval)

    this.erasedShapes.forEach((shape) => {
      if (!this.app.getShape(shape.id)) {
        this.erasedShapes.delete(shape)
        this.erasableShapes.delete(shape)
      }
    })

    const erasedShapes = Array.from(this.erasedShapes.values())

    return {
      document: {
        pages: {
          [page.id]: {
            shapes: Object.fromEntries(erasedShapes.map((shape) => [shape.id, { isGhost: false }])),
          },
        },
        pageStates: {
          [page.id]: {
            selectedIds: this.initialSelectedShapes.map((shape) => shape.id),
          },
        },
      },
      appState: {
        eraseLine: [],
      },
    }
  }

  complete = (): TldrawPatch | TldrawCommand | undefined => {
    const { page } = this.app

    cancelAnimationFrame(this.interval)

    this.erasedShapes.forEach((shape) => {
      if (!this.app.getShape(shape.id)) {
        this.erasedShapes.delete(shape)
        this.erasableShapes.delete(shape)
      }
    })

    this.erasedBindings.forEach((binding) => {
      if (!this.app.getBinding(binding.id)) {
        this.erasedBindings.delete(binding)
      }
    })

    const erasedShapes = Array.from(this.erasedShapes.values())
    const erasedBindings = Array.from(this.erasedBindings.values())
    const erasedShapeIds = erasedShapes.map((shape) => shape.id)
    const erasedBindingIds = erasedBindings.map((binding) => binding.id)

    const before: PagePartial = {
      shapes: Object.fromEntries(erasedShapes.map((shape) => [shape.id, shape])),
      bindings: Object.fromEntries(erasedBindings.map((binding) => [binding.id, binding])),
    }

    const after: PagePartial = {
      shapes: Object.fromEntries(erasedShapes.map((shape) => [shape.id, undefined])),
      bindings: Object.fromEntries(erasedBindings.map((binding) => [binding.id, undefined])),
    }

    // Remove references on any shape's handles to any deleted bindings
    this.app.shapes.forEach((shape) => {
      if (shape.handles && !after.shapes[shape.id]) {
        Object.values(shape.handles).forEach((handle) => {
          if (handle.bindingId && erasedBindingIds.includes(handle.bindingId)) {
            // Save the binding reference in the before patch
            before.shapes[shape.id] = {
              ...before.shapes[shape.id],
              handles: {
                ...before.shapes[shape.id]?.handles,
                [handle.id]: handle,
              },
            }

            // Save the binding reference in the before patch
            if (!erasedShapeIds.includes(shape.id)) {
              after.shapes[shape.id] = {
                ...after.shapes[shape.id],
                handles: {
                  ...after.shapes[shape.id]?.handles,
                  [handle.id]: {
                    ...handle,
                    bindingId: undefined,
                  },
                },
              }
            }
          }
        })
      }
    })

    return {
      id: 'erase',
      before: {
        document: {
          pages: {
            [page.id]: before,
          },
          pageStates: {
            [page.id]: {
              selectedIds: this.initialSelectedShapes
                .filter((shape) => !!this.app.getShape(shape.id))
                .map((shape) => shape.id),
            },
          },
        },
        appState: {
          eraseLine: [],
        },
      },
      after: {
        document: {
          pages: {
            [page.id]: after,
          },
          pageStates: {
            [page.id]: {
              selectedIds: this.initialSelectedShapes
                .filter((shape) => !!this.app.getShape(shape.id))
                .filter((shape) => !erasedShapeIds.includes(shape.id))
                .map((shape) => shape.id),
            },
          },
        },
        appState: {
          eraseLine: [],
        },
      },
    }
  }
}
