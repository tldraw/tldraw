import { current } from 'immer'
import { nanoid } from 'nanoid'
import type { Action, AppData } from 'state/constants'
import { mutables } from 'state/mutables'

export const loadNewDocument: Action = (data) => {
  const newData: AppData = {
    ...data,
    id: nanoid(),
    page: {
      id: 'page1',
      shapes: {},
      bindings: {},
    },
    pageState: {
      id: 'page1',
      camera: {
        point: [0, 0],
        zoom: 1,
      },
      selectedIds: [],
      brush: null,
      pointedId: null,
      hoveredId: null,
      editingId: null,
      bindingId: null,
    },
    overlays: {
      snapLines: [],
    },
  }

  Object.assign(data, newData)

  const snapshot = current(data)

  mutables.history.reset(snapshot)

  Object.assign(mutables, {
    snapshot,
    initialPoint: [0, 0],
    isCloning: false,
    pointedShapeId: undefined,
    pointedHandleId: undefined,
    pointedBoundsHandleId: undefined,
    initialCommonBounds: undefined,
    snapInfo: undefined,
  })
}
