import type { TLBinding, TLPage, TLPageState, TLShape } from '+types'

interface BoxShape extends TLShape {
  size: number[]
}

export const mockDocument: { page: TLPage<BoxShape, TLBinding>; pageState: TLPageState } = {
  page: {
    id: 'page1',
    shapes: {},
    bindings: {},
  },
  pageState: {
    id: 'page1',
    selectedIds: [],
    currentParentId: 'page1',
    camera: {
      point: [0, 0],
      zoom: 1,
    },
  },
}
