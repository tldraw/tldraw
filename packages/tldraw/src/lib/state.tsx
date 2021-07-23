import { createState, createSelectorHook } from '@state-designer/react'
import {
  Bounds,
  Data,
  TLBinding,
  TLPage,
  TLPageState,
  TLShapes,
  Utils,
  Vec,
  TLDocument,
} from '@tldraw/core'

import { RectangleShape, EllipseShape } from './shapes'

export type BaseShapes = RectangleShape | EllipseShape

/*
The State Manager class is a wrapper around a state-designer state. It provides utilities for accessing
parts of the state, both privately for internal use and publically for external use. The singleton intance
is shared in the renderer's `onMount` callback.
*/

export class TldrawState<T extends BaseShapes> {
  shapeUtils: TLShapes<T> = {}
  currentPageId: string
  pages: Record<string, TLPage<T>> = {}
  pageStates: Record<string, TLPageState> = {}

  _state = createState({
    data: {
      currentPageId: 'page',
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
      },
    },
  })

  constructor() {
    this.currentPageId = Object.keys(this.pages)[0]
  }

  updateFromDocument(document: TLDocument<T>) {
    const { currentPageId, pages, pageStates } = document
    this.pages = pages
    this.pageStates = pageStates
    this.currentPageId = currentPageId
    this.state.forceData({
      ...this.data,
      page: pages[currentPageId],
      pageState: pageStates[currentPageId],
    })
  }

  update(page: TLPage<T>, pageState: TLPageState) {
    if (page.id === this.currentPageId) {
      this._state.forceData({ ...this.data, page, pageState })
    }
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

  getBinding(data: Data<T>, id: string): TLBinding<T> {
    return this.getPage(data).bindings[id]
  }

  /* -------------------------------------------------- */
  /*                       Public                       */
  /* -------------------------------------------------- */

  /* -------- Reimplemenation of State Methods -------- */

  get state() {
    return this._state
  }

  get data() {
    return this.state.data
  }

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

const state = new TldrawState()

export const useSelector = createSelectorHook(state.state)

export default state
