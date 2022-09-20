import { nanoid } from 'nanoid'
import type { Action } from 'state/constants'

export const paste: Action = (data) => {
  const selectedShapes = Object.values(data.page.shapes).filter((shape) => shape.isCopied)

  const newShapes = selectedShapes.map((s) => ({ ...s, id: nanoid() }))

  for (const shape of newShapes) {
    data.page.shapes[shape.id] = shape
  }
  data.pageState.selectedIds = newShapes.map((ns) => ns.id)
}
