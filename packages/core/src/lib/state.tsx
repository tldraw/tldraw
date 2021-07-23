import { createState, createSelectorHook } from '@state-designer/react'
import { BaseShape } from './shape'
import {
  Bounds,
  Data,
  ShapeTreeNode,
  TLBinding,
  TLPage,
  TLPageState,
  TLSettings,
  TLShape,
  TLShapes,
} from './types'
import { Utils, Vec } from './utils'

export const shakeyState = {} as {
  state: TLState<TLShape>
}

/*
The State Manager class is a wrapper around a state-designer state. It provides utilities for accessing
parts of the state, both privately for internal use and publically for external use. The singleton intance
is shared in the renderer's `onMount` callback.
*/

export class TLState<T extends TLShape> {
  shapeUtils: TLShapes<T> = {}

  _state = createState({
    data: {
      settings: {
        isPenMode: false,
        isDarkMode: false,
        isDebugMode: false,
        isReadonlyMode: false,
      },
      pointedId: undefined,
      hoveredId: undefined,
      editingId: undefined,
      editingBindingId: undefined,
      currentParentId: 'page',
      page: {
        id: 'page',
        shapes: {},
        bindings: {},
      },
      pageState: {
        id: 'page',
        selectedIds: [],
        camera: {
          point: [0, 0],
          zoom: 1,
        },
      },
    } as Data<T>,
    states: {
      loading: {},
      ready: {
        on: {
          PANNED_CAMERA: 'panCamera',
          PINCHED_CAMERA: 'pinchCamera',
        },
      },
    },
    actions: {
      panCamera: (data, payload: { delta: number[] }) => {
        const camera = data.pageState.camera
        camera.point = Vec.sub(
          camera.point,
          Vec.div(payload.delta, camera.zoom)
        )
      },
      pinchCamera: (
        data,
        payload: {
          delta: number[]
          distanceDelta: number
          angleDelta: number
          point: number[]
        }
      ) => {
        const camera = data.pageState.camera

        camera.point = Vec.sub(
          camera.point,
          Vec.div(payload.delta, camera.zoom)
        )

        const next = camera.zoom - (payload.distanceDelta / 300) * camera.zoom

        const p0 = this.screenToWorld(data, payload.point)

        camera.zoom = this.getCameraZoom(next)

        const p1 = this.screenToWorld(data, payload.point)

        camera.point = Vec.add(camera.point, Vec.sub(p1, p0))

        this.updateZoomCSS()
      },
    },
    values: {
      shapesToRender: (data) => {
        const viewport = this.getViewport(data)

        const page = this.getPage(data)

        const shapesToShow = Object.values(page.shapes).filter((shape) => {
          if (shape.parentId !== page.id) return false

          const shapeBounds = this.getShapeUtils(shape).getBounds(shape)

          return (
            // shapeUtils.alwaysRender? (for lines, rays, etc)
            Utils.boundsContain(viewport, shapeBounds) ||
            Utils.boundsCollide(viewport, shapeBounds)
          )
        })

        // Populate the shape tree
        const tree: ShapeTreeNode[] = []

        const selectedIds = this.getSelectedIds(data)

        shapesToShow
          .sort((a, b) => a.childIndex - b.childIndex)
          .forEach((shape) =>
            this.addToShapeTree(data, selectedIds, tree, shape)
          )

        return tree
      },
    },
  })

  constructor(
    shapes: Record<string, BaseShape<T>>,
    page: TLPage<T>,
    pageState: TLPageState,
    settings: TLSettings
  ) {
    this.shapeUtils = shapes
    this._state.forceData({
      ...this.data,
      page,
      pageState,
      settings: { ...this.data.settings, ...settings },
    })

    shakeyState.state = this as TLState<any>
  }

  update(page: TLPage<T>, pageState: TLPageState) {
    this._state.forceData({ ...this.data, page, pageState })
  }

  forceUpdate(data: Partial<Data<T>>) {
    this.state.forceData({ ...this.data, ...data })
  }

  /* -------------------------------------------------- */
  /*                       Private                      */
  /* -------------------------------------------------- */

  getShapeUtils<S extends T>(shape: S) {
    return this.shapeUtils[shape.type]
  }

  screenToWorld(data: Data<T>, point: number[]) {
    const { camera } = data.pageState

    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }

  getViewport(data: Data<T>): Bounds {
    const [minX, minY] = this.screenToWorld(data, [0, 0])
    const [maxX, maxY] = this.screenToWorld(data, [
      window.innerWidth,
      window.innerHeight,
    ])

    return {
      minX,
      minY,
      maxX,
      maxY,
      height: maxX - minX,
      width: maxY - minY,
    }
  }

  getCameraZoom(zoom: number) {
    return Utils.clamp(zoom, 0.1, 5)
  }

  getCurrentCamera(data: Data<T>) {
    return data.pageState.camera
  }

  getPage(data: Data<T>) {
    return data.page
  }

  getPageState(data: Data<T>) {
    return data.pageState
  }

  getSelectedIds(data: Data<T>) {
    return data.pageState.selectedIds
  }

  getShapes(data: Data<T>) {
    return data.page.shapes
  }

  getCamera(data: Data<T>) {
    return data.pageState.camera
  }

  getShape(data: Data<T>, shapeId: string) {
    return data.page.shapes[shapeId]
  }

  updateZoomCSS() {
    document.documentElement.style.setProperty(
      '--camera-zoom',
      this.camera.toString()
    )
  }

  getBinding(data: Data<T>, id: string): TLBinding<T> {
    return this.getPage(data).bindings[id]
  }

  addToShapeTree(
    data: Data<T>,
    selectedIds: string[],
    branch: ShapeTreeNode[],
    shape: TLShape
  ) {
    const node = {
      shape,
      children: [],
      isHovered: data.hoveredId === shape.id,
      isCurrentParent: data.currentParentId === shape.id,
      isEditing: data.editingId === shape.id,
      isBinding: data.editingBindingId
        ? this.getBinding(data, data.editingBindingId)?.toId === shape.id
        : false,
      isDarkMode: data.settings.isDarkMode,
      isSelected: selectedIds.includes(shape.id),
    }

    branch.push(node)

    if (shape.children) {
      shape.children
        .map((id) => this.getShape(data, id))
        .sort((a, b) => a.childIndex - b.childIndex)
        .forEach((childShape) => {
          this.addToShapeTree(data, selectedIds, node.children, childShape)
        })
    }
  }

  /* -------------------------------------------------- */
  /*                       Public                       */
  /* -------------------------------------------------- */

  /* -------------------- Accessors ------------------- */
  // Note that the "data" here will be the stable data in state, not the current "draft".

  get state() {
    return this._state
  }

  get data() {
    return this.state.data
  }

  get page() {
    return this.data.page
  }

  get pageState() {
    return this.data.pageState
  }

  get selectedIds() {
    return this.pageState.selectedIds
  }

  get shapes() {
    return this.page.shapes
  }

  get camera() {
    return this.pageState.camera
  }

  /* -------- Reimplemenation of State Methods -------- */

  send(eventName: string, payload?: unknown) {
    this.state.send(eventName, payload)
    return this
  }

  isIn(...ids: string[]) {
    return this.state.isIn(...ids)
  }

  isInAny(...ids: string[]): boolean {
    return this.state.isInAny(...ids)
  }

  can(eventName: string, payload?: unknown) {
    return this.state.can(eventName, payload)
  }
}
