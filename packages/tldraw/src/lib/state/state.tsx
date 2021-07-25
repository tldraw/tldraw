import { createState, createSelectorHook } from '@state-designer/react'
import {
  TLBounds,
  TLBinding,
  TLPage,
  TLPageState,
  TLShapeUtils,
  Utils,
  Vec,
  TLPointerInfo,
} from '@tldraw/core'
import { Data, TLDrawDocument } from '../types'
import {
  TLDrawShape,
  TLDrawShapeUtils,
  tldrawShapeUtils,
  getShapeUtils,
} from './shapes'
import { commands } from './commands'
import { HistoryManager } from './history'
import { SessionManager } from './session'
import * as Sessions from './sessions'

/*
The State Manager class is a wrapper around a state-designer state. It provides utilities for accessing
parts of the state, both privately for internal use and publically for external use. The singleton intance
is shared in the renderer's `onMount` callback.
*/

export class TLDrawState {
  shapeUtils: TLShapeUtils<TLDrawShape>
  currentPageId: string
  pages: Record<string, TLPage<TLDrawShape>> = {}
  pageStates: Record<string, TLPageState> = {}

  session = new SessionManager()
  history = new HistoryManager(() => null)

  _state = createState({
    data: {
      settings: {
        isPenMode: false,
        isDarkMode: false,
        isDebugMode: false,
        isReadonlyMode: false,
      },
      currentPageId: 'page',
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
    } as Data,
    initial: 'ready',
    states: {
      loading: {},
      ready: {
        on: {},
        states: {
          tool: {
            initial: 'select',
            states: {
              select: {
                on: {},
                initial: 'notPointing',
                states: {
                  notPointing: {
                    on: {
                      POINTED_CANVAS: {
                        to: 'brushSelecting',
                        do: 'setCurrentParentIdToPage',
                      },
                    },
                  },
                  brushSelecting: {
                    onExit: 'completeSession',
                    onEnter: [
                      {
                        unless: ['isPressingMetaKey', 'isPressingShiftKey'],
                        do: 'clearSelectedIds',
                      },
                      'clearBoundsRotation',
                      'startBrushSession',
                    ],
                    on: {
                      MOVED_POINTER: {
                        if: 'isSimulating',
                        do: 'updateBrushSession',
                      },
                      PANNED_CAMERA: {
                        if: 'isSimulating',
                        do: 'updateBrushSession',
                      },
                      STOPPED_POINTING: { to: 'notPointing' },
                      STARTED_PINCHING: { to: 'pinching' },
                      CANCELLED: { do: 'cancelSession', to: 'notPointing' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    conditions: {
      isPressingMetaKey(data, payload: TLPointerInfo) {
        return payload.metaKey
      },
      isPressingShiftKey(data, payload: TLPointerInfo) {
        return payload.shiftKey
      },
      isSimulating() {
        return false
      },
    },
    actions: {
      /* -------------------- Sessions -------------------- */

      breakSession: (data) => {
        this.session.cancel(this, data)
        this.history.disable()
        // commands.deleteShapes(data, this.getSelectedShapes(data))
        this.history.enable()
      },
      cancelSession: (data) => {
        this.session.cancel(this, data)
      },
      completeSession: (data) => {
        this.session.complete(this, data)
      },
      startBrushSession: (data, payload: TLPointerInfo) => {
        this.session.begin(
          new Sessions.BrushSession(
            this,
            data,
            this.screenToWorld(data, payload.point)
          )
        )
      },
      updateBrushSession: (data, payload: TLPointerInfo) => {
        this.session.update<Sessions.BrushSession>(
          this,
          data,
          this.screenToWorld(data, payload.point)
        )
      },

      /* ------------------- Page State ------------------- */

      setHoveredId(data, payload: TLPointerInfo) {
        const { pageState } = data
        pageState.hoveredId = payload.target
      },
      clearHoveredId(data) {
        const { pageState } = data
        pageState.hoveredId = undefined
      },
      clearBoundsRotation(data) {
        delete data.pageState.boundsRotation
      },
      clearSelectedIds: (data) => {
        this.setSelectedIds(data, [])
      },

      setPointedId: (data, payload: TLPointerInfo) => {
        const { pageState } = data
        pageState.pointedId = this.getPointedId(data, payload.target)
        pageState.currentParentId = this.getParentId(data, pageState.pointedId)
      },
      setCurrentParentIdToPage(data) {
        data.pageState.currentParentId = data.page.id
      },
      // Camera
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

  constructor(shapeUtils: TLDrawShapeUtils) {
    this.currentPageId = Object.keys(this.pages)[0]
    this.shapeUtils = shapeUtils

    this._state.onUpdate((s) => {
      const pageId = s.data.page.id
      this.pages[pageId] = s.data.page
      this.pageStates[pageId] = s.data.pageState
      // TODO: Save page state to local storage.
    })
  }

  updateFromDocument(document: TLDrawDocument) {
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

  updatePage(page: TLPage<TLDrawShape>) {
    if (page.id === this.currentPageId) {
      this.forceUpdate({ page })
    }
  }

  forceUpdate(data: Partial<Data>) {
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

  fastBrush(info: TLPointerInfo) {
    const data = { ...this.data }

    this.session.update<Sessions.BrushSession>(
      this,
      data,
      this.screenToWorld(data, info.point)
    )

    this.updatePageState({
      ...data.pageState,
    })

    // Send along the event just to be sure
    this.send('MOVED_POINTER', info)
  }

  /* -------------------------------------------------- */
  /*                       Private                      */
  /* -------------------------------------------------- */

  getParentId(data: Data, id: string) {
    const shape = data.page.shapes[id]
    return shape.parentId
  }

  getPointedId(data: Data, id: string): string {
    const shape = data.page.shapes[id]
    if (!shape) return id

    return shape.parentId === data.pageState.currentParentId ||
      shape.parentId === data.page.id
      ? id
      : this.getPointedId(data, shape.parentId)
  }

  getDrilledPointedId(data: Data, id: string): string {
    const shape = data.page.shapes[id]
    const { currentParentId, pointedId } = data.pageState

    return shape.parentId === data.page.id ||
      shape.parentId === pointedId ||
      shape.parentId === currentParentId
      ? id
      : this.getDrilledPointedId(data, shape.parentId)
  }

  getTopParentId(data: Data, id: string): string {
    const shape = data.page.shapes[id]

    if (shape.parentId === shape.id) {
      console.error(`Shape has the same id as its parent! ${shape.id}`)
      return shape.parentId
    }

    return shape.parentId === data.page.id ||
      shape.parentId === data.pageState.currentParentId
      ? id
      : this.getTopParentId(data, shape.parentId)
  }

  getShapeUtils(shape: TLDrawShape) {
    return getShapeUtils(shape)
  }

  getSelectedShapes(data: Data) {
    return data.pageState.selectedIds.map((id) => data.page.shapes[id])
  }

  screenToWorld(data: Data, point: number[]) {
    const { camera } = data.pageState

    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }

  getViewport(data: Data): TLBounds {
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

  getCurrentCamera(data: Data) {
    return data.pageState.camera
  }

  getPage(data: Data) {
    return data.page
  }

  getPageState(data: Data) {
    return data.pageState
  }

  getSelectedIds(data: Data) {
    return data.pageState.selectedIds
  }

  setSelectedIds(data: Data, ids: string[]) {
    data.pageState.selectedIds = ids
  }

  clearSelectedIds(data: Data) {
    this.setSelectedIds(data, [])
  }

  getShapes(data: Data) {
    return Object.values(data.page.shapes)
  }

  getCamera(data: Data) {
    return data.pageState.camera
  }

  getShape(data: Data, shapeId: string) {
    return data.page.shapes[shapeId]
  }

  getBinding(data: Data, id: string): TLBinding {
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

export const state = new TLDrawState(tldrawShapeUtils)

export const useSelector = createSelectorHook(state.state)
