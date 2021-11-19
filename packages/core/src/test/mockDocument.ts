import type { BoxShape } from '~TLShapeUtil/TLShapeUtil.spec'
import type { TLBinding, TLPage, TLPageState } from '~types'

export const mockDocument: { page: TLPage<BoxShape, TLBinding>; pageState: TLPageState } = {
  page: {
    id: 'page1',
    shapes: {},
    bindings: {},
  },
  pageState: {
    id: 'page1',
    selectedIds: [],
    camera: {
      point: [0, 0],
      zoom: 1,
    },
  },
}
