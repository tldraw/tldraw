/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TLPageState, TLBounds, Utils } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import {
  TLDrawShape,
  TLDrawBinding,
  Session,
  Data,
  TLDrawCommand,
  TLDrawStatus,
  ArrowShape,
  GroupShape,
  SessionType,
  TLDrawShapeType,
} from '~types'
import { TLDR } from '~state/tldr'
import type { Patch } from 'rko'

export class GridSession implements Session {
  type = SessionType.Grid
  status = TLDrawStatus.Translating
  origin: number[]
  shape: TLDrawShape
  bounds: TLBounds
  initialSelectedIds: string[]
  initialSiblings?: string[]
  grid: Record<string, string> = {}
  columns = 1
  rows = 1
  isCopying = false

  constructor(data: Data, id: string, pageId: string, point: number[]) {
    this.origin = point
    this.shape = TLDR.getShape(data, id, pageId)
    this.grid['0_0'] = this.shape.id
    this.bounds = TLDR.getBounds(this.shape)
    this.initialSelectedIds = TLDR.getSelectedIds(data, pageId)
    if (this.shape.parentId !== pageId) {
      this.initialSiblings = TLDR.getShape(data, this.shape.parentId, pageId).children?.filter(
        (id) => id !== this.shape.id
      )
    }
  }

  start = () => void null

  getClone = (point: number[], copy: boolean) => {
    const clone = {
      ...this.shape,
      id: Utils.uniqueId(),
      point,
    }

    if (!copy) {
      if (clone.type === TLDrawShapeType.Sticky) {
        clone.text = ''
      }
    }

    return clone
  }

  update = (data: Data, point: number[], shiftKey = false, altKey = false, metaKey = false) => {
    const nextShapes: Patch<Record<string, TLDrawShape>> = {}

    const nextPageState: Patch<TLPageState> = {}

    const center = Utils.getBoundsCenter(this.bounds)

    const offset = Vec.sub(point, center)

    if (shiftKey) {
      if (Math.abs(offset[0]) < Math.abs(offset[1])) {
        offset[0] = 0
      } else {
        offset[1] = 0
      }
    }
    // use the distance from center to determine the grid

    const gapX = this.bounds.width + 32
    const gapY = this.bounds.height + 32

    const columns = Math.ceil(offset[0] / gapX)
    const rows = Math.ceil(offset[1] / gapY)

    const minX = Math.min(columns, 0)
    const minY = Math.min(rows, 0)
    const maxX = Math.max(columns, 1)
    const maxY = Math.max(rows, 1)

    const inGrid = new Set<string>()

    const isCopying = altKey

    if (isCopying !== this.isCopying) {
      // Recreate shapes copying
      Object.values(this.grid)
        .filter((id) => id !== this.shape.id)
        .forEach((id) => (nextShapes[id] = undefined))

      this.grid = { '0_0': this.shape.id }

      this.isCopying = isCopying
    }

    // Go through grid, adding items in positions
    // that aren't already filled.
    for (let x = minX; x < maxX; x++) {
      for (let y = minY; y < maxY; y++) {
        const position = `${x}_${y}`

        inGrid.add(position)

        if (this.grid[position]) continue

        if (x === 0 && y === 0) continue

        const clone = this.getClone(Vec.add(this.shape.point, [x * gapX, y * gapY]), isCopying)

        nextShapes[clone.id] = clone

        this.grid[position] = clone.id
      }
    }

    // Remove any other items from the grid
    Object.entries(this.grid).forEach(([position, id]) => {
      if (!inGrid.has(position)) {
        nextShapes[id] = undefined
        delete this.grid[position]
      }
    })

    if (Object.values(nextShapes).length === 0) return

    // Add shapes to parent id
    if (this.initialSiblings) {
      nextShapes[this.shape.parentId] = {
        children: [...this.initialSiblings, ...Object.values(this.grid)],
      }
    }

    return {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: nextShapes,
          },
        },
        pageStates: {
          [data.appState.currentPageId]: nextPageState,
        },
      },
    }
  }

  cancel = (data: Data) => {
    const nextShapes: Record<string, Partial<TLDrawShape> | undefined> = {}

    // Delete clones
    Object.values(this.grid).forEach((id) => {
      nextShapes[id] = undefined
      // TODO: Remove from parent if grouped
    })

    // Put back the initial shape
    nextShapes[this.shape.id] = { ...nextShapes[this.shape.id], point: this.shape.point }

    if (this.initialSiblings) {
      nextShapes[this.shape.parentId] = {
        children: [...this.initialSiblings, this.shape.id],
      }
    }

    return {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: nextShapes,
          },
        },
        pageStates: {
          [data.appState.currentPageId]: {
            selectedIds: [this.shape.id],
          },
        },
      },
    }
  }

  complete(data: Data) {
    const pageId = data.appState.currentPageId

    const beforeShapes: Patch<Record<string, TLDrawShape>> = {}

    const afterShapes: Patch<Record<string, TLDrawShape>> = {}

    const afterSelectedIds: string[] = []

    Object.values(this.grid).forEach((id) => {
      beforeShapes[id] = undefined
      afterShapes[id] = TLDR.getShape(data, id, pageId)
      afterSelectedIds.push(id)
      // TODO: Add shape to parent if grouped
    })

    beforeShapes[this.shape.id] = this.shape

    // Add shapes to parent id
    if (this.initialSiblings) {
      beforeShapes[this.shape.parentId] = {
        children: [...this.initialSiblings, this.shape.id],
      }

      afterShapes[this.shape.parentId] = {
        children: [...this.initialSiblings, ...Object.values(this.grid)],
      }
    }

    // If no new shapes have been created, bail
    if (afterSelectedIds.length === 1) return

    return {
      id: 'grid',
      before: {
        document: {
          pages: {
            [pageId]: {
              shapes: beforeShapes,
            },
          },
          pageStates: {
            [pageId]: {
              selectedIds: [],
              hoveredId: undefined,
            },
          },
        },
      },
      after: {
        document: {
          pages: {
            [pageId]: {
              shapes: afterShapes,
            },
          },
          pageStates: {
            [pageId]: {
              selectedIds: afterSelectedIds,
              hoveredId: undefined,
            },
          },
        },
      },
    }
  }
}
