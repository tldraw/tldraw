import { Vec } from '@tldraw/vec'
import {
  SessionType,
  TLDrawStatus,
  TLDrawShape,
  PagePartial,
  TLDrawBinding,
  TLDrawPatch,
  TLDrawCommand,
} from '~types'
import type { TLDrawApp } from '../../internal'
import { BaseSession } from '../BaseSession'

export class EraseSession extends BaseSession {
  type = SessionType.Draw
  status = TLDrawStatus.Creating
  isLocked?: boolean
  lockedDirection?: 'horizontal' | 'vertical'
  erasedShapes = new Set<TLDrawShape>()
  erasedBindings = new Set<TLDrawBinding>()
  initialSelectedShapes: TLDrawShape[]
  erasableShapes: TLDrawShape[]
  prevPoint: number[]

  constructor(app: TLDrawApp) {
    super(app)
    this.prevPoint = app.mutables.originPoint
    this.initialSelectedShapes = this.app.selectedIds.map((id) => this.app.getShape(id))
    this.erasableShapes = this.app.shapes.filter((shape) => !shape.isLocked)
  }

  start = (): TLDrawPatch | undefined => void null

  update = (): TLDrawPatch | undefined => {
    const {
      page,
      mutables: { shiftKey, originPoint, currentPoint },
    } = this.app

    if (shiftKey) {
      if (!this.isLocked && Vec.dist(originPoint, currentPoint) > 4) {
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

    const newPoint = Vec.round(Vec.add(originPoint, Vec.sub(currentPoint, originPoint)))

    const deletedShapeIds = new Set<string>([])

    for (const shape of this.erasableShapes) {
      if (this.erasedShapes.has(shape)) continue

      if (this.app.getShapeUtils(shape).hitTestLineSegment(shape, this.prevPoint, newPoint)) {
        this.erasedShapes.add(shape)
        deletedShapeIds.add(shape.id)

        if (shape.children !== undefined) {
          for (const childId of shape.children) {
            this.erasedShapes.add(this.app.getShape(childId))
            deletedShapeIds.add(childId)
          }
        }
      }
    }

    // Erase bindings that reference deleted shapes

    Object.values(page.bindings).forEach((binding) => {
      for (const id of [binding.toId, binding.fromId]) {
        if (deletedShapeIds.has(id)) {
          this.erasedBindings.add(binding)
        }
      }
    })

    const erasedShapes = Array.from(this.erasedShapes.values())

    this.prevPoint = newPoint

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

  cancel = (): TLDrawPatch | undefined => {
    const { page } = this.app

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
    }
  }

  complete = (): TLDrawPatch | TLDrawCommand | undefined => {
    const { page } = this.app

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
                  [handle.id]: undefined,
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
              selectedIds: this.initialSelectedShapes.map((shape) => shape.id),
            },
          },
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
                .filter((shape) => !erasedShapeIds.includes(shape.id))
                .map((shape) => shape.id),
            },
          },
        },
      },
    }
  }
}
