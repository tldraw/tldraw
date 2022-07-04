import { TDDocument, TldrawApp } from '@tldraw/tldraw'

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
    },
  },
  assets: {},
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
