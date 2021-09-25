import type {
  TLBinding,
  TLPage,
  TLPageState,
  TLPointerEventHandler,
  TLShapeChangeHandler,
} from '@tldraw/core'
import { ShapeUtil } from '@tldraw/core'
import { Article, ArticleShape } from './article'
import { Rectangle, RectangleShape } from './rectangle'
import { Label, LabelShape } from './label'
import { StateManager } from 'rko'

const shapeUtils: Record<string, any> = {
  rectangle: Rectangle,
  label: Label,
  article: Article,
}

type Shape = RectangleShape | LabelShape | ArticleShape

interface State {
  page: TLPage<Shape, TLBinding>
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

  /**
   * Manually create shapes on the page.
   * @param shapes An array of shape partials, containing the initial props for the shapes.
   * @command
   */
  createShapes = (...shapes: ({ id: string; type: Shape['type'] } & Partial<Shape>)[]): this => {
    if (shapes.length === 0) return this
    return this.create(
      ...shapes.map((shape) => {
        return shapeUtils[shape.type].create({
          ...shape,
          parentId: shape.parentId || this.state.page.id,
        })
      })
    )
  }

  /**
   * Manually update a set of shapes.
   * @param shapes An array of shape partials, containing the changes to be made to each shape.
   * @command
   */
  updateShapes = (...shapes: ({ id: string } & Partial<Shape>)[]): this => {
    const pageShapes = this.state.page.shapes
    const shapesToUpdate = shapes.filter((shape) => pageShapes[shape.id])
    if (shapesToUpdate.length === 0) return this
    return this.setState(
      Commands.update(this.state, shapesToUpdate, this.state.page.id),
      'updated_shapes'
    )
  }

  /**
   * Create one or more shapes.
   * @param shapes An array of shapes.
   * @command
   */
  create = (...shapes: TLDrawShape[]): this => {
    if (shapes.length === 0) return this
    return this.setState(Commands.create(this.state, shapes))
  }

  /* --------------------- Events --------------------- */

  onPointCanvas: TLPointerEventHandler = (info) => {
    if (this.state.pageState.selectedIds.length > 0) {
      this.deselect()
    } else {
      if (info.shiftKey) {
        this.create
      }
    }
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
