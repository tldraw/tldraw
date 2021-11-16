import { TldrawDocument, TldrawApp } from '@tldraw/Tldraw'

export const defaultDocument: TldrawDocument = {
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
