/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
  brushUpdater,
  TLBoundsCorner,
  TLBoundsEdge,
  TLKeyboardInfo,
} from '@tldraw/core'
import { Data, TLDrawDocument } from '../types'
import { TLDrawShape, TLDrawShapeUtils, tldrawShapeUtils, getShapeUtils } from '../shapes'
import { HistoryManager } from './history-manager'
import { SessionManager } from './session-manager'
import * as Sessions from './sessions'
import { freeze } from 'immer'

export interface TLDrawCallbacks {
  onMount: (state: TLDrawState) => void
  onChange: (state: TLDrawState, type: 'camera' | 'command' | 'session' | 'undo' | 'redo' | 'load') => void
}

/*
The State Manager class is a wrapper around a state-designer state. It provides utilities for accessing
parts of the state, both privately for internal use and publically for external use. The singleton intance
is shared in the renderer's `onMount` callback.
*/

export class TLDrawState {
  isTestMode = false

  currentPageId: string

  pages: Record<string, TLPage<TLDrawShape>> = {}

  pageStates: Record<string, TLPageState> = {}

  shapeUtils: TLShapeUtils<TLDrawShape>

  callbacks: Partial<TLDrawCallbacks> = {}

  session = new SessionManager(() => {
    this.callbacks.onChange?.(this, 'session')
  })

  history = new HistoryManager(() => {
    this.callbacks.onChange?.(this, 'command')
  })

  constructor(shapeUtils: TLDrawShapeUtils) {
    this.currentPageId = Object.keys(this.pages)[0]
    this.shapeUtils = shapeUtils

    this._state.onUpdate((s) => {
      // When the state changes, store the change in this instance
      // Later, consider saving the page state to local storage.
      const pageId = s.data.page.id
      this.pages[pageId] = s.data.page
      this.pageStates[pageId] = s.data.pageState
    })
  }

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
        on: {
          DESELECTED_ALL: {
            unless: 'isInSession',
            do: 'deselectAll',
            to: 'select',
          },
          SELECTED_ALL: {
            unless: 'isInSession',
            do: 'selectAll',
            to: 'select',
          },
          UNDO: {
            unless: 'isInSession',
            do: 'undo',
          },
          REDO: {
            unless: 'isInSession',
            do: 'redo',
          },
        },
        initial: 'usingTool',
        states: {
          usingTool: {
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
                        do: 'clearCurrentParentId',
                      },
                      POINTED_BOUNDS_HANDLE: {
                        if: 'isPointingRotationHandle',
                        to: 'rotatingSelection',
                        else: { to: 'transformingSelection' },
                      },
                      POINTED_BOUNDS: [
                        {
                          if: 'isPressingMetaKey',
                          to: 'brushSelecting',
                        },
                        { to: 'pointingBounds' },
                      ],
                      POINTED_SHAPE: [
                        {
                          if: 'isPressingMetaKey',
                          to: 'brushSelecting',
                        },
                        'setPointedId',
                        {
                          if: 'isPointingBounds',
                          to: 'pointingBounds',
                        },
                        {
                          unless: 'isPointedShapeSelected',
                          then: {
                            if: 'isPressingShiftKey',
                            do: ['pushPointedIdToSelectedIds', 'clearPointedId'],
                            else: ['deselectAll', 'pushPointedIdToSelectedIds'],
                          },
                        },
                        {
                          to: 'pointingBounds',
                        },
                      ],
                      DOUBLE_POINTED_SHAPE: [
                        'setPointedId',
                        {
                          if: 'isPointedShapeSelected',
                          then: {
                            get: 'firstSelectedShape',
                            if: 'canEditSelectedShape',
                            do: 'setEditingId',
                            to: 'editingShape',
                          },
                        },
                        {
                          unless: 'isPressingShiftKey',
                          do: ['setCurrentParentId', 'deselectAll', 'pushPointedIdToSelectedIds'],
                          to: 'pointingBounds',
                        },
                      ],
                    },
                  },
                  pointingBounds: {
                    on: {
                      CANCELLED: { to: 'notPointing' },
                      STOPPED_POINTING_BOUNDS: [],
                      STOPPED_POINTING: [
                        {
                          if: 'isPointingBounds',
                          do: 'deselectAll',
                        },
                        {
                          if: 'isPressingShiftKey',
                          then: {
                            if: 'isPointedShapeSelected',
                            do: 'pullPointedIdFromSelectedIds',
                          },
                          else: {
                            if: 'isPointingShape',
                            do: ['deselectAll', 'setPointedId', 'pushPointedIdToSelectedIds'],
                          },
                        },
                        { to: 'notPointing' },
                      ],
                      MOVED_POINTER: {
                        unless: 'isInSession',
                        if: 'distanceImpliesDrag',
                        to: 'translatingSelection',
                      },
                    },
                  },
                  brushSelecting: {
                    onExit: 'completeSession',
                    onEnter: [
                      {
                        unless: ['isPressingMetaKey', 'isPressingShiftKey'],
                        do: 'deselectAll',
                      },
                      'clearBoundsRotation',
                      'startBrushSession',
                    ],
                    on: {
                      MOVED_POINTER: {
                        if: 'isTestMode',
                        do: 'updateBrushSession',
                      },
                      PANNED_CAMERA: {
                        do: 'updateBrushSession',
                      },
                      STOPPED_POINTING: {
                        do: 'endBrushSession',
                        to: 'notPointing',
                      },
                      CANCELLED: { do: 'cancelSession', to: 'notPointing' },
                    },
                  },
                  translatingSelection: {
                    onEnter: 'startTranslateSession',
                    onExit: 'completeSession',
                    on: {
                      STARTED_PINCHING: { to: 'pinching' },
                      MOVED_POINTER: {
                        ifAny: 'isTestMode',
                        do: 'updateTranslateSession',
                      },
                      PANNED_CAMERA: {
                        ifAny: 'isTestMode',
                        do: 'updateTranslateSession',
                      },
                      PRESSED_SHIFT_KEY: 'updateTranslateSession',
                      RELEASED_SHIFT_KEY: 'updateTranslateSession',
                      PRESSED_ALT_KEY: 'updateTranslateSession',
                      RELEASED_ALT_KEY: 'updateTranslateSession',
                      STOPPED_POINTING: { to: 'select' },
                      CANCELLED: { do: 'cancelSession', to: 'select' },
                    },
                  },
                  transformingSelection: {
                    onEnter: 'startTransformSession',
                    onExit: 'completeSession',
                    on: {
                      MOVED_POINTER: {
                        if: 'isTestMode',
                        do: 'updateTransformSession',
                      },
                      PANNED_CAMERA: {
                        if: 'isTestMode',
                        do: 'updateTransformSession',
                      },
                      PRESSED_KEY: 'updateTransformSession',
                      RELEASED_KEY: 'updateTransformSession',
                      STOPPED_POINTING: { to: 'notPointing' },
                      CANCELLED: { do: 'cancelSession', to: 'notPointing' },
                    },
                  },
                  rotatingSelection: {
                    on: {
                      STOPPED_POINTING: { to: 'notPointing' },
                      CANCELLED: { do: 'cancelSession', to: 'notPointing' },
                    },
                  },
                },
              },
            },
          },
          pinching: {
            on: {
              PINCHED_CAMERA: { if: 'isTestMode', do: 'pinchCamera' },
              STOPPED_PINCHING: { to: 'usingTool' },
            },
          },
        },
      },
    },
    results: {
      firstSelectedShape(data) {
        return data.page.shapes[data.pageState.selectedIds[0]]
      },
    },
    conditions: {
      isTestMode: () => {
        return this.isTestMode
      },
      isPressingMetaKey(data, payload: TLPointerInfo) {
        return payload.metaKey
      },
      isPressingShiftKey(data, payload: TLPointerInfo) {
        return payload.shiftKey
      },
      hasPointedTarget(data, payload: TLPointerInfo) {
        return payload.target !== undefined
      },
      isPointedShapeSelected(data) {
        if (!data.pageState.pointedId) return false
        return data.pageState.selectedIds.includes(data.pageState.pointedId)
      },
      isPointingBounds(data, payload: TLPointerInfo) {
        return data.pageState.selectedIds.length > 0 && payload.target === 'bounds'
      },
      isPointingCanvas(data, payload: TLPointerInfo) {
        return payload.target === 'canvas'
      },
      isPointingShape(data, payload: TLPointerInfo) {
        if (!payload.target) return false
        return payload.target !== 'canvas' && payload.target !== 'bounds'
      },
      isPointingRotationHandle(_data, payload: { target: TLBoundsEdge | TLBoundsCorner | 'rotate' }) {
        return payload.target === 'rotate'
      },
      distanceImpliesDrag(data, payload: TLPointerInfo) {
        return Vec.dist2(payload.origin, payload.point) > 8
      },
      isInSession: () => {
        return this.session.isInSession
      },
      canEditSelectedShape(data, payload, result: TLDrawShape) {
        if (!result) return false
        return getShapeUtils(result).canEdit && !result.isLocked
      },
    },
    actions: {
      /* -------------------- Settings -------------------- */
      toggleTestMode: (data) => {
        this.toggleTestMode()
      },

      /* -------------------- Sessions -------------------- */

      breakSession: (data) => {
        this.session.cancel(data)
        this.history.disable()
        // commands.deleteShapes(data, this.getSelectedShapes(data))
        this.history.enable()
      },
      cancelSession: (data) => {
        this.session.cancel(data)
      },
      completeSession: (data) => {
        this.session.complete(data)
      },

      // Translate Session
      startTranslateSession: (data, payload: TLPointerInfo) => {
        this.session.begin(new Sessions.TranslateSession(data, this.screenToWorld(data, payload.origin)))
      },
      updateTranslateSession: (data, payload: TLPointerInfo | TLKeyboardInfo) => {
        this.session.update<Sessions.TranslateSession>(
          data,
          this.screenToWorld(data, payload.point),
          payload.shiftKey,
          payload.altKey,
        )
      },

      // Transform Session

      startTransformSession: (data, payload: TLPointerInfo & { target: TLBoundsCorner | TLBoundsEdge }) => {
        const point = this.screenToWorld(data, payload.origin)

        this.session.begin(new Sessions.TransformSession(data, payload.target, point))
      },
      startDrawTransformSession: (data, payload: TLPointerInfo) => {
        this.session.begin(
          new Sessions.TransformSession(data, TLBoundsCorner.BottomRight, this.screenToWorld(data, payload.point)),
        )
      },
      updateTransformSession: (data, payload: TLPointerInfo) => {
        this.session.update<Sessions.TransformSession>(data, this.screenToWorld(data, payload.point), payload.shiftKey)
      },

      // Brush Session
      startBrushSession: (data, payload: TLPointerInfo) => {
        this.session.begin(new Sessions.BrushSession(data, this.screenToWorld(data, payload.point)))
      },
      updateBrushSession: (data, payload: TLPointerInfo | TLKeyboardInfo) => {
        this.session.update<Sessions.BrushSession>(data, this.screenToWorld(data, payload.point))

        brushUpdater.set(data.pageState.brush)
      },
      endBrushSession: () => {
        brushUpdater.clear()
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

      // Pointed id
      setPointedId: (data, payload: TLPointerInfo) => {
        const { pageState } = data
        pageState.pointedId = this.getPointedId(data, payload.target)
        pageState.currentParentId = this.getParentId(data, pageState.pointedId)
      },
      clearPointedId(data) {
        delete data.pageState.pointedId
      },

      // Editing id
      setEditingId: (data, payload: TLPointerInfo, shape: TLDrawShape) => {
        data.pageState.editingId = shape.id
      },
      clearEditingId(data) {
        delete data.pageState.editingId
      },

      // Selection
      pullPointedIdFromSelectedIds(data) {
        const { pointedId, selectedIds } = data.pageState
        if (!pointedId) return
        selectedIds.splice(selectedIds.indexOf(pointedId), 1)
      },
      pushPointedIdToSelectedIds(data) {
        const { pointedId, selectedIds } = data.pageState
        if (!pointedId) return
        selectedIds.push(pointedId)
      },
      deselectAll(data) {
        data.pageState.selectedIds = []
      },
      selectAll(data) {
        data.pageState.selectedIds = Object.values(data.page.shapes)
          .filter((shape) => shape.parentId === data.page.id)
          .map((shape) => shape.id)
      },

      // Current parent id
      setCurrentParentId(data) {
        data.pageState.currentParentId = data.page.id
      },
      clearCurrentParentId(data) {
        delete data.pageState.currentParentId
      },

      // Camera
      panCamera: (data, payload: { delta: number[] }) => {
        const { camera } = this.getPageState(data)

        camera.point = Vec.sub(camera.point, Vec.div(Vec.div(payload.delta, camera.zoom), camera.zoom))
      },
      pinchCamera: (data, payload: { info: TLPointerInfo; distanceDelta: number }) => {
        const camera = this.getCurrentCamera(data)

        const delta = Vec.sub(payload.info.point, payload.info.origin)

        camera.point = Vec.sub(camera.point, Vec.div(delta, camera.zoom))

        const next = camera.zoom - (payload.distanceDelta / 300) * camera.zoom

        const p0 = this.screenToWorld(data, payload.info.origin)
        camera.zoom = this.getCameraZoom(next)
        const p1 = this.screenToWorld(data, payload.info.origin)
        camera.point = Vec.add(camera.point, Vec.sub(p1, p0))
      },

      // Undo / Redo
      undo: (data) => {
        this.history.undo(data)
        this.callbacks.onChange?.(this, 'undo')
      },
      redo: (data) => {
        this.history.redo(data)
        this.callbacks.onChange?.(this, 'redo')
      },
    },
  })

  updateCallbacks(callbacks: Partial<TLDrawCallbacks>) {
    this.callbacks = callbacks
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

    this.callbacks.onChange?.(this, 'load')
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
    this._state.forceData(freeze({ ...this.data, ...data }))
  }

  fastPointerMove = (info: TLPointerInfo) => {
    if (this.isIn('brushSelecting')) {
      this.fastBrush(info)
    }
    if (this.isIn('translatingSelection')) {
      this.fastTranslate(info)
    }
    if (this.isIn('transformingSelection')) {
      this.fastTransform(info)
    }

    this.send('MOVED_POINTER', info)
  }

  fastPan = (info: TLPointerInfo & { delta: number[] }) => {
    const { point, zoom } = this.getCurrentCamera(this.data)

    const nextPoint = Vec.sub(point, Vec.div(info.delta, zoom))

    this.updatePageState({
      ...this.data.pageState,
      camera: {
        zoom,
        point: nextPoint,
      },
    })

    if (this.isIn('brushSelecting')) {
      this.fastBrush(info)
    }
    if (this.isIn('translatingSelection')) {
      this.fastTranslate(info)
    }
    if (this.isIn('transformingSelection')) {
      this.fastTransform(info)
    }

    // Send along the event just to be sure
    this.send('PANNED_CAMERA', info)

    this.callbacks.onChange?.(this, 'camera')
  }

  fastPinch = (info: TLPointerInfo & { distanceDelta: number }) => {
    const {
      camera: { point, zoom },
    } = this.data.pageState

    const delta = Vec.sub(info.point, info.origin)
    let nextPoint = Vec.sub(point, Vec.div(delta, zoom))

    const nextZoom = this.getCameraZoom(zoom - (info.distanceDelta / 300) * zoom)

    const p0 = Vec.sub(Vec.div(info.origin, zoom), point)
    const p1 = Vec.sub(Vec.div(info.origin, nextZoom), point)

    nextPoint = Vec.add(point, Vec.sub(p1, p0))

    this.updatePageState({
      ...this.data.pageState,
      camera: {
        point: nextPoint,
        zoom: nextZoom,
      },
    })

    // Send along the event just to be sure
    this.send('PINCHED_CAMERA', info)

    this.callbacks.onChange?.(this, 'camera')
  }

  fastBrush(info: TLPointerInfo) {
    const data = { ...this.data }

    this.session.update<Sessions.BrushSession>(data, this.screenToWorld(data, info.point))

    brushUpdater.set(this.data.pageState.brush)

    this.updatePageState({
      ...data.pageState,
    })

    // Send along the event just to be sure
    this.send('MOVED_POINTER', info)
  }

  fastTranslate(info: TLPointerInfo) {
    const data = { ...this.data }

    this.session.update<Sessions.TranslateSession>(
      data,
      this.screenToWorld(data, info.point),
      info.shiftKey,
      info.altKey,
    )

    this.updatePage({ ...data.page })
  }

  fastTransform(info: TLPointerInfo) {
    const data = { ...this.data }

    this.session.update<Sessions.TransformSession>(data, this.screenToWorld(data, info.point), info.shiftKey)

    this.updatePage({ ...data.page })
  }

  getParentId(data: Data, id: string) {
    const shape = data.page.shapes[id]
    return shape.parentId
  }

  getPointedId(data: Data, id: string): string {
    const shape = data.page.shapes[id]
    if (!shape) return id

    return shape.parentId === data.pageState.currentParentId || shape.parentId === data.page.id
      ? id
      : this.getPointedId(data, shape.parentId)
  }

  getDrilledPointedId(data: Data, id: string): string {
    const shape = data.page.shapes[id]
    const { currentParentId, pointedId } = data.pageState

    return shape.parentId === data.page.id || shape.parentId === pointedId || shape.parentId === currentParentId
      ? id
      : this.getDrilledPointedId(data, shape.parentId)
  }

  getTopParentId(data: Data, id: string): string {
    const shape = data.page.shapes[id]

    if (shape.parentId === shape.id) {
      throw Error(`Shape has the same id as its parent! ${shape.id}`)
    }

    return shape.parentId === data.page.id || shape.parentId === data.pageState.currentParentId
      ? id
      : this.getTopParentId(data, shape.parentId)
  }

  // Get an array of a shape id and its descendant shapes' ids
  getDocumentBranch(data: Data, id: string): string[] {
    const shape = data.page.shapes[id]

    if (shape.children === undefined) return [id]

    return [id, ...shape.children.flatMap((childId) => this.getDocumentBranch(data, childId))]
  }

  // Get a deep array of unproxied shapes and their descendants
  getSelectedBranchSnapshot<K>(data: Data, fn: (shape: TLDrawShape) => K): ({ id: string } & K)[]
  getSelectedBranchSnapshot(data: Data): TLDrawShape[]
  getSelectedBranchSnapshot<K>(data: Data, fn?: (shape: TLDrawShape) => K): (TLDrawShape | K)[] {
    const page = this.getPage(data)

    const copies = this.getSelectedIds(data)
      .flatMap((id) => this.getDocumentBranch(data, id).map((id) => page.shapes[id]))
      .filter((shape) => !shape.isLocked)
      .map(Utils.deepClone)

    if (fn !== undefined) {
      return copies.map((shape) => ({ id: shape.id, ...fn(shape) }))
    }

    return copies
  }

  // Get a shallow array of unproxied shapes
  getSelectedShapeSnapshot(data: Data): TLDrawShape[]
  getSelectedShapeSnapshot<K>(data: Data, fn?: (shape: TLDrawShape) => K): ({ id: string } & K)[]
  getSelectedShapeSnapshot<K>(data: Data, fn?: (shape: TLDrawShape) => K): (TLDrawShape | K)[] {
    const copies = this.getSelectedShapes(data)
      .filter((shape) => !shape.isLocked)
      .map(Utils.deepClone)

    if (fn !== undefined) {
      return copies.map((shape) => ({ id: shape.id, ...fn(shape) }))
    }

    return copies
  }

  getChildIndexAbove(data: Data, id: string): number {
    const page = this.getPage(data)

    const shape = page.shapes[id]

    const siblings = Object.values(page.shapes)
      .filter(({ parentId }) => parentId === shape.parentId)
      .sort((a, b) => a.childIndex - b.childIndex)

    const index = siblings.indexOf(shape)

    const nextSibling = siblings[index + 1]

    if (!nextSibling) return shape.childIndex + 1

    let nextIndex = (shape.childIndex + nextSibling.childIndex) / 2

    if (nextIndex === nextSibling.childIndex) {
      this.forceIntegerChildIndices(siblings)
      nextIndex = (shape.childIndex + nextSibling.childIndex) / 2
    }

    return nextIndex
  }

  getTopChildIndex(data: Data, parent: TLDrawShape | TLPage<TLDrawShape>): number {
    const page = this.getPage(data)

    // If the parent is a shape, return either 1 (if no other shapes) or the
    // highest sorted child index + 1.
    if ('shapes' in parent) {
      const children = Object.values(parent.shapes)

      if (children.length === 0) return 1

      return children.sort((a, b) => b.childIndex - a.childIndex)[0].childIndex + 1
    }

    // If the shape is a regular shape that can accept children, return either
    // 1 (if no other children) or the highest sorted child index + 1.
    this.assertParentShape(parent)

    if (parent.children.length === 0) return 1

    return parent.children.map((id) => page.shapes[id]).sort((a, b) => b.childIndex - a.childIndex)[0].childIndex + 1
  }

  assertParentShape(shape: TLDrawShape): asserts shape is TLDrawShape & { children: string[] } {
    if (!('children' in shape)) {
      throw new Error(`That shape was not a parent (it was a ${shape.type}).`)
    }
  }

  // Force all shapes on the page to have integer child indices.
  forceIntegerChildIndices(shapes: TLDrawShape[]): void {
    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i]
      getShapeUtils(shape).setProperty(shape, 'childIndex', i + 1)
    }
  }

  updateParents(data: Data, changedShapeIds: string[]): void {
    if (changedShapeIds.length === 0) return

    const { shapes } = this.getPage(data)

    const parentToUpdateIds = Array.from(new Set(changedShapeIds.map((id) => shapes[id].parentId).values())).filter(
      (id) => id !== data.page.id,
    )

    for (const parentId of parentToUpdateIds) {
      const parent = shapes[parentId]

      if (!parent.children) {
        throw Error('A shape is parented to a shape without a children array.')
      }

      getShapeUtils(parent).onChildrenChange(
        parent,
        parent.children.map((id) => shapes[id]),
      )

      shapes[parentId] = { ...parent }
    }

    this.updateParents(data, parentToUpdateIds)
  }

  deleteShapes(data: Data, shapeIds: string[] | TLDrawShape[], shapesDeleted: TLDrawShape[] = []): TLDrawShape[] {
    const ids =
      typeof shapeIds[0] === 'string' ? (shapeIds as string[]) : (shapeIds as TLDrawShape[]).map((shape) => shape.id)

    const parentsToDelete: string[] = []

    const page = this.getPage(data)

    const parentIds = new Set(ids.map((id) => page.shapes[id].parentId))

    // Delete shapes
    ids.forEach((id) => {
      shapesDeleted.push(Utils.deepClone(page.shapes[id]))
      delete page.shapes[id]
    })

    // Update parents
    parentIds.forEach((id) => {
      const parent = page.shapes[id]

      // The parent was either deleted or a is a page.
      if (!parent) return

      const utils = getShapeUtils(parent)

      // Remove deleted ids from the parent's children and update the parent
      utils
        .setProperty(
          parent,
          'children',
          parent.children!.filter((childId) => !ids.includes(childId)),
        )
        .onChildrenChange(
          parent,
          parent.children!.map((id) => page.shapes[id]),
        )

      if (utils.shouldDelete(parent)) {
        // If the parent decides it should delete, then we need to reparent
        // the parent's remaining children to the parent's parent, and
        // assign them correct child indices, and then delete the parent on
        // the next recursive step.

        const nextIndex = this.getChildIndexAbove(data, parent.id)

        const len = parent.children!.length

        // Reparent the children and assign them new child indices
        parent.children!.forEach((childId, i) => {
          const child = this.getShape(data, childId)

          getShapeUtils(child)
            .setProperty(child, 'parentId', parent.parentId)
            .setProperty(child, 'childIndex', Utils.lerp(parent.childIndex, nextIndex, i / len))
        })

        if (parent.parentId !== page.id) {
          // If the parent is not a page, then we add the parent's children
          // to the parent's parent shape before emptying that array. If the
          // parent is a page, then we don't need to do this step.
          // TODO: Consider adding explicit children array to page shapes.
          const grandParent = page.shapes[parent.parentId]

          getShapeUtils(grandParent)
            .setProperty(grandParent, 'children', [...parent.children!])
            .onChildrenChange(
              grandParent,
              grandParent.children!.map((id) => page.shapes[id]),
            )
        }

        // Empty the parent's children array and delete the parent on the next
        // iteration step.
        getShapeUtils(parent).setProperty(parent, 'children', [])

        parentsToDelete.push(parent.id)
      }
    })

    if (parentsToDelete.length > 0) {
      return this.deleteShapes(data, parentsToDelete, shapesDeleted)
    }

    return shapesDeleted
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
    const [maxX, maxY] = this.screenToWorld(data, [window.innerWidth, window.innerHeight])

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

  deselectAll(data: Data) {
    this.setSelectedIds(data, [])
  }

  getShapes(data: Data) {
    return Object.values(data.page.shapes)
  }

  getCamera(data: Data) {
    return data.pageState.camera
  }

  getShape<T extends TLDrawShape = TLDrawShape>(data: Data, shapeId: string): T {
    return data.page.shapes[shapeId] as T
  }

  getBinding(data: Data, id: string): TLBinding {
    return this.getPage(data).bindings[id]
  }

  /* -------------------------------------------------- */
  /*                       Public                       */
  /* -------------------------------------------------- */

  toJson(formatted = false) {
    return JSON.stringify(this.state.data, null, formatted ? 2 : 0)
  }

  toggleTestMode() {
    this.isTestMode = !this.isTestMode
    return this.isTestMode
  }

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
