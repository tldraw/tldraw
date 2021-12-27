import { TDDocument, ColorStyle, DashStyle, SizeStyle, TDShapeType } from '~types'

export const mockDocument: TDDocument = {
  version: 0,
  id: 'doc',
  name: 'New Document',
  pages: {
    page1: {
      id: 'page1',
      shapes: {
        rect1: {
          id: 'rect1',
          parentId: 'page1',
          name: 'Rectangle',
          childIndex: 1,
          type: TDShapeType.Rectangle,
          point: [0, 0],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue,
          },
          label: '',
        },
        rect2: {
          id: 'rect2',
          parentId: 'page1',
          name: 'Rectangle',
          childIndex: 2,
          type: TDShapeType.Rectangle,
          point: [100, 100],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue,
          },
          label: '',
          labelPoint: [0.5, 0.5],
        },
        rect3: {
          id: 'rect3',
          parentId: 'page1',
          name: 'Rectangle',
          childIndex: 3,
          type: TDShapeType.Rectangle,
          point: [20, 20],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue,
          },
          label: '',
          labelPoint: [0.5, 0.5],
        },
      },
      bindings: {},
    },
  },
  pageStates: {
    page1: {
      id: 'page1',
      selectedIds: [],
      camera: {
        point: [0, 0],
        zoom: 1,
      },
    },
  },
  assets: {},
}
