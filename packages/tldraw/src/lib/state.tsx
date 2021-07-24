import { createState, createSelectorHook } from '@state-designer/react'
import {
  Bounds,
  TLBinding,
  TLPage,
  TLPageState,
  TLShapeUtils,
  Utils,
  Vec,
  TLDocument,
  TLSettings,
  TLShape,
} from '@tldraw/core'

import { rectangle, RectangleShape, ellipse, EllipseShape } from './shapes'

export type TLDrawShapes = RectangleShape | EllipseShape

export interface TLDrawData<T extends TLShape> {
  settings: TLSettings
  currentPageId: string
  currentParentId: string
  page: TLPage<T>
  pageState: TLPageState
}

const tldrawShapeUtils: TLShapeUtils<TLDrawShapes> = {
  rectangle,
  ellipse,
}

/*
The State Manager class is a wrapper around a state-designer state. It provides utilities for accessing
parts of the state, both privately for internal use and publically for external use. The singleton intance
is shared in the renderer's `onMount` callback.
*/

export class TLDrawState<T extends TLDrawShapes> {
  shapeUtils: TLShapeUtils<T>
  currentPageId: string
  pages: Record<string, TLPage<T>> = {}
  pageStates: Record<string, TLPageState> = {}

  _state = createState({
    data: {
      settings: {
        isPenMode: false,
        isDarkMode: false,
        isDebugMode: false,
        isReadonlyMode: false,
      },
      currentPageId: 'page',
      currentParentId: 'page',
      page: {
        id: 'page',
        shapes: {},
        bindings: {},
      },
      pageState: {
        id: 'page',
        selectedIds: [],
        currentParentId: 'page',
        camera: {
          point: [0, 0],
          zoom: 1,
        },
      },
    } as TLDrawData<T>,
    initial: 'ready',
    states: {
      loading: {},
      ready: {
        on: {},
      },
    },
    actions: {
      panCamera: (data, payload: { delta: number[] }) => {
        const { camera } = this.getPageState(data)

        camera.point = Vec.sub(
          camera.point,
          Vec.div(Vec.div(payload.delta, camera.zoom), camera.zoom)
        )
      },
      pinchCamera: (
        data,
        payload: { delta: number[]; origin: number[]; distanceDelta: number }
      ) => {
        const camera = this.getCurrentCamera(data)

        camera.point = Vec.sub(
          camera.point,
          Vec.div(payload.delta, camera.zoom)
        )

        const next = camera.zoom - (payload.distanceDelta / 300) * camera.zoom

        const p0 = this.screenToWorld(data, payload.origin)
        camera.zoom = this.getCameraZoom(next)
        console.log(camera.zoom)
        const p1 = this.screenToWorld(data, payload.origin)
        camera.point = Vec.add(camera.point, Vec.sub(p1, p0))
      },
    },
  })

  constructor(shapeUtils: TLShapeUtils<T>) {
    this.currentPageId = Object.keys(this.pages)[0]
    this.shapeUtils = shapeUtils
  }

  updateFromDocument(document: TLDocument<T>) {
    const { currentPageId, pages, pageStates } = document
    this.pages = pages
    this.pageStates = pageStates
    this.currentPageId = currentPageId

    this.forceUpdate({
      page: pages[currentPageId],
      pageState: pageStates[currentPageId],
    })
  }

  updatePageState(pageState: TLPageState) {
    this.forceUpdate({ pageState })
  }

  updatePage(page: TLPage<T>) {
    if (page.id === this.currentPageId) {
      this.forceUpdate({ page })
    }
  }

  forceUpdate(data: Partial<TLDrawData<T>>) {
    this._state.forceData({ ...this.data, ...data })
  }

  fastPan = (delta: number[]) => {
    const { point, zoom } = this.getCurrentCamera(this.data)

    const nextPoint = Vec.sub(point, Vec.div(delta, zoom))

    this.updatePageState({
      ...this.data.pageState,
      camera: {
        zoom,
        point: nextPoint,
      },
    })

    // Send along the event just to be sure
    this.send('PANNED_CAMERA', { delta })
  }

  fastPinch = (origin: number[], delta: number[], distanceDelta: number) => {
    const {
      camera: { point, zoom },
    } = this.data.pageState

    let nextPoint = Vec.sub(point, Vec.div(delta, zoom))

    const nextZoom = this.getCameraZoom(zoom - (distanceDelta / 300) * zoom)

    const p0 = Vec.sub(Vec.div(origin, zoom), point)
    const p1 = Vec.sub(Vec.div(origin, nextZoom), point)

    nextPoint = Vec.add(point, Vec.sub(p1, p0))

    this.updatePageState({
      ...this.data.pageState,
      camera: {
        point: nextPoint,
        zoom: nextZoom,
      },
    })

    // Send along the event just to be sure
    this.send('PINCHED_CAMERA', { origin, delta, distanceDelta })
  }

  /* -------------------------------------------------- */
  /*                       Private                      */
  /* -------------------------------------------------- */

  getShapeUtils(shape: T) {
    return this.shapeUtils[shape.type as T['type']]
  }

  screenToWorld(data: TLDrawData<T>, point: number[]) {
    const { camera } = data.pageState

    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }

  getViewport(data: TLDrawData<T>): Bounds {
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

  getCurrentCamera(data: TLDrawData<T>) {
    return data.pageState.camera
  }

  getPage(data: TLDrawData<T>) {
    return data.page
  }

  getPageState(data: TLDrawData<T>) {
    return data.pageState
  }

  getSelectedIds(data: TLDrawData<T>) {
    return data.pageState.selectedIds
  }

  getShapes(data: TLDrawData<T>) {
    return data.page.shapes
  }

  getCamera(data: TLDrawData<T>) {
    return data.pageState.camera
  }

  getShape(data: TLDrawData<T>, shapeId: string) {
    return data.page.shapes[shapeId]
  }

  getBinding(data: TLDrawData<T>, id: string): TLBinding {
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

const state = new TLDrawState<TLDrawShapes>(tldrawShapeUtils)

export const useSelector = createSelectorHook(state.state)

export default state
