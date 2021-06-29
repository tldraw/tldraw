import { Data, Shape } from 'types'
import BaseSession from './base-session'
import commands from 'state/commands'
import { getShapeUtils } from 'state/shape-utils'
import tld from 'utils/tld'
import { deepClone } from 'utils'

export default class EditSession extends BaseSession {
  snapshot: EditSnapshot

  constructor(data: Data) {
    super(data)
    this.snapshot = getEditSnapshot(data)
  }

  update(data: Data, change: Partial<Shape>): void {
    const initialShape = this.snapshot.initialShape
    const shape = tld.getShape(data, initialShape.id)
    const utils = getShapeUtils(shape)
    Object.entries(change).forEach(([key, value]) => {
      utils.setProperty(shape, key as keyof Shape, value as Shape[keyof Shape])
    })
  }

  cancel(data: Data): void {
    const initialShape = this.snapshot.initialShape
    const page = tld.getPage(data)
    page.shapes[initialShape.id] = initialShape
  }

  complete(data: Data): void {
    commands.edit(data, this.snapshot, getEditSnapshot(data))
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getEditSnapshot(data: Data) {
  const initialShape = deepClone(tld.getSelectedShapes(data)[0])

  return {
    currentPageId: data.currentPageId,
    initialShape,
  }
}

export type EditSnapshot = ReturnType<typeof getEditSnapshot>
