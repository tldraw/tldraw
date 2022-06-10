import { TDDocument, TldrawApp } from '@tldraw/tldraw'
import { GRID_SIZE } from '@tldraw/tldraw/src/constants'

export const defaultDocument: TDDocument = {
  id: 'doc',
  name: 'New Document',
  version: TldrawApp.version,
  pages: {
    page: {
      id: 'page',
      name: 'Page 1',
      childIndex: 1,
      shapes: {},
      bindings: {},
      gridSize: GRID_SIZE,
    },
  },
  pageStates: {
    page: {
      id: 'page',
      selectedIds: [],
      camera: {
        point: [0, 0],
        zoom: 1,
      },
    },
  },
}
