import { ColorStyle, DashStyle, Data, SizeStyle } from '../../'

export const mockData: Data = {
  settings: {
    isPenMode: false,
    isDarkMode: false,
    isDebugMode: false,
    isReadonlyMode: false,
  },
  page: {
    id: 'page1',
    shapes: {
      rect1: {
        id: 'rect1',
        parentId: 'page1',
        name: 'Rectangle',
        childIndex: 0,
        type: 'rectangle',
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
        childIndex: 1,
        type: 'rectangle',
        point: [100, 100],
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
