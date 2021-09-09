import { TextShape, TLDrawStatus } from '~types'
import type { Session } from '~types'
import type { Data } from '~types'
import { TLDR } from '~state/tldr'

export class TextSession implements Session {
  id = 'text'
  status = TLDrawStatus.EditingText
  initialShape: TextShape

  constructor(data: Data, id?: string) {
    const pageId = data.appState.currentPageId
    this.initialShape = TLDR.getShape(data, id || TLDR.getSelectedIds(data, pageId)[0], pageId)
  }

  start = (data: Data) => {
    const pageId = data.appState.currentPageId
    return {
      document: {
        pageStates: {
          [pageId]: {
            editingId: this.initialShape.id,
          },
        },
      },
    }
  }

  update = (data: Data, text: string) => {
    const { initialShape } = this
    const pageId = data.appState.currentPageId

    let nextShape: TextShape = {
      ...TLDR.getShape<TextShape>(data, initialShape.id, pageId),
      text,
    }

    nextShape = {
      ...nextShape,
      ...TLDR.getShapeUtils(nextShape).onStyleChange(nextShape),
    } as TextShape

    return {
      document: {
        pages: {
          [pageId]: {
            shapes: {
              [initialShape.id]: nextShape,
            },
          },
        },
      },
    }
  }

  cancel = (data: Data) => {
    const { initialShape } = this
    const pageId = data.appState.currentPageId

    return {
      document: {
        pages: {
          [pageId]: {
            shapes: {
              [initialShape.id]: TLDR.onSessionComplete(
                data,
                TLDR.getShape(data, initialShape.id, pageId),
                pageId
              ),
            },
          },
        },
        pageState: {
          [pageId]: {
            editingId: undefined,
          },
        },
      },
    }
  }

  complete(data: Data) {
    const { initialShape } = this
    const pageId = data.appState.currentPageId

    const shape = TLDR.getShape<TextShape>(data, initialShape.id, pageId)

    // TODO: Delete text shape if its content is empty
    // TODO: ...and prevent `isCreating` from selecting the deleted shape

    // if (initialShape.text.trim() === '' && shape.text.trim() === '') {
    //   // delete shape
    //   return {
    //     id: 'text',
    //     before: {
    //       document: {
    //         pages: {
    //           [pageId]: {
    //             shapes: {
    //               [initialShape.id]: undefined,
    //             },
    //           },
    //         },
    //         pageState: {
    //           [pageId]: {
    //             editingId: undefined,
    //             selectedIds: [initialShape.id],
    //           },
    //         },
    //       },
    //     },
    //     after: {
    //       document: {
    //         pages: {
    //           [pageId]: {
    //             shapes: {
    //               [initialShape.id]: undefined,
    //             },
    //           },
    //         },
    //         pageState: {
    //           [pageId]: {
    //             editingId: undefined,
    //             selectedIds: [],
    //           },
    //         },
    //       },
    //     },
    //   }
    // }

    if (shape.text === initialShape.text) return undefined

    return {
      id: 'text',
      before: {
        document: {
          pages: {
            [pageId]: {
              shapes: {
                [initialShape.id]: initialShape,
              },
            },
          },
          pageState: {
            [pageId]: {
              editingId: undefined,
            },
          },
        },
      },
      after: {
        document: {
          pages: {
            [pageId]: {
              shapes: {
                [initialShape.id]: TLDR.onSessionComplete(
                  data,
                  TLDR.getShape(data, initialShape.id, pageId),
                  pageId
                ),
              },
            },
          },
          pageState: {
            [pageId]: {
              editingId: undefined,
              selectedIds: [initialShape.id],
            },
          },
        },
      },
    }
  }
}
