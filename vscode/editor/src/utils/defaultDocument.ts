import { TLDrawDocument, TLDrawApp } from '@tldraw/tldraw'

export const defaultDocument: TLDrawDocument = {
  id: 'doc',
  name: 'New Document',
  version: TLDrawApp.version,
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
