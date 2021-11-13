import type { TLBounds } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import {
  TLDrawSnapshot,
  Session,
  SessionType,
  TLDrawStatus,
  TLDrawShape,
  PagePartial,
  TLDrawBinding,
} from '~types'
import { TLDR } from '~state/TLDR'

export class EraseSession extends Session {
  static type = SessionType.Draw
  status = TLDrawStatus.Creating
  origin: number[]
  isLocked?: boolean
  lockedDirection?: 'horizontal' | 'vertical'
  erasedShapes = new Set<TLDrawShape>()
  erasedBindings = new Set<TLDrawBinding>()
  initialSelectedShapes: TLDrawShape[]
  erasableShapes: TLDrawShape[]
  prevPoint: number[]

  constructor(data: TLDrawSnapshot, viewport: TLBounds, point: number[]) {
    super(viewport)
    this.origin = point
    this.prevPoint = point
    this.initialSelectedShapes = TLDR.getSelectedShapes(data, data.appState.currentPageId)
    this.erasableShapes = TLDR.getShapes(data, data.appState.currentPageId).filter(
      (shape) => !shape.isLocked
    )
  }

  start = () => void null

  update = (data: TLDrawSnapshot, point: number[], shiftKey = false) => {
    const pageId = data.appState.currentPageId

    if (shiftKey) {
      if (!this.isLocked && Vec.dist(this.origin, point) > 4) {
        // If we're locking before knowing what direction we're in, set it
        // early based on the bigger dimension.
        if (!this.lockedDirection) {
          const delta = Vec.sub(point, this.origin)
          this.lockedDirection = delta[0] > delta[1] ? 'horizontal' : 'vertical'
        }

        this.isLocked = true
      }
    } else if (this.isLocked) {
      this.isLocked = false
    }

    if (this.isLocked) {
      if (this.lockedDirection === 'vertical') {
        point[0] = this.origin[0]
      } else {
        point[1] = this.origin[1]
      }
    }

    const newPoint = Vec.round(Vec.add(this.origin, Vec.sub(point, this.origin))).concat(point[2])

    const deletedShapeIds = new Set<string>([])

    for (const shape of this.erasableShapes) {
      if (this.erasedShapes.has(shape)) continue

      if (TLDR.getShapeUtils(shape).hitTestLineSegment(shape, this.prevPoint, newPoint)) {
        this.erasedShapes.add(shape)
        deletedShapeIds.add(shape.id)

        if (shape.children !== undefined) {
          for (const childId of shape.children) {
            this.erasedShapes.add(TLDR.getShape(data, childId, pageId))
            deletedShapeIds.add(childId)
          }
        }
      }
    }

    // Erase bindings that reference deleted shapes

    const page = data.document.pages[pageId]

    Object.values(page.bindings).forEach((binding) => {
      for (const id of [binding.toId, binding.fromId]) {
        if (deletedShapeIds.has(id)) {
          this.erasedBindings.add(binding)
        }
      }
    })

    const erasedShapes = Array.from(this.erasedShapes.values())
    const erasedBindings = Array.from(this.erasedBindings.values())
    const erasedShapeIds = erasedShapes.map((shape) => shape.id)

    this.prevPoint = newPoint

    return {
      document: {
        pages: {
          [pageId]: {
            shapes: Object.fromEntries(erasedShapes.map((shape) => [shape.id, undefined])),
            bindings: Object.fromEntries(erasedBindings.map((binding) => [binding.id, undefined])),
          },
        },
        pageStates: {
          [pageId]: {
            selectedIds: this.initialSelectedShapes
              .filter((shape) => !erasedShapeIds.includes(shape.id))
              .map((shape) => shape.id),
          },
        },
      },
    }
  }

  cancel = (data: TLDrawSnapshot) => {
    const pageId = data.appState.currentPageId

    const erasedShapes = Array.from(this.erasedShapes.values())

    return {
      document: {
        pages: {
          [pageId]: {
            shapes: Object.fromEntries(erasedShapes.map((shape) => [shape.id, shape])),
          },
        },
        pageStates: {
          [pageId]: {
            selectedIds: this.initialSelectedShapes.map((shape) => shape.id),
          },
        },
      },
    }
  }

  complete = (data: TLDrawSnapshot) => {
    const pageId = data.appState.currentPageId

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
    Object.values(data.document.pages[pageId].shapes).forEach((shape) => {
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
            [pageId]: before,
          },
          pageStates: {
            [pageId]: {
              selectedIds: this.initialSelectedShapes.map((shape) => shape.id),
            },
          },
        },
      },
      after: {
        document: {
          pages: {
            [pageId]: after,
          },
          pageStates: {
            [data.appState.currentPageId]: {
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
