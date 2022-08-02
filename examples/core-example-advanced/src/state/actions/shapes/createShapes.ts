import { nanoid } from 'nanoid'
import { Shape, getShapeUtils } from 'shapes'
import type { Action } from 'state/constants'

export const createShapes: Action = (
  data,
  payload: { shapes: (Partial<Shape> & Pick<Shape, 'type'>)[] }
) => {
  try {
    payload.shapes.forEach((partial, i) => {
      const shape = getShapeUtils(partial.type).getShape({
        id: nanoid(),
        childIndex: Object.values(data.page.shapes).length,
        ...partial,
        parentId: 'page1',
      })

      data.page.shapes[shape.id] = shape
    })
  } catch (e: any) {
    e.message = 'Could not create shapes: ' + e.message
    console.error(e)
  }
}
