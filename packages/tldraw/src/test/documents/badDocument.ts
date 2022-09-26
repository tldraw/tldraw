import { ColorStyle, DashStyle, SizeStyle, TDDocument, TDShapeType } from '~types'

export const badDocument: TDDocument = {
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
          parentId: 'MISSING_PARENT',
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
        group1: {
          id: 'group1',
          parentId: 'page1',
          name: 'Group',
          childIndex: 3,
          type: TDShapeType.Group,
          point: [20, 20],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue,
          },
          children: ['MISSING_CHILD'],
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
