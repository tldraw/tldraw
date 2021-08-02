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
  Utils,
  MoveType,
  TLPointerEventHandler,
  inputs,
} from '@tldraw/core'
import { Data, TLDrawDocument } from '../../types'
import {
  TLDrawShape,
  TLDrawShapeUtils,
  tldrawShapeUtils,
  getShapeUtils,
  ShapeStyles,
  defaultStyle,
  TLDrawShapeType,
  TLDrawToolType,
} from '../../shape'
import { History } from '../history'
import {
  BrushSession,
  DrawSession,
  RotateSession,
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

export type OnChangeCallback = (
  state: TLDrawState,
  type: 'camera' | 'command' | 'session' | 'undo' | 'redo' | 'load' | 'page',
) => void

const initialData: Data = {
  settings: {
    isPenMode: false,
    isDarkMode: false,
    isDebugMode: process.env.NODE_ENV === 'development',
    isReadonlyMode: false,
    nudgeDistanceLarge: 10,
    nudgeDistanceSmall: 1,
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

  onChange: OnChangeCallback

  session = new Session(() => {
    this.onChange?.(this, 'session')
  })

  history = new History(() => {
    this.onChange?.(this, 'command')
  })

  _state = createState({
    data: initialData,
    initial: 'ready',
    states: {
      loading: {},
      ready: {
        initial: 'usingTool',
        states: {
          usingTool: {
            on: {
              ZOOMED: 'zoomCamera',
              ZOOMED_IN: 'zoomIn',
              ZOOMED_OUT: 'zoomOut',
              ZOOMED_TO_SELECTION: {
                if: 'hasSelection',
                do: 'zoomCameraToSelection',
                else: 'zoomCameraToFit',
              },
              ZOOMED_TO_CONTENT: 'zoomCameraToContent',
              ZOOMED_TO_FIT: 'zoomCameraToFit',
              RESET_CAMERA: 'resetCamera',
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
              TOGGLED_TOOL_LOCK: 'toggleToolLock',
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
                unless: 'isInSession',
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
                unless: 'isInSession',
                if: 'hasSelection',
                do: 'duplicateSelection',
              },
              DELETED: {
                unless: 'isInSession',
                do: 'deleteSelection',
              },
              DELETED_ALL: {
                unless: 'isInSession',
                if: 'hasSelection',
                do: 'deleteSelection',
                else: ['selectAll', 'deleteSelection'],
              },
              ROTATED_CCW: {
                unless: 'isInSession',
                if: 'hasSelection',
                do: 'rotateSelectionCcw',
              },
              NUDGED: {
                unless: 'isInSession',
                if: 'hasSelection',
                do: 'nudgeSelection',
              },
              MOVED: {
                unless: 'isInSession',
                if: 'hasSelection',
                do: 'moveSelection',
              },
              SELECTED_SELECT_TOOL: {
                unless: 'isInSession',
                to: 'selecting',
              },
              SELECTED_TOOL: {
                unless: 'isInSession',
                do: 'setActiveTool',
                to: (data) => data.appState.activeToolType,
              },
              SELECTED_RECTANGLE_TOOL: {
                unless: 'isInSession',
                to: 'rectangle',
              },
            },
            initial: 'select',
            states: {
              select: {
                onEnter: 'setActiveTool',
                initial: 'notPointing',
                states: {
                  notPointing: {
                    on: {
                      HOVERED_SHAPE: 'setHoveredId',
                      UNHOVERED_SHAPE: 'clearHoveredId',
                      CANCELLED: {
                        if: 'hasCurrentParentShape',
                        do: ['selectCurrentParentId', 'raiseCurrentParentId'],
                        else: 'deselectAll',
                      },
                      POINTED_CANVAS: {
                        to: 'brushSelecting',
                        do: 'clearCurrentParentId',
                      },
                      POINTED_BOUNDS_HANDLE: {
                        to: 'transformingSelection',
                      },
                      POINTED_BOUNDS: {
                        if: 'isPressingMetaKey',
                        to: 'brushSelecting',
                        else: { to: 'pointingBounds' },
                      },
                      POINTED_SHAPE: [
                        {
                          if: 'isPressingMetaKey',
                          to: 'brushSelecting',
                        },
                        'setPointedId',
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
                      RELEASED_BOUNDS: { do: 'deselectAll', to: 'notPointing' },
                      RELEASED_SHAPE: [
                        {
                          if: 'isPressingShiftKey',
                          then: 'pullPointedIdFromSelectedIds',
                          else: ['deselectAll', 'setPointedId', 'pushPointedIdToSelectedIds'],
                        },
                        { to: 'notPointing' },
                      ],
                      DRAGGED_BOUNDS: {
                        if: 'distanceImpliesDrag',
                        to: 'translatingSelection',
                      },
                      DRAGGED_SHAPE: {
                        if: 'distanceImpliesDrag',
                        to: 'translatingSelection',
                      },
                      STARTED_PINCHING: {
                        do: 'cancelSession',
                        to: 'pinching',
                      },
                    },
                  },
                  brushSelecting: {
                    onExit: ['completeSession', 'endBrushSession'],
                    onEnter: [
                      {
                        unless: ['isPressingMetaKey', 'isPressingShiftKey'],
                        do: 'deselectAll',
                      },
                      'clearBoundsRotation',
                      'startBrushSession',
                    ],
                    on: {
                      STARTED_PINCHING: {
                        do: 'cancelSession',
                        to: 'pinching',
                      },
                      DRAGGED_CANVAS: {
                        if: 'isTestMode',
                        do: 'updateBrushSession',
                      },
                      PANNED_CAMERA: {
                        if: 'isTestMode',
                        do: 'updateBrushSession',
                      },
                      STOPPED_POINTING: { to: 'notPointing' },
                      CANCELLED: { do: 'cancelSession', to: 'notPointing' },
                    },
                  },
                  translatingSelection: {
                    onEnter: 'startTranslateSession',
                    onExit: 'completeSession',
                    on: {
                      STARTED_PINCHING: {
                        do: 'cancelSession',
                        to: 'pinching',
                      },
                      DRAGGED_SHAPE: {
                        ifAny: 'isTestMode',
                        do: 'updateTranslateSession',
                      },
                      DRAGGED_BOUNDS: {
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
                      RELEASED_SHAPE: { to: 'select' },
                      RELEASED_BOUNDS: { to: 'select' },
                      CANCELLED: { do: 'cancelSession', to: 'select' },
                    },
                  },
                  transformingSelection: {
                    onEnter: 'startTransformSession',
                    onExit: 'completeSession',
                    on: {
                      DRAGGED_BOUNDS_HANDLE: {
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
              [TLDrawToolType.Bounds]: {
                on: {},
                initial: 'idle',
                states: {
                  idle: {
                    on: {
                      POINTED_SHAPE: { to: `${TLDrawToolType.Bounds}.active` },
                      POINTED_CANVAS: { to: `${TLDrawToolType.Bounds}.active` },
                      CANCELLED: { to: 'select' },
                    },
                  },
                  active: {
                    onEnter: ['createActiveToolShape', 'startCreateTransformSession'],
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
                      STOPPED_POINTING: [
                        'quietlyCompleteSession',
                        'completeActiveToolShape',
                        {
                          if: 'isToolLocked',
                          to: `${TLDrawToolType.Bounds}.idle`,
                          else: {
                            to: 'select',
                          },
                        },
                      ],
                      CANCELLED: [
                        'quietlyCompleteSession',
                        'deleteActiveToolShape',
                        {
                          if: 'isToolLocked',
                          to: `${TLDrawToolType.Bounds}.idle`,
                          else: {
                            to: 'select',
                          },
                        },
                      ],
                    },
                  },
                },
              },
              [TLDrawToolType.Draw]: {
                on: {},
                initial: 'idle',
                states: {
                  idle: {
                    on: {
                      POINTED_SHAPE: { to: `${TLDrawToolType.Draw}.active` },
                      POINTED_CANVAS: { to: `${TLDrawToolType.Draw}.active` },
                      CANCELLED: { to: 'select' },
                    },
                  },
                  active: {
                    onEnter: ['createActiveToolShape', 'startCreateDrawSession'],
                    on: {
                      MOVED_POINTER: {
                        if: 'isTestMode',
                        do: 'updateDrawSession',
                      },
                      PANNED_CAMERA: {
                        if: 'isTestMode',
                        do: 'updateDrawSession',
                      },
                      PRESSED_KEY: 'updateDrawSession',
                      RELEASED_KEY: 'updateDrawSession',
                      STOPPED_POINTING: [
                        'quietlyCompleteSession',
                        'completeActiveToolShape',
                        'deselectAll',
                        {
                          to: `${TLDrawToolType.Draw}.idle`,
                        },
                      ],
                      CANCELLED: [
                        'quietlyCompleteSession',
                        'deleteActiveToolShape',
                        {
                          to: `${TLDrawToolType.Draw}.idle`,
                        },
                      ],
                    },
                  },
                },
              },
              [TLDrawToolType.Point]: {
                on: {},
                initial: 'idle',
                states: {
                  idle: {},
                  active: {
                    onEnter: 'createActiveToolShape',
                    on: {
                      CANCELLED: 'deleteActiveToolShape',
                    },
                  },
                },
              },
              [TLDrawToolType.Points]: {
                on: {},
                initial: 'idle',
                states: {
                  idle: {},
                  active: {
                    onEnter: 'createActiveToolShape',
                    on: {
                      CANCELLED: 'deleteActiveToolShape',
                    },
                  },
                },
              },
            },
          },
          pinching: {
            on: {
              PINCHED_CAMERA: { if: 'isTestMode', do: 'pinchCamera' },
              STOPPED_PINCHING: { to: 'usingTool.previous' },
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
      hasCurrentParentShape(data) {
        return data.pageState.currentParentId && data.pageState.currentParentId !== data.page.id
      },
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
      isToolLocked: (data) => {
        return data.appState.isToolLocked
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

      /* ---------------------- Tools --------------------- */

      setActiveTool(data, payload: { type: TLDrawShapeType | 'select' }) {
        const type = payload?.type || 'select'

        data.appState.activeTool = type
        data.appState.activeToolType =
          type === 'select' ? 'select' : TLD.getShapeUtils({ type } as TLDrawShape).toolType
      },
      createActiveToolShape(data, payload: TLPointerInfo) {
        const { activeTool, activeToolType } = data.appState

        if (activeTool === 'select') return
        if (!activeToolType) throw Error

        const utils = TLD.getShapeUtils({ type: activeTool } as TLDrawShape)

        const shape = utils.create({
          id: Utils.uniqueId(),
          parentId: data.page.id,
          childIndex: TLD.getTopChildIndex(data, data.page) + 1,
          point: Vec.round(TLD.screenToWorld(data, payload.point)),
          style: { ...data.appState.currentStyle },
        })

        // Set editing Id?

        // Don't add the shape to the undo stack yet
        TLD.setSelectedIds(data, [shape.id])
        TLD.createShapes(data, [shape])
      },
      deleteActiveToolShape(data) {
        // Don't add this to the undo stack; it never happened
        TLD.deleteShapes(data, data.pageState.selectedIds)
        TLD.setSelectedIds(data, [])
      },
      completeActiveToolShape: (data) => {
        // Now we add the mutation to the undo stack
        const selectedShape = Utils.deepClone(data.page.shapes[data.pageState.selectedIds[0]])
        this.history.execute(data, commands.create(data, [selectedShape], true))
      },

      /* -------------------- Sessions -------------------- */

      breakSession: (data) => {
        this.session.cancel(data)
        this.history.disable()
        // commands.deleteShapes(data, this.getSelectedShapes(data))
        this.history.enable()
      },
      quietlyCompleteSession: (data) => {
        this.history.disable()
        const finalCommand = this.session.complete(data)
        if (finalCommand) this.history.execute(data, finalCommand)
        this.history.enable()
      },

      cancelSession: (data) => {
        this.session.cancel(data)
      },
      completeSession: (data) => {
        const finalCommand = this.session.complete(data)
        if (finalCommand) this.history.execute(data, finalCommand)
      },

      // Create
      startCreateTransformSession: (data, payload: TLPointerInfo) => {
        const point = TLD.screenToWorld(data, payload.origin)
        this.session.begin(
          new TransformSingleSession(data, point, TLBoundsCorner.BottomRight, true),
        )
      },
      startCreateDrawSession: (data, payload: TLPointerInfo) => {
        this.session.begin(
          new DrawSession(
            data,
            data.pageState.selectedIds[0],
            TLD.screenToWorld(data, payload.origin),
          ),
        )
      },

      // Draw Session
      startDrawSession: (data, payload: TLPointerInfo) => {
        this.session.begin(
          new DrawSession(
            data,
            data.pageState.selectedIds[0],
            TLD.screenToWorld(data, payload.origin),
          ),
        )
      },
      updateDrawSession: (data, payload: TLPointerInfo | TLKeyboardInfo) => {
        this.session.update<DrawSession>(
          data,
          TLD.screenToWorld(data, payload.point),
          'pressure' in payload ? payload.pressure : 0.5,
          payload.altKey,
        )
      },

      // Translate Session
      startTranslateSession: (data, payload: TLPointerInfo) => {
        this.session.begin(new TranslateSession(data, TLD.screenToWorld(data, payload.origin)))
      },
      updateTranslateSession: (data, payload: TLPointerInfo | TLKeyboardInfo) => {
        this.session.update<TranslateSession>(
          data,
          TLD.screenToWorld(data, payload?.point || inputs.pointer?.point),
          payload.shiftKey,
          payload.altKey,
        )
      },

      // Transform / Rotate Session
      startTransformSession: (
        data,
        payload: TLPointerInfo & { target: TLBoundsCorner | TLBoundsEdge | 'rotate' },
      ) => {
        const point = TLD.screenToWorld(data, payload.origin)
        this.session.begin(
          payload.target === 'rotate'
            ? new RotateSession(data, point)
            : data.pageState.selectedIds.length === 1
            ? new TransformSingleSession(data, point, payload.target)
            : new TransformSession(data, point, payload.target),
        )
      },
      updateTransformSession: (data, payload: TLPointerInfo) => {
        this.session.update<TransformSession | RotateSession>(
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

      /* -------------------- Commands -------------------- */

      // Undo / Redo
      undo: (data) => {
        this.history.undo(data)
        this.onChange?.(this, 'undo')
      },
      redo: (data) => {
        this.history.redo(data)
        this.onChange?.(this, 'redo')
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
      raiseCurrentParentId(data) {
        const { currentParentId } = data.pageState
        const currentParent = TLD.getShape(data, currentParentId)

        data.pageState.currentParentId =
          currentParent.parentId === currentParentId ? currentParentId : currentParent.parentId
      },
      selectCurrentParentId(data) {
        TLD.setSelectedIds(data, [data.pageState.currentParentId])
      },

      // Bounds Rotation
      clearBoundsRotation(data) {
        delete data.pageState.boundsRotation
      },

      // Camera
      panCamera: (data, payload: { delta: number[] }) => {
        const camera = TLD.getCurrentCamera(data)

        camera.point = Vec.sub(
          camera.point,
          Vec.div(Vec.div(payload.delta, camera.zoom), camera.zoom),
        )
      },
      pinchCamera: (data, payload: { info: TLPointerInfo; distanceDelta: number }) => {
        const camera = TLD.getCurrentCamera(data)

        const delta = Vec.sub(payload.info.point, payload.info.origin)

        camera.point = Vec.sub(camera.point, Vec.div(delta, camera.zoom))

        const next = camera.zoom - (payload.distanceDelta / 300) * camera.zoom

        const p0 = TLD.screenToWorld(data, payload.info.origin)
        camera.zoom = TLD.getCameraZoom(next)
        const p1 = TLD.screenToWorld(data, payload.info.origin)
        camera.point = Vec.add(camera.point, Vec.sub(p1, p0))
      },
      zoomCamera: (data, payload: { info: TLPointerInfo }) => {
        const camera = TLD.getCurrentCamera(data)
        const next = camera.zoom - (payload.info.delta[1] / 100) * camera.zoom
        const center = [window.innerWidth / 2, window.innerHeight / 2]

        const p0 = TLD.screenToWorld(data, center)
        camera.zoom = TLD.getCameraZoom(next)
        const p1 = TLD.screenToWorld(data, center)
        camera.point = Vec.add(camera.point, Vec.sub(p1, p0))
      },
      zoomIn(data) {
        const camera = TLD.getCurrentCamera(data)
        const i = Math.round((camera.zoom * 100) / 25)
        const center = [window.innerWidth / 2, window.innerHeight / 2]

        const p0 = TLD.screenToWorld(data, center)
        camera.zoom = TLD.getCameraZoom((i + 1) * 0.25)
        const p1 = TLD.screenToWorld(data, center)
        camera.point = Vec.add(camera.point, Vec.sub(p1, p0))
      },
      zoomOut(data) {
        const camera = TLD.getCurrentCamera(data)
        const i = Math.round((camera.zoom * 100) / 25)
        const center = [window.innerWidth / 2, window.innerHeight / 2]

        const p0 = TLD.screenToWorld(data, center)
        camera.zoom = TLD.getCameraZoom((i - 1) * 0.25)
        const p1 = TLD.screenToWorld(data, center)
        camera.point = Vec.add(camera.point, Vec.sub(p1, p0))
      },
      zoomCameraToActual(data) {
        const camera = TLD.getCurrentCamera(data)
        const center = [window.innerWidth / 2, window.innerHeight / 2]

        const p0 = TLD.screenToWorld(data, center)
        camera.zoom = 1
        const p1 = TLD.screenToWorld(data, center)
        camera.point = Vec.add(camera.point, Vec.sub(p1, p0))
      },
      zoomCameraToSelectionActual(data) {
        const camera = TLD.getCurrentCamera(data)
        const bounds = TLD.getSelectedBounds(data)

        const mx = (window.innerWidth - bounds.width) / 2
        const my = (window.innerHeight - bounds.height) / 2

        camera.zoom = 1
        camera.point = Vec.add([-bounds.minX, -bounds.minY], [mx, my])
      },
      zoomCameraToSelection(data) {
        const camera = TLD.getCurrentCamera(data)
        const bounds = TLD.getSelectedBounds(data)

        const zoom = TLD.getCameraZoom(
          bounds.width > bounds.height
            ? (window.innerWidth - 128) / bounds.width
            : (window.innerHeight - 128) / bounds.height,
        )

        const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
        const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

        camera.zoom = zoom
        camera.point = Vec.add([-bounds.minX, -bounds.minY], [mx, my])
      },
      zoomCameraToFit(data) {
        const camera = TLD.getCurrentCamera(data)

        const shapes = Object.values(data.page.shapes)

        if (shapes.length === 0) {
          return
        }

        const bounds = Utils.getCommonBounds(
          Object.values(shapes).map((shape) => getShapeUtils(shape).getBounds(shape)),
        )

        const zoom = TLD.getCameraZoom(
          bounds.width > bounds.height
            ? (window.innerWidth - 128) / bounds.width
            : (window.innerHeight - 128) / bounds.height,
        )

        const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
        const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

        camera.zoom = zoom
        camera.point = Vec.add([-bounds.minX, -bounds.minY], [mx, my])
      },
      zoomCameraToContent(data) {
        const camera = TLD.getCurrentCamera(data)

        const shapes = Object.values(data.page.shapes)

        if (shapes.length === 0) {
          return
        }

        const bounds = Utils.getCommonBounds(
          Object.values(shapes).map((shape) => getShapeUtils(shape).getBounds(shape)),
        )

        const { zoom } = camera
        const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
        const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

        camera.point = Vec.add([-bounds.minX, -bounds.minY], [mx, my])
      },
      resetCamera(data) {
        const camera = TLD.getCurrentCamera(data)
        camera.zoom = 1
        camera.point = [window.innerWidth / 2, window.innerHeight / 2]
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
      deleteSelection: (data) => {
        this.history.execute(data, commands.deleteShapes(data))
      },
      rotateSelectionCcw: (data) => {
        this.history.execute(data, commands.rotate(data))
      },
      nudgeSelection: (data, payload: { delta: number[]; major: boolean }) => {
        this.history.execute(
          data,
          commands.translate(
            data,
            Vec.mul(
              payload.delta,
              payload.major ? data.settings.nudgeDistanceLarge : data.settings.nudgeDistanceSmall,
            ),
          ),
        )
      },
      moveSelection: (data, payload: { type: MoveType }) => {
        this.history.execute(data, commands.move(data, payload.type))
      },
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
    options: {
      // onSend(eventName, payload, didCauseUpdate) {
      //   console.log(eventName, didCauseUpdate)
      // },
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

      this.onChange?.(this, 'load')
    }
  }

  /* --------------- Implementation API --------------- */

  // Toggle the test mode
  toggleTestMode() {
    this.isTestMode = !this.isTestMode
    return this.isTestMode
  }

  // Run onMount when the component mounts
  loadOnMount = (onMount?: (state: TLDrawState) => void) => {
    onMount?.(this)
  }

  // Load callbacks from props (should be done once on mount)
  loadOnChange(onChange: OnChangeCallback) {
    this.onChange = onChange
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

    this.onChange?.(this, 'page')
  }

  fastPointerMove: TLPointerEventHandler = (info) => {
    if (this.isIn('brushSelecting')) {
      this.fastBrush(info)
    } else if (this.isIn('translatingSelection')) {
      this.fastTranslate(info)
    } else if (this.isInAny('transformingSelection', `${TLDrawToolType.Bounds}.active`)) {
      this.fastTransform(info)
    } else if (this.isIn(`${TLDrawToolType.Draw}.active`)) {
      this.fastDraw(info)
    }

    this.send('MOVED_POINTER', info)
  }

  fastPan: TLPointerEventHandler = (info) => {
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
    } else if (this.isIn('translatingSelection')) {
      this.fastTranslate(info)
    } else if (this.isInAny('transformingSelection', `${TLDrawToolType.Bounds}.active`)) {
      this.fastTransform(info)
    } else if (this.isIn(`${TLDrawToolType.Draw}.active`)) {
      this.fastDraw(info)
    }

    this.onChange?.(this, 'camera')
  }

  fastPinch: TLPointerEventHandler = (info) => {
    const {
      camera: { point, zoom },
    } = this.data.pageState

    const delta = Vec.sub(info.point, info.origin)

    let nextPoint = Vec.sub(point, Vec.div(delta, zoom))

    const nextZoom = TLD.getCameraZoom(zoom - (info.delta[1] / 350) * zoom)

    const p0 = Vec.sub(Vec.div(info.point, zoom), point)
    const p1 = Vec.sub(Vec.div(info.point, nextZoom), nextPoint)

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

    this.onChange?.(this, 'camera')
  }

  fastBrush: TLPointerEventHandler = (info) => {
    if (!this.state.isIn('brushSelecting')) {
      this.send('MOVED_POINTER', info)
      return
    }

    const data = { ...this.data }

    this.session.update<BrushSession>(data, TLD.screenToWorld(data, info.point))

    brushUpdater.set(data.pageState.brush)

    this.fastUpdate({
      ...this.data,
      pageState: { ...data.pageState },
    })
  }

  fastTranslate: TLPointerEventHandler = (info) => {
    if (this.state.isIn('brushSelecting')) {
      this.fastBrush(info)
      return
    }

    if (!this.state.isIn('translatingSelection')) {
      this.state.send('DRAGGED_BOUNDS', info)
      return
    }

    const data = { ...this.data }

    this.session.update<TranslateSession>(
      data,
      TLD.screenToWorld(data, info.point),
      info.shiftKey,
      info.altKey,
    )

    data.pageState.selectedIds.forEach((id) => (data.page.shapes[id] = { ...data.page.shapes[id] }))

    this.fastUpdate({ ...this.data, page: { ...data.page } })
  }

  fastTransform: TLPointerEventHandler = (info) => {
    if (!this.isInAny('transformingSelection', `${TLDrawToolType.Bounds}.active`)) {
      this.send('DRAGGED_BOUNDS', info)
      return
    }

    if (info.target === 'rotate') {
      this.fastRotate(info)
      return
    }

    const data = { ...this.data }

    this.session.update<TransformSession | TranslateSession>(
      data,
      TLD.screenToWorld(data, info.point),
      info.shiftKey,
    )

    this.fastUpdate({ ...data, page: { ...data.page } })
  }

  fastDraw: TLPointerEventHandler = (info) => {
    const data = { ...this.data }

    this.session.update<DrawSession>(
      data,
      TLD.screenToWorld(data, info.point),
      'pressure' in info ? info.pressure : 0.5,
      info.shiftKey,
    )

    const selectedId = data.pageState.selectedIds[0]

    const shape = data.page.shapes[selectedId]

    data.page.shapes[selectedId] = { ...shape }

    this.fastUpdate({ ...this.data, page: { ...data.page } })
  }

  fastRotate: TLPointerEventHandler = (info) => {
    const data = { ...this.data }

    this.session.update<RotateSession>(data, TLD.screenToWorld(data, info.point), info.shiftKey)

    data.pageState.selectedIds.forEach((id) => (data.page.shapes[id] = { ...data.page.shapes[id] }))

    this.fastUpdate({ ...this.data, page: { ...data.page } })
  }

  // State machine commands

  send = (eventName: string, payload?: unknown) => {
    this.state.send(eventName, payload)
    return this
  }

  isIn = (...ids: string[]) => {
    return this.state.isIn(...ids)
  }

  isInAny = (...ids: string[]): boolean => {
    return this.state.isInAny(...ids)
  }

  can = (eventName: string, payload?: unknown) => {
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
