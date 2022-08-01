import type { S } from '@state-designer/react'
import type { TLBinding, TLPage, TLPageState, TLPerformanceMode, TLSnapLine } from '@tldraw/core'
import type { Shape } from 'shapes'

export const VERSION = 1
export const PERSIST_DATA = true
export const FIT_TO_SCREEN_PADDING = 100
export const BINDING_PADDING = 12
export const SNAP_DISTANCE = 5

export interface CustomBinding extends TLBinding {
  handleId: 'start' | 'end'
}

export const INITIAL_PAGE: TLPage<Shape, CustomBinding> = {
  id: 'page1',
  shapes: {
    box1: {
      id: 'box1',
      type: 'box',
      parentId: 'page1',
      name: 'Box',
      childIndex: 1,
      point: [100, 100],
      size: [100, 100],
    },
    box2: {
      id: 'box2',
      type: 'box',
      parentId: 'page1',
      name: 'Box',
      childIndex: 2,
      point: [250, 200],
      size: [100, 100],
    },
    box3: {
      id: 'box3',
      type: 'box',
      parentId: 'page1',
      name: 'Box',
      childIndex: 3,
      point: [150, 400],
      size: [100, 100],
    },
    arrow1: {
      id: 'arrow1',
      type: 'arrow',
      parentId: 'page1',
      name: 'Arrow',
      childIndex: 3,
      point: [231, 312],
      handles: {
        start: {
          id: 'start',
          index: 1,
          point: [38, 0],
        },
        end: {
          id: 'end',
          index: 2,
          point: [0, 76],
        },
      },
    },
  },
  bindings: {
    binding1: {
      id: 'binding1',
      fromId: 'arrow1',
      toId: 'box2',
      handleId: 'start',
    },
    binding2: {
      id: 'binding2',
      fromId: 'arrow1',
      toId: 'box3',
      handleId: 'end',
    },
  },
}

export const INITIAL_PAGE_STATE: TLPageState = {
  id: 'page1',
  selectedIds: [],
  camera: {
    point: [0, 0],
    zoom: 1,
  },
  brush: null,
  pointedId: null,
  hoveredId: null,
  editingId: null,
  bindingId: null,
}

export const INITIAL_DATA = {
  id: 'myDocument',
  version: VERSION,
  page: INITIAL_PAGE,
  pageState: INITIAL_PAGE_STATE,
  overlays: {
    snapLines: [] as TLSnapLine[],
  },
  meta: {
    isDarkMode: false,
  },
  performanceMode: undefined as TLPerformanceMode | undefined,
}

export type AppDocument = {
  id: string
  page: TLPage<Shape>
}

export type AppData = typeof INITIAL_DATA

export type Action = S.Action<AppData>

export type Condition = S.Condition<AppData>
