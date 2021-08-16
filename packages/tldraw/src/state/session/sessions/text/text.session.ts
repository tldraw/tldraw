import { TextShape, TLDrawShape, TLDrawStatus } from '~types'
import type { Session } from '~types'
import type { Data } from '~types'
import { TLDR } from '~state/tldr'

export class TextSession implements Session {
  id = 'text'
  status = TLDrawStatus.EditingText
  initialShape: TextShape

  constructor(data: Data, id?: string) {
    this.initialShape = TLDR.getShape(data, id || TLDR.getSelectedIds(data)[0])
  }

  start = (data: Data) => {
    return {
      document: {
        pageStates: {
          [data.appState.currentPageId]: {
            editingId: this.initialShape.id,
          },
        },
      },
    }
  }

  update = (data: Data, text: string) => {
    const {
      initialShape: { id },
    } = this

    let nextShape: TextShape = {
      ...TLDR.getShape<TextShape>(data, id),
      text,
    }

    nextShape = {
      ...nextShape,
      ...TLDR.getShapeUtils(nextShape).onStyleChange(nextShape),
    } as TextShape

    return {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: {
              [id]: nextShape,
            },
          },
        },
      },
    }
  }

  cancel = (data: Data) => {
    const {
      initialShape: { id },
    } = this

    return {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: {
              [id]: TLDR.onSessionComplete(data, TLDR.getShape(data, id)),
            },
          },
        },
        pageState: {
          [data.appState.currentPageId]: {
            editingId: undefined,
          },
        },
      },
    }
  }

  complete(data: Data) {
    const { initialShape } = this

    const shape = TLDR.getShape<TextShape>(data, initialShape.id)

    if (shape.text === initialShape.text) return undefined

    return {
      id: 'text',
      before: {
        document: {
          pages: {
            [data.appState.currentPageId]: {
              shapes: {
                [initialShape.id]: initialShape,
              },
            },
          },
          pageState: {
            [data.appState.currentPageId]: {
              editingId: undefined,
            },
          },
        },
      },
      after: {
        document: {
          pages: {
            [data.appState.currentPageId]: {
              shapes: {
                [initialShape.id]: TLDR.onSessionComplete(
                  data,
                  TLDR.getShape(data, initialShape.id)
                ),
              },
            },
          },
          pageState: {
            [data.appState.currentPageId]: {
              editingId: undefined,
            },
          },
        },
      },
    }
  }
}
