import type { Shape } from 'shapes'
import type { Action } from 'state/constants'

export const updateShapes: Action = (
  data,
  payload: { shapes: (Partial<Shape> & Pick<Shape, 'id'>)[] }
) => {
  try {
    payload.shapes.forEach((partial) => {
      Object.assign(data.page.shapes[partial.id], partial)
    })
  } catch (e: any) {
    e.message = 'Could not update shapes: ' + e.message
    console.error(e)
  }
}
