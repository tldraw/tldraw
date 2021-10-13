import type {
  TLBinding,
  TLPage,
  TLPageState,
  TLPointerEventHandler,
  TLShapeChangeHandler,
} from '@tldraw/core'
import type { RectangleShape } from './box'
import type { LabelShape } from './label'
import { StateManager } from 'rko'

type Shapes = RectangleShape | LabelShape

interface State {
  page: TLPage<Shapes, TLBinding>
  pageState: TLPageState
  meta: {
    isDarkMode: boolean
  }
}

class AppState extends StateManager<State> {
  /* ----------------------- API ---------------------- */

  selectShape(shapeId: string) {
    this.patchState({
      pageState: {
        selectedIds: [shapeId],
      },
    })
  }

  deselect() {
    this.patchState({
      pageState: {
        selectedIds: [],
        editingId: undefined,
      },
    })
  }

  startEditingShape(shapeId: string) {
    this.patchState({
      pageState: {
        selectedIds: [shapeId],
        editingId: shapeId,
      },
    })
  }

  changeShapeText = (id: string, text: string) => {
    this.patchState({
      page: {
        shapes: {
          [id]: { text },
        },
      },
    })
  }

  /* --------------------- Events --------------------- */

  onPointCanvas: TLPointerEventHandler = (info) => {
    this.deselect()
  }

  onPointShape: TLPointerEventHandler = (info) => {
    this.selectShape(info.target)
  }

  onDoubleClickShape: TLPointerEventHandler = (info) => {
    this.startEditingShape(info.target)
  }

  onDoubleClickBounds: TLPointerEventHandler = (info) => {
    // Todo
  }

  onPointerDown: TLPointerEventHandler = (info) => {
    // Todo
  }

  onPointerUp: TLPointerEventHandler = (info) => {
    // Todo
  }

  onPointerMove: TLPointerEventHandler = (info) => {
    // Todo
  }

  onShapeChange: TLShapeChangeHandler<Shapes> = (shape) => {
    if (shape.type === 'rectangle' && shape.size) {
      this.patchState({
        page: {
          shapes: {
            [shape.id]: { ...shape, size: [...shape.size] },
          },
        },
      })
    }
  }
}

export const appState = new AppState({
  page: {
    id: 'page1',
    shapes: {
      rect1: {
        id: 'rect1',
        parentId: 'page1',
        name: 'Rectangle',
        childIndex: 1,
        type: 'rectangle',
        point: [0, 0],
        rotation: 0,
        size: [100, 100],
        text: 'Hello world!',
      },
      label1: {
        id: 'label1',
        parentId: 'page1',
        name: 'Label',
        childIndex: 2,
        type: 'label',
        point: [-200, -200],
        rotation: 0,
        text: 'My shape is stateful, I should still render while off screen!',
      },
      label2: {
        id: 'label2',
        parentId: 'page1',
        name: 'Label',
        childIndex: 2,
        type: 'label',
        point: [200, 200],
        rotation: 0,
        text: 'Hello world!',
      },
    },
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
  meta: {
    isDarkMode: false,
  },
})
