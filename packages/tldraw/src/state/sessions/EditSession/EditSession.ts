import type { TldrawApp } from '~state/TldrawApp'
import { BaseSession } from '~state/sessions/BaseSession'
import { SessionType, TDShape, TldrawCommand, TldrawPatch } from '~types'

export class EditSession extends BaseSession {
  type = SessionType.Edit
  performanceMode = undefined

  initialShape: TDShape
  initialSelectedIds: string[]
  currentPageId: string
  isCreating: boolean

  constructor(app: TldrawApp, id: string, isCreating: boolean) {
    super(app)
    this.initialShape = app.getShape(id, app.currentPageId)
    this.currentPageId = app.currentPageId
    this.isCreating = isCreating
    this.initialSelectedIds = [...app.selectedIds]
  }

  start = (): TldrawPatch | undefined => void null

  update = (): TldrawPatch | undefined => void null

  cancel = (): TldrawPatch | undefined => {
    return {
      document: {
        pages: {
          [this.currentPageId]: {
            shapes: {
              [this.initialShape.id]: this.isCreating ? undefined : this.initialShape,
            },
          },
        },
        pageStates: {
          [this.currentPageId]: {
            selectedIds: this.isCreating ? [] : this.initialSelectedIds,
            editingId: undefined,
          },
        },
      },
    }
  }

  complete = (): TldrawPatch | TldrawCommand | undefined => {
    const shape = this.app.getShape(this.initialShape.id)

    return {
      id: 'edit',
      before: {
        document: {
          pages: {
            [this.currentPageId]: {
              shapes: {
                [this.initialShape.id]: this.isCreating ? undefined : this.initialShape,
              },
            },
          },
          pageStates: {
            [this.currentPageId]: {
              selectedIds: this.isCreating ? [] : this.initialSelectedIds,
              editingId: undefined,
            },
          },
        },
      },
      after: {
        document: {
          pages: {
            [this.currentPageId]: {
              shapes: {
                [this.initialShape.id]: shape,
              },
            },
          },
          pageStates: {
            [this.currentPageId]: {
              selectedIds: [shape.id],
              editingId: undefined,
            },
          },
        },
      },
    }
  }
}
