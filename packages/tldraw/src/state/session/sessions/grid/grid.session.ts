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
  delta = [0, 0]
  prev = [0, 0]
  origin: number[]
  shape: TLDrawShape
  isCloning = false
  clones: TLDrawShape[] = []
  bounds: TLBounds
  initialSelectedIds: string[]
  grid: string[][]
  columns = 1
  rows = 1

  constructor(data: Data, id: string, pageId: string, point: number[]) {
    this.origin = point
    this.shape = TLDR.getShape(data, id, pageId)
    this.grid = [[this.shape.id]]
    this.bounds = TLDR.getBounds(this.shape)
    this.initialSelectedIds = TLDR.getSelectedIds(data, pageId)
  }

  start = () => void null

  getClone = (point: number[]) => {
    const clone = {
      ...this.shape,
      id: Utils.uniqueId(),
      point,
    }
    if (clone.type === TLDrawShapeType.Sticky) {
      clone.text = ''
    }
    return clone
  }

  update = (data: Data, point: number[], shiftKey: boolean, altKey: boolean) => {
    const { currentPageId } = data.appState

    const nextShapes: Patch<Record<string, TLDrawShape>> = {}

    const nextPageState: Patch<TLPageState> = {}

    const delta = Vec.sub(point, this.origin)

    if (shiftKey) {
      if (Math.abs(delta[0]) < Math.abs(delta[1])) {
        delta[0] = 0
      } else {
        delta[1] = 0
      }
    }

    this.delta = delta

    this.prev = delta

    const startX = this.shape.point[0]
    const startY = this.shape.point[1]
    const gapX = this.bounds.width + 32
    const gapY = this.bounds.height + 32

    const columns = Math.max(
      1,
      Math.floor(Math.abs(this.delta[0] + this.bounds.width / 2) / gapX + 1)
    )

    const rows = Math.max(
      1,
      Math.floor(Math.abs(this.delta[1] + this.bounds.height / 2) / gapY + 1)
    )

    console.log(rows, columns)

    // if (columns > this.columns) {
    //   for (let x = this.columns; x < columns; x++) {
    //     this.grid.forEach((row, y) => {
    //       const clone = this.getClone([startX + x * gapX, startY + y * gapY])
    //       row.push(clone.id)
    //       nextShapes[clone.id] = clone
    //     })
    //   }
    // } else if (columns < this.columns) {
    //   this.grid.forEach((row) => {
    //     for (let x = this.columns; x > columns; x--) {
    //       const id = row.pop()
    //       if (id) nextShapes[id] = undefined
    //     }
    //   })
    // }

    // this.columns = columns

    // if (rows > this.rows) {
    //   for (let y = this.rows; y < rows; y++) {
    //     const row: string[] = []
    //     for (let x = 0; x < this.columns; x++) {
    //       const clone = this.getClone([startX + x * gapX, startY + y * gapY])
    //       row.push(clone.id)
    //       nextShapes[clone.id] = clone
    //     }
    //     this.grid.push(row)
    //   }
    // } else if (rows < this.rows) {
    //   for (let y = this.rows; y > rows; y--) {
    //     const row = this.grid[y - 1]
    //     row.forEach((id) => (nextShapes[id] = undefined))
    //     this.grid.pop()
    //   }
    // }

    // this.rows = rows

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
    const nextBindings: Record<string, Partial<TLDrawBinding> | undefined> = {}
    const nextShapes: Record<string, Partial<TLDrawShape> | undefined> = {}
    const nextPageState: Partial<TLPageState> = {}

    // Put initial shapes back to where they started
    nextShapes[this.shape.id] = { ...nextShapes[this.shape.id], point: this.shape.point }

    // Delete clones
    this.grid.forEach((row) =>
      row.forEach((id) => {
        nextShapes[id] = undefined
        // TODO: Remove shape from parent if grouped
      })
    )

    nextPageState.selectedIds = [this.shape.id]

    return {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: nextShapes,
            bindings: nextBindings,
          },
        },
        pageStates: {
          [data.appState.currentPageId]: nextPageState,
        },
      },
    }
  }

  complete(data: Data): TLDrawCommand {
    const pageId = data.appState.currentPageId

    const beforeShapes: Patch<Record<string, TLDrawShape>> = {}

    const afterShapes: Patch<Record<string, TLDrawShape>> = {}

    const afterSelectedIds: string[] = []

    this.grid.forEach((row) =>
      row.forEach((id) => {
        beforeShapes[id] = undefined
        afterShapes[id] = TLDR.getShape(data, id, pageId)
        afterSelectedIds.push(id)
        // TODO: Add shape to parent if grouped
      })
    )

    beforeShapes[this.shape.id] = this.shape
    afterShapes[this.shape.id] = this.shape

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
