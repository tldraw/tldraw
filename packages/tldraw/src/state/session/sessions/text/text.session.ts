import type { TextShape } from '../../../../shape'
import type { Session } from '../../../state-types'
import type { Data } from '../../../state-types'
import { TLDR } from '../../../tldr'

export class TextSession implements Session {
  id = 'text'
  initialShape: TextShape

  constructor(data: Data, id?: string) {
    this.initialShape = TLDR.getShape(data, id || TLDR.getSelectedIds(data)[0])
  }

  start = (data: Data) => {
    return {
      ...data,
      pageState: {
        ...data.pageState,
        editingId: this.initialShape.id,
      },
    }
  }

  update = (data: Data, text: string): Data => {
    const {
      initialShape: { id },
    } = this

    let nextShape: TextShape = {
      ...(data.page.shapes[id] as TextShape),
      text,
    }

    nextShape = {
      ...nextShape,
      ...TLDR.getShapeUtils(nextShape).onStyleChange(nextShape),
    } as TextShape

    return {
      ...data,
      page: {
        ...data.page,
        shapes: {
          ...data.page.shapes,
          [id]: nextShape,
        },
      },
    }
  }

  cancel = (data: Data) => {
    const {
      initialShape: { id },
    } = this

    return {
      ...data,
      page: {
        ...data.page,
        shapes: {
          ...data.page.shapes,
          [id]: TLDR.onSessionComplete(data, data.page.shapes[id]),
        },
      },
      pageState: {
        ...data.pageState,
        editingId: undefined,
      },
    }
  }

  complete(data: Data) {
    const { initialShape } = this

    const shape = data.page.shapes[initialShape.id] as TextShape

    if (shape.text === initialShape.text) return data

    return {
      id: 'text',
      before: {
        page: {
          shapes: {
            [initialShape.id]: initialShape,
          },
        },
        pageState: {
          editingId: undefined,
        },
      },
      after: {
        page: {
          shapes: {
            [initialShape.id]: TLDR.onSessionComplete(
              data,
              data.page.shapes[initialShape.id]
            ),
          },
        },
        pageState: {
          editingId: undefined,
        },
      },
    }
  }
}
