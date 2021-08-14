import { TLDrawDocument, ColorStyle, DashStyle, SizeStyle, TLDrawShapeType } from '~types'

export const mockDocument: TLDrawDocument = {
  id: 'doc',
  pages: {
    page1: {
      id: 'page1',
      shapes: {
        rect1: {
          id: 'rect1',
          parentId: 'page1',
          name: 'Rectangle',
          childIndex: 1,
          type: TLDrawShapeType.Rectangle,
          point: [0, 0],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue,
          },
        },
        rect2: {
          id: 'rect2',
          parentId: 'page1',
          name: 'Rectangle',
          childIndex: 2,
          type: TLDrawShapeType.Rectangle,
          point: [100, 100],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue,
          },
        },
        rect3: {
          id: 'rect3',
          parentId: 'page1',
          name: 'Rectangle',
          childIndex: 3,
          type: TLDrawShapeType.Rectangle,
          point: [20, 20],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue,
          },
        },
      },
      bindings: {},
    },
  },
  pageStates: {
    page1: {
      id: 'page1',
      selectedIds: [],
      currentParentId: 'page1',
      camera: {
        point: [0, 0],
        zoom: 1,
      },
    },
  },
}
