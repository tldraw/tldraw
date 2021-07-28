/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createState, createSelectorHook } from '@state-designer/react'
import {
  TLPage,
  TLPageState,
  TLShapeUtils,
  Vec,
  TLPointerInfo,
  brushUpdater,
  TLBoundsCorner,
  TLBoundsEdge,
  TLKeyboardInfo,
  AlignType,
  StretchType,
  DistributeType,
} from '@tldraw/core'
import { Data, TLDrawDocument } from '../../types'
import {
  TLDrawShape,
  TLDrawShapeUtils,
  tldrawShapeUtils,
  getShapeUtils,
  ShapeStyles,
  defaultStyle,
} from '../../shape'
import { History } from '../history'
import {
  BrushSession,
  Session,
  TransformSession,
  TransformSingleSession,
  TranslateSession,
} from '../session'
import { freeze } from 'immer'
import { TLD } from '../tld'
import * as commands from '../command'

/*
The State Manager class is a wrapper around a state-designer state. It provides utilities for accessing
parts of the state, both privately for internal use and publically for external use. The singleton intance
is shared in the renderer's `onMount` callback.
*/

export interface TLDrawCallbacks {
  onMount: (state: TLDrawState) => void
  onChange: (
    state: TLDrawState,
    type: 'camera' | 'command' | 'session' | 'undo' | 'redo' | 'load' | 'page',
  ) => void
}

const initialData: Data = {
  settings: {
    isPenMode: false,
    isDarkMode: false,
    isDebugMode: process.env.NODE_ENV === 'development',
    isReadonlyMode: false,
  },
  appState: {
    currentPageId: 'page',
    currentStyle: defaultStyle,
    activeTool: 'select',
    isToolLocked: false,
    isStyleOpen: false,
    isEmptyCanvas: false,
  },
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
}

export class TLDrawState {
  isTestMode = false

  documentId = 'placeholder'

  currentPageId: string

  pages: Record<string, TLPage<TLDrawShape>> = {}

  pageStates: Record<string, TLPageState> = {}

  shapeUtils: TLShapeUtils<TLDrawShape>

  callbacks: Partial<TLDrawCallbacks> = {}

  session = new Session(() => {
    this.callbacks.onChange?.(this, 'session')
  })

  history = new History(() => {
    this.callbacks.onChange?.(this, 'command')
  })

  _state = createState({
    data: initialData,
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
          CHANGED_RENDERING_COUNT: {
            if: ['isEmptyCanvas', 'isRenderingShapes'],
            do: 'clearIsEmptyCanvas',
            else: {
              unless: ['isEmptyCanvas', 'isRenderingShapes'],
              do: 'setIsEmptyCanvas',
            },
          },
          TOGGLED_STYLE_PANEL_OPEN: 'toggleStylePanel',
          TOGGLED_SHAPE_LOCK: {
            unlessAny: 'isInSession',
            if: 'hasSelection',
            do: 'lockSelection',
          },
          TOGGLED_SHAPE_HIDE: {
            unlessAny: 'isInSession',
            if: 'hasSelection',
            do: 'hideSelection',
          },
          TOGGLED_SHAPE_ASPECT_LOCK: {
            unlessAny: 'isInSession',
            if: 'hasSelection',
            do: 'aspectLockSelection',
          },
          CHANGED_STYLE: {
            unlessAny: 'isInSession',
            do: ['updateStyles', 'applyStylesToSelection'],
          },
          ALIGNED: {
            unless: 'isInSession',
            if: 'hasMultipleSelection',
            do: 'alignSelection',
          },
          DISTRIBUTED: {
            unless: 'isInSession',
            if: 'hasMultipleSelection',
            do: 'distributeSelection',
          },
          STRETCHED: {
            if: 'hasMultipleSelection',
            do: 'stretchSelection',
          },
          DUPLICATED: {
            if: 'hasSelection',
            do: 'duplicateSelection',
          },
          // ROTATED_CCW: {
          //   if: 'hasSelection',
          //   do: 'rotateSelectionCcw',
          // },
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
      hasSelection(data) {
        return data.pageState.selectedIds.length > 0
      },
      hasMultipleSelection(data) {
        return data.pageState.selectedIds.length > 1
      },
      isEmptyCanvas: (data) => {
        return data.appState.isEmptyCanvas
      },
      isRenderingShapes: (data, payload: { count: number }) => {
        return payload.count > 0
      },
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
      isPointingRotationHandle(
        _data,
        payload: { target: TLBoundsEdge | TLBoundsCorner | 'rotate' },
      ) {
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
      toggleDebugMode: (data) => {
        data.settings.isDebugMode = !data.settings.isDebugMode
      },
      toggleDarkMode: (data) => {
        data.settings.isDarkMode = !data.settings.isDarkMode
      },
      toggleReadonlyMode: (data) => {
        data.settings.isReadonlyMode = !data.settings.isReadonlyMode
      },

      /* ----------------------- UI ----------------------- */

      toggleStylePanel: (data) => {
        data.appState.isStyleOpen = !data.appState.isStyleOpen
      },
      toggleToolLock: (data) => {
        data.appState.isToolLocked = !data.appState.isToolLocked
      },
      setIsEmptyCanvas: (data) => {
        data.appState.isEmptyCanvas = true
      },
      clearIsEmptyCanvas: (data) => {
        data.appState.isEmptyCanvas = false
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
        const finalCommand = this.session.complete(data)
        if (finalCommand) this.history.execute(data, finalCommand)
      },

      // Translate Session
      startTranslateSession: (data, payload: TLPointerInfo) => {
        this.session.begin(new TranslateSession(data, TLD.screenToWorld(data, payload.origin)))
      },
      updateTranslateSession: (data, payload: TLPointerInfo | TLKeyboardInfo) => {
        this.session.update<TranslateSession>(
          data,
          TLD.screenToWorld(data, payload.point),
          payload.shiftKey,
          payload.altKey,
        )
      },

      // Transform Session
      startTransformSession: (
        data,
        payload: TLPointerInfo & { target: TLBoundsCorner | TLBoundsEdge },
      ) => {
        const point = TLD.screenToWorld(data, payload.origin)
        this.session.begin(
          data.pageState.selectedIds.length === 1
            ? new TransformSingleSession(data, point, payload.target)
            : new TransformSession(data, point, payload.target),
        )
      },
      updateTransformSession: (data, payload: TLPointerInfo) => {
        this.session.update<TransformSession>(
          data,
          TLD.screenToWorld(data, payload.point),
          payload.shiftKey,
        )
      },

      // Brush Session
      startBrushSession: (data, payload: TLPointerInfo) => {
        this.session.begin(new BrushSession(data, TLD.screenToWorld(data, payload.point)))
      },
      updateBrushSession: (data, payload: TLPointerInfo | TLKeyboardInfo) => {
        this.session.update<BrushSession>(data, TLD.screenToWorld(data, payload.point))
        brushUpdater.set(data.pageState.brush)
      },
      endBrushSession: () => {
        brushUpdater.clear()
      },

      // Create Session
      startCreateSession: (data, payload: TLPointerInfo) => {
        const point = TLD.screenToWorld(data, payload.origin)
        this.session.begin(new TransformSingleSession(data, point))
      },

      /* -------------------- Commands -------------------- */

      // Undo / Redo
      undo: (data) => {
        this.history.undo(data)
        this.callbacks.onChange?.(this, 'undo')
      },
      redo: (data) => {
        this.history.redo(data)
        this.callbacks.onChange?.(this, 'redo')
      },

      /* ------------------- Page State ------------------- */

      // Hovered Id
      setHoveredId(data, payload: TLPointerInfo) {
        const { pageState } = data
        pageState.hoveredId = payload.target
      },
      clearHoveredId(data) {
        const { pageState } = data
        pageState.hoveredId = undefined
      },

      // Pointed Id
      setPointedId: (data, payload: TLPointerInfo) => {
        const { pageState } = data
        pageState.pointedId = TLD.getPointedId(data, payload.target)
        pageState.currentParentId = TLD.getParentId(data, pageState.pointedId)
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

      // Bounds Rotation
      clearBoundsRotation(data) {
        delete data.pageState.boundsRotation
      },

      // Camera
      panCamera: (data, payload: { delta: number[] }) => {
        const { camera } = data.pageState

        camera.point = Vec.sub(
          camera.point,
          Vec.div(Vec.div(payload.delta, camera.zoom), camera.zoom),
        )
      },
      pinchCamera: (data, payload: { info: TLPointerInfo; distanceDelta: number }) => {
        const { camera } = data.pageState

        const delta = Vec.sub(payload.info.point, payload.info.origin)

        camera.point = Vec.sub(camera.point, Vec.div(delta, camera.zoom))

        const next = camera.zoom - (payload.distanceDelta / 300) * camera.zoom

        const p0 = TLD.screenToWorld(data, payload.info.origin)
        camera.zoom = TLD.getCameraZoom(next)
        const p1 = TLD.screenToWorld(data, payload.info.origin)
        camera.point = Vec.add(camera.point, Vec.sub(p1, p0))
      },

      /* ------------------ Shape Changes ----------------- */

      updateStyles(data, payload: Partial<ShapeStyles>) {
        Object.assign(data.appState.currentStyle, payload)
      },
      applyStylesToSelection: (data, payload: Partial<ShapeStyles>) => {
        this.history.execute(data, commands.style(data, payload))
      },
      alignSelection: (data, payload: { type: AlignType }) => {
        this.history.execute(data, commands.align(data, payload.type))
      },
      distributeSelection: (data, payload: { type: DistributeType }) => {
        this.history.execute(data, commands.distribute(data, payload.type))
      },
      stretchSelection: (data, payload: { type: StretchType }) => {
        this.history.execute(data, commands.stretch(data, payload.type))
      },
      duplicateSelection: (data) => {
        this.history.execute(data, commands.duplicate(data))
      },
      lockSelection: (data) => {
        this.history.execute(data, commands.toggle(data, 'isLocked'))
      },
      hideSelection: (data) => {
        this.history.execute(data, commands.toggle(data, 'isHidden'))
      },
      aspectLockSelection: (data) => {
        this.history.execute(data, commands.toggle(data, 'isAspectRatioLocked'))
      },
      // deleteSelection(data) {
      //   commands.deleteShapes(data, tld.getSelectedShapes(data))
      // },
      // rotateSelectionCcw(data) {
      //   commands.rotateCcw(data)
      // },
    },
    values: {
      selectedStyle(data) {
        const {
          page,
          pageState,
          appState: { currentStyle },
        } = data

        if (pageState.selectedIds.length === 0) {
          return currentStyle
        }

        const shapeStyles = data.pageState.selectedIds.map((id) => page.shapes[id].style)

        const commonStyle: ShapeStyles = {} as ShapeStyles

        const overrides = new Set<string>([])

        for (const shapeStyle of shapeStyles) {
          for (const key in currentStyle) {
            if (overrides.has(key)) continue
            if (commonStyle[key] === undefined) {
              commonStyle[key] = shapeStyle[key]
            } else {
              if (commonStyle[key] === shapeStyle[key]) continue
              commonStyle[key] = currentStyle[key]
              overrides.add(key)
            }
          }
        }

        return commonStyle
      },
    },
  })

  /* ------------------- Private API ------------------ */

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

  // Force an update to the state's data without cancelling the current session
  private fastUpdate(data: Data) {
    this._state.forceData(data)
  }

  // Force a change to the state's data object
  private forceUpdate(data: Partial<Data>) {
    if (this.session.isInSession) this.send('CANCELLED')
    this._state.forceData(freeze({ ...this.data, ...data }))
  }

  // Function that runs when a tldraw document is updated from props
  private updateFromDocument(document: TLDrawDocument, currentPageId?: string) {
    const { pages, pageStates } = document
    const previousDocumentId = this.documentId

    this.pages = pages
    this.pageStates = pageStates
    this.documentId = document.id

    if (this.documentId === previousDocumentId) {
      // If we're using the same document id, then we've probably updated
      // from props. We can just update the state with the new data.

      this.fastUpdate({
        ...this.data,
        page: pages[this.currentPageId],
        pageState: pageStates[this.currentPageId],
      })
    } else {
      // If the document id has changed, then we've loaded a new document.
      // Run the cleanup methods in forceUpdate and fire the onChange callback.
      this.currentPageId = currentPageId || Object.keys(pages)[0]

      this.forceUpdate({
        appState: {
          ...this.data.appState,
          currentPageId: this.currentPageId,
        },
        page: pages[this.currentPageId],
        pageState: pageStates[this.currentPageId],
      })

      this.callbacks.onChange?.(this, 'load')
    }
  }

  /* --------------- Implementation API --------------- */

  // Toggle the test mode
  toggleTestMode() {
    this.isTestMode = !this.isTestMode
    return this.isTestMode
  }

  // Load callbacks from props (should be done once on mount)
  loadCallbacks(callbacks: Partial<TLDrawCallbacks>) {
    this.callbacks = callbacks
  }

  // Load a document from props (should be done once on mount)
  loadDocument(document: TLDrawDocument) {
    this.updateFromDocument(document)
  }

  loadCurrentPageId(pageId: string) {
    if (pageId !== this.data.page.id) {
      this.changePage(pageId)
    }
  }

  changePage(pageId: string) {
    this.currentPageId = pageId

    this.pages[this.data.page.id] = { ...this.data.page }
    this.pageStates[this.data.page.id] = { ...this.data.pageState }

    this.forceUpdate({
      page: this.pages[this.currentPageId],
      pageState: this.pageStates[this.currentPageId],
    })

    this.callbacks.onChange?.(this, 'page')
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
    const { point, zoom } = TLD.getCurrentCamera(this.data)

    const nextPoint = Vec.sub(point, Vec.div(info.delta, zoom))

    this.fastUpdate({
      ...this.data,
      pageState: {
        ...this.data.pageState,
        camera: {
          zoom,
          point: nextPoint,
        },
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

    const nextZoom = TLD.getCameraZoom(zoom - (info.distanceDelta / 300) * zoom)

    const p0 = Vec.sub(Vec.div(info.origin, zoom), point)
    const p1 = Vec.sub(Vec.div(info.origin, nextZoom), point)

    nextPoint = Vec.add(point, Vec.sub(p1, p0))

    this.fastUpdate({
      ...this.data,
      pageState: {
        ...this.data.pageState,
        camera: {
          point: nextPoint,
          zoom: nextZoom,
        },
      },
    })

    // Send along the event just to be sure
    this.send('PINCHED_CAMERA', info)

    this.callbacks.onChange?.(this, 'camera')
  }

  fastBrush(info: TLPointerInfo) {
    const data = { ...this.data }

    this.session.update<BrushSession>(data, TLD.screenToWorld(data, info.point))

    brushUpdater.set(data.pageState.brush)

    this.fastUpdate({
      ...this.data,
      pageState: { ...data.pageState },
    })

    // Send along the event just to be sure
    this.send('MOVED_POINTER', info)
  }

  fastTranslate(info: TLPointerInfo) {
    const data = { ...this.data }

    this.session.update<TranslateSession>(
      data,
      TLD.screenToWorld(data, info.point),
      info.shiftKey,
      info.altKey,
    )

    this.fastUpdate({ ...this.data, page: { ...data.page } })
  }

  fastTransform(info: TLPointerInfo) {
    const data = { ...this.data }

    this.session.update<TransformSession>(data, TLD.screenToWorld(data, info.point), info.shiftKey)

    this.fastUpdate({ ...this.data, page: { ...data.page } })
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

  get state() {
    return this._state
  }

  get data() {
    return this.state.data
  }

  /* -------------------------------------------------- */
  /*                     Public API                     */
  /* -------------------------------------------------- */

  /**
   * Update the current page state. Calling this method will cancel any current session.
   *
   * ### Example
   *
   *```ts
   * tldrState.updatePageState(myTLPageState)
   *```
   */
  updatePageState = (pageState: TLPageState) => {
    this.forceUpdate({ pageState })
  }

  /**
   * Update the current page. Calling this method will cancel any current session.
   *
   * ### Example
   *
   *```ts
   * tldrState.updatePage(myTLPage)
   *```
   */
  updatePage = (page: TLPage<TLDrawShape>) => {
    if (page.id === this.currentPageId) {
      this.forceUpdate({ page })
    }
  }

  /**
   * Update a shape on the current page.
   *
   * ### Example
   *
   *```ts
   * tldrState.updateShape(myNewShape)
   *```
   */
  updateShape = (shape: TLDrawShape) => {
    if (this.data.page.shapes[shape.id]) {
      this.forceUpdate({
        page: {
          ...this.data.page,
          shapes: { ...this.data.page.shapes, [shape.id]: shape },
        },
      })
    }
  }

  /**
   * Get the current document as a JSON object.
   *
   * ### Example
   *
   *```ts
   * tldrawState.toJson()
   *```
   */
  toJson(formatted = false) {
    const document: TLDrawDocument = {
      id: this.documentId,
      pages: this.pages,
      pageStates: this.pageStates,
    }

    document.pages[this.currentPageId] = this.data.page
    document.pageStates[this.currentPageId] = this.data.pageState

    return JSON.stringify(document, null, formatted ? 2 : 0)
  }
}

export const state = new TLDrawState(tldrawShapeUtils)

export const useSelector = createSelectorHook(state.state)
