import { createSelectorHook, createState } from '@state-designer/react'
import * as vec from 'utils/vec'
import inputs from './inputs'
import { defaultDocument } from './data'
import { shades } from 'lib/colors'
import { createShape, getShapeUtils } from 'lib/shape-utils'
import history from 'state/history'
import * as Sessions from './sessions'
import commands from './commands'
import { updateFromCode } from 'lib/code/generate'
import {
  clamp,
  getChildren,
  getCommonBounds,
  getCurrent,
  getPage,
  getSelectedBounds,
  getShape,
  screenToWorld,
  setZoomCSS,
} from 'utils/utils'
import {
  Data,
  PointerInfo,
  Shape,
  ShapeType,
  Corner,
  Edge,
  CodeControl,
  MoveType,
  ShapeStyles,
  DistributeType,
  AlignType,
  StretchType,
} from 'types'

const initialData: Data = {
  isReadOnly: false,
  settings: {
    fontSize: 13,
    isDarkMode: false,
    isCodeOpen: false,
    isStyleOpen: false,
    isToolLocked: false,
    isPenLocked: false,
    nudgeDistanceLarge: 10,
    nudgeDistanceSmall: 1,
  },
  currentStyle: {
    fill: shades.lightGray,
    stroke: shades.darkGray,
    strokeWidth: 2,
  },
  camera: {
    point: [0, 0],
    zoom: 1,
  },
  brush: undefined,
  boundsRotation: 0,
  pointedId: null,
  hoveredId: null,
  selectedIds: new Set([]),
  currentPageId: 'page0',
  currentCodeFileId: 'file0',
  codeControls: {},
  document: defaultDocument,
}

const state = createState({
  data: initialData,
  on: {
    UNMOUNTED: [{ unless: 'isReadOnly', do: 'forceSave' }, { to: 'loading' }],
  },
  initial: 'loading',
  states: {
    loading: {
      on: {
        MOUNTED: [
          'restoreSavedData',
          {
            to: 'ready',
          },
        ],
      },
    },
    ready: {
      onEnter: {
        wait: 0.01,
        if: 'hasSelection',
        do: 'zoomCameraToSelectionActual',
        else: ['zoomCameraToFit', 'zoomCameraToActual'],
      },
      on: {
        ZOOMED_CAMERA: {
          do: 'zoomCamera',
        },
        PANNED_CAMERA: {
          do: 'panCamera',
        },
        ZOOMED_TO_ACTUAL: {
          if: 'hasSelection',
          do: 'zoomCameraToSelectionActual',
          else: 'zoomCameraToActual',
        },
        ZOOMED_TO_SELECTION: {
          if: 'hasSelection',
          do: 'zoomCameraToSelection',
        },
        ZOOMED_TO_FIT: ['zoomCameraToFit', 'zoomCameraToActual'],
        ZOOMED_IN: 'zoomIn',
        ZOOMED_OUT: 'zoomOut',
        RESET_CAMERA: 'resetCamera',
        TOGGLED_SHAPE_LOCK: { if: 'hasSelection', do: 'lockSelection' },
        TOGGLED_SHAPE_HIDE: { if: 'hasSelection', do: 'hideSelection' },
        TOGGLED_SHAPE_ASPECT_LOCK: {
          if: 'hasSelection',
          do: 'aspectLockSelection',
        },
        SELECTED_SELECT_TOOL: { to: 'selecting' },
        SELECTED_DRAW_TOOL: { unless: 'isReadOnly', to: 'draw' },
        SELECTED_DOT_TOOL: { unless: 'isReadOnly', to: 'dot' },
        SELECTED_CIRCLE_TOOL: { unless: 'isReadOnly', to: 'circle' },
        SELECTED_ELLIPSE_TOOL: { unless: 'isReadOnly', to: 'ellipse' },
        SELECTED_RAY_TOOL: { unless: 'isReadOnly', to: 'ray' },
        SELECTED_LINE_TOOL: { unless: 'isReadOnly', to: 'line' },
        SELECTED_POLYLINE_TOOL: { unless: 'isReadOnly', to: 'polyline' },
        SELECTED_RECTANGLE_TOOL: { unless: 'isReadOnly', to: 'rectangle' },
        TOGGLED_CODE_PANEL_OPEN: 'toggleCodePanel',
        TOGGLED_STYLE_PANEL_OPEN: 'toggleStylePanel',
        CHANGED_STYLE: ['updateStyles', 'applyStylesToSelection'],
        SELECTED_ALL: { to: 'selecting', do: 'selectAll' },
        NUDGED: { do: 'nudgeSelection' },
        USED_PEN_DEVICE: 'enablePenLock',
        DISABLED_PEN_LOCK: 'disablePenLock',
        CLEARED_PAGE: ['selectAll', 'deleteSelection'],
      },
      initial: 'selecting',
      states: {
        selecting: {
          on: {
            SAVED: 'forceSave',
            UNDO: 'undo',
            REDO: 'redo',
            SAVED_CODE: 'saveCode',
            DELETED: 'deleteSelection',
            INCREASED_CODE_FONT_SIZE: 'increaseCodeFontSize',
            DECREASED_CODE_FONT_SIZE: 'decreaseCodeFontSize',
            CHANGED_CODE_CONTROL: 'updateControls',
            GENERATED_FROM_CODE: ['setCodeControls', 'setGeneratedShapes'],
            TOGGLED_TOOL_LOCK: 'toggleToolLock',
            MOVED: { if: 'hasSelection', do: 'moveSelection' },
            ALIGNED: { if: 'hasSelection', do: 'alignSelection' },
            STRETCHED: { if: 'hasSelection', do: 'stretchSelection' },
            DISTRIBUTED: { if: 'hasSelection', do: 'distributeSelection' },
            DUPLICATED: { if: 'hasSelection', do: 'duplicateSelection' },
            ROTATED_CCW: { if: 'hasSelection', do: 'rotateSelectionCcw' },
          },
          initial: 'notPointing',
          states: {
            notPointing: {
              on: {
                CANCELLED: 'clearSelectedIds',
                STARTED_PINCHING: { to: 'pinching' },
                POINTED_CANVAS: { to: 'brushSelecting' },
                POINTED_BOUNDS: { to: 'pointingBounds' },
                POINTED_BOUNDS_HANDLE: {
                  if: 'isPointingRotationHandle',
                  to: 'rotatingSelection',
                  else: { to: 'transformingSelection' },
                },
                MOVED_OVER_SHAPE: {
                  if: 'pointHitsShape',
                  then: {
                    unless: 'shapeIsHovered',
                    do: 'setHoveredId',
                  },
                  else: { if: 'shapeIsHovered', do: 'clearHoveredId' },
                },
                UNHOVERED_SHAPE: 'clearHoveredId',
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
                      else: ['clearSelectedIds', 'pushPointedIdToSelectedIds'],
                    },
                  },
                  {
                    to: 'pointingBounds',
                  },
                ],
              },
            },
            pointingBounds: {
              on: {
                STOPPED_POINTING: [
                  {
                    if: 'isPressingShiftKey',
                    then: {
                      if: 'isPointedShapeSelected',
                      do: 'pullPointedIdFromSelectedIds',
                    },
                    else: {
                      unless: 'isPointingBounds',
                      do: ['clearSelectedIds', 'pushPointedIdToSelectedIds'],
                    },
                  },
                  { to: 'notPointing' },
                ],
                MOVED_POINTER: {
                  unless: 'isReadOnly',
                  if: 'distanceImpliesDrag',
                  to: 'draggingSelection',
                },
              },
            },
            rotatingSelection: {
              onEnter: 'startRotateSession',
              onExit: 'clearBoundsRotation',
              on: {
                MOVED_POINTER: 'updateRotateSession',
                PANNED_CAMERA: 'updateRotateSession',
                PRESSED_SHIFT_KEY: 'keyUpdateRotateSession',
                RELEASED_SHIFT_KEY: 'keyUpdateRotateSession',
                STOPPED_POINTING: { do: 'completeSession', to: 'selecting' },
                CANCELLED: { do: 'cancelSession', to: 'selecting' },
              },
            },
            transformingSelection: {
              onEnter: 'startTransformSession',
              on: {
                MOVED_POINTER: 'updateTransformSession',
                PANNED_CAMERA: 'updateTransformSession',
                PRESSED_SHIFT_KEY: 'keyUpdateTransformSession',
                RELEASED_SHIFT_KEY: 'keyUpdateTransformSession',
                STOPPED_POINTING: { do: 'completeSession', to: 'selecting' },
                CANCELLED: { do: 'cancelSession', to: 'selecting' },
              },
            },
            draggingSelection: {
              onEnter: 'startTranslateSession',
              on: {
                MOVED_POINTER: 'updateTranslateSession',
                PANNED_CAMERA: 'updateTranslateSession',
                PRESSED_SHIFT_KEY: 'keyUpdateTranslateSession',
                RELEASED_SHIFT_KEY: 'keyUpdateTranslateSession',
                PRESSED_ALT_KEY: 'keyUpdateTranslateSession',
                RELEASED_ALT_KEY: 'keyUpdateTranslateSession',
                STOPPED_POINTING: { do: 'completeSession', to: 'selecting' },
                CANCELLED: { do: 'cancelSession', to: 'selecting' },
              },
            },
            brushSelecting: {
              onEnter: [
                {
                  unless: ['isPressingMetaKey', 'isPressingShiftKey'],
                  do: 'clearSelectedIds',
                },
                'clearBoundsRotation',
                'startBrushSession',
              ],
              on: {
                STARTED_PINCHING: { do: 'completeSession', to: 'pinching' },
                MOVED_POINTER: 'updateBrushSession',
                PANNED_CAMERA: 'updateBrushSession',
                STOPPED_POINTING: { do: 'completeSession', to: 'selecting' },
                CANCELLED: { do: 'cancelSession', to: 'selecting' },
              },
            },
          },
        },
        pinching: {
          on: {
            PINCHED: { do: 'pinchCamera' },
          },
          initial: 'selectPinching',
          states: {
            selectPinching: {
              on: {
                STOPPED_PINCHING: { to: 'selecting' },
              },
            },
            toolPinching: {
              on: {
                STOPPED_PINCHING: { to: 'usingTool.previous' },
              },
            },
          },
        },
        usingTool: {
          initial: 'draw',
          onEnter: 'clearSelectedIds',
          on: {
            STARTED_PINCHING: {
              do: 'breakSession',
              to: 'pinching.toolPinching',
            },
            TOGGLED_TOOL_LOCK: 'toggleToolLock',
          },
          states: {
            draw: {
              initial: 'creating',
              states: {
                creating: {
                  on: {
                    CANCELLED: { to: 'selecting' },
                    POINTED_SHAPE: {
                      get: 'newDraw',
                      do: 'createShape',
                      to: 'draw.editing',
                    },
                    POINTED_CANVAS: {
                      get: 'newDraw',
                      do: 'createShape',
                      to: 'draw.editing',
                    },
                    UNDO: { do: 'undo' },
                    REDO: { do: 'redo' },
                  },
                },
                editing: {
                  onEnter: 'startDrawSession',
                  on: {
                    STOPPED_POINTING: {
                      do: 'completeSession',
                      to: 'draw.creating',
                    },
                    CANCELLED: {
                      do: 'breakSession',
                      to: 'selecting',
                    },
                    MOVED_POINTER: 'updateDrawSession',
                    PANNED_CAMERA: 'updateDrawSession',
                  },
                },
              },
            },
            dot: {
              initial: 'creating',
              states: {
                creating: {
                  on: {
                    CANCELLED: { to: 'selecting' },
                    POINTED_SHAPE: {
                      get: 'newDot',
                      do: 'createShape',
                      to: 'dot.editing',
                    },
                    POINTED_CANVAS: {
                      get: 'newDot',
                      do: 'createShape',
                      to: 'dot.editing',
                    },
                  },
                },
                editing: {
                  on: {
                    STOPPED_POINTING: [
                      'completeSession',
                      {
                        if: 'isToolLocked',
                        to: 'dot.creating',
                        else: {
                          to: 'selecting',
                        },
                      },
                    ],
                    CANCELLED: {
                      do: 'breakSession',
                      to: 'selecting',
                    },
                  },
                  initial: 'inactive',
                  states: {
                    inactive: {
                      on: {
                        MOVED_POINTER: {
                          if: 'distanceImpliesDrag',
                          to: 'dot.editing.active',
                        },
                      },
                    },
                    active: {
                      onEnter: 'startTranslateSession',
                      on: {
                        MOVED_POINTER: 'updateTranslateSession',
                        PANNED_CAMERA: 'updateTranslateSession',
                      },
                    },
                  },
                },
              },
            },
            circle: {
              initial: 'creating',
              states: {
                creating: {
                  on: {
                    CANCELLED: { to: 'selecting' },
                    POINTED_SHAPE: {
                      to: 'circle.editing',
                    },
                    POINTED_CANVAS: {
                      to: 'circle.editing',
                    },
                  },
                },
                editing: {
                  on: {
                    STOPPED_POINTING: { to: 'selecting' },
                    CANCELLED: { to: 'selecting' },
                    MOVED_POINTER: {
                      if: 'distanceImpliesDrag',
                      then: {
                        get: 'newCircle',
                        do: 'createShape',
                        to: 'drawingShape.bounds',
                      },
                    },
                  },
                },
              },
            },
            ellipse: {
              initial: 'creating',
              states: {
                creating: {
                  on: {
                    CANCELLED: { to: 'selecting' },
                    POINTED_CANVAS: {
                      to: 'ellipse.editing',
                    },
                  },
                },
                editing: {
                  on: {
                    STOPPED_POINTING: { to: 'selecting' },
                    CANCELLED: { to: 'selecting' },
                    MOVED_POINTER: {
                      if: 'distanceImpliesDrag',
                      then: {
                        get: 'newEllipse',
                        do: 'createShape',
                        to: 'drawingShape.bounds',
                      },
                    },
                  },
                },
              },
            },
            rectangle: {
              initial: 'creating',
              states: {
                creating: {
                  on: {
                    CANCELLED: { to: 'selecting' },
                    POINTED_SHAPE: {
                      to: 'rectangle.editing',
                    },
                    POINTED_CANVAS: {
                      to: 'rectangle.editing',
                    },
                  },
                },
                editing: {
                  on: {
                    STOPPED_POINTING: { to: 'selecting' },
                    CANCELLED: { to: 'selecting' },
                    MOVED_POINTER: {
                      if: 'distanceImpliesDrag',
                      then: {
                        get: 'newRectangle',
                        do: 'createShape',
                        to: 'drawingShape.bounds',
                      },
                    },
                  },
                },
              },
            },
            ray: {
              initial: 'creating',
              states: {
                creating: {
                  on: {
                    CANCELLED: { to: 'selecting' },
                    POINTED_SHAPE: {
                      get: 'newRay',
                      do: 'createShape',
                      to: 'ray.editing',
                    },
                    POINTED_CANVAS: {
                      get: 'newRay',
                      do: 'createShape',
                      to: 'ray.editing',
                    },
                  },
                },
                editing: {
                  on: {
                    STOPPED_POINTING: { to: 'selecting' },
                    CANCELLED: { to: 'selecting' },
                    MOVED_POINTER: {
                      if: 'distanceImpliesDrag',
                      to: 'drawingShape.direction',
                    },
                  },
                },
              },
            },
            line: {
              initial: 'creating',
              states: {
                creating: {
                  on: {
                    CANCELLED: { to: 'selecting' },
                    POINTED_SHAPE: {
                      get: 'newLine',
                      do: 'createShape',
                      to: 'line.editing',
                    },
                    POINTED_CANVAS: {
                      get: 'newLine',
                      do: 'createShape',
                      to: 'line.editing',
                    },
                  },
                },
                editing: {
                  on: {
                    STOPPED_POINTING: { to: 'selecting' },
                    CANCELLED: { to: 'selecting' },
                    MOVED_POINTER: {
                      if: 'distanceImpliesDrag',
                      to: 'drawingShape.direction',
                    },
                  },
                },
              },
            },
            polyline: {},
          },
        },
        drawingShape: {
          on: {
            STOPPED_POINTING: [
              'completeSession',
              {
                if: 'isToolLocked',
                to: 'usingTool.previous',
                else: { to: 'selecting' },
              },
            ],
            CANCELLED: {
              do: 'breakSession',
              to: 'selecting',
            },
          },
          initial: 'drawingShapeBounds',
          states: {
            bounds: {
              onEnter: 'startDrawTransformSession',
              on: {
                MOVED_POINTER: 'updateTransformSession',
                PANNED_CAMERA: 'updateTransformSession',
              },
            },
            direction: {
              onEnter: 'startDirectionSession',
              on: {
                MOVED_POINTER: 'updateDirectionSession',
                PANNED_CAMERA: 'updateDirectionSession',
              },
            },
          },
        },
      },
    },
  },
  results: {
    newDraw() {
      return ShapeType.Draw
    },
    newDot() {
      return ShapeType.Dot
    },
    newRay() {
      return ShapeType.Ray
    },
    newLine() {
      return ShapeType.Line
    },
    newCircle() {
      return ShapeType.Circle
    },
    newEllipse() {
      return ShapeType.Ellipse
    },
    newRectangle() {
      return ShapeType.Rectangle
    },
  },
  conditions: {
    isPointingBounds(data, payload: PointerInfo) {
      return payload.target === 'bounds'
    },
    isReadOnly(data) {
      return data.isReadOnly
    },
    distanceImpliesDrag(data, payload: PointerInfo) {
      return vec.dist2(payload.origin, payload.point) > 8
    },
    isPointedShapeSelected(data) {
      return data.selectedIds.has(data.pointedId)
    },
    isPressingShiftKey(data, payload: PointerInfo) {
      return payload.shiftKey
    },
    isPressingMetaKey(data, payload: PointerInfo) {
      return payload.metaKey
    },
    shapeIsHovered(data, payload: { target: string }) {
      return data.hoveredId === payload.target
    },
    pointHitsShape(data, payload: { target: string; point: number[] }) {
      const shape = getShape(data, payload.target)

      return getShapeUtils(shape).hitTest(
        shape,
        screenToWorld(payload.point, data)
      )
    },
    isPointingRotationHandle(
      data,
      payload: { target: Edge | Corner | 'rotate' }
    ) {
      return payload.target === 'rotate'
    },
    hasSelection(data) {
      return data.selectedIds.size > 0
    },
    isToolLocked(data) {
      return data.settings.isToolLocked
    },
    isPenLocked(data) {
      return data.settings.isPenLocked
    },
  },
  actions: {
    /* --------------------- Shapes --------------------- */
    createShape(data, payload, type: ShapeType) {
      const shape = createShape(type, {
        point: screenToWorld(payload.point, data),
        style: getCurrent(data.currentStyle),
      })

      const siblings = getChildren(data, shape.parentId)
      const childIndex = siblings.length
        ? siblings[siblings.length - 1].childIndex + 1
        : 1

      getShapeUtils(shape).setProperty(shape, 'childIndex', childIndex)

      getPage(data).shapes[shape.id] = shape

      data.selectedIds.clear()
      data.selectedIds.add(shape.id)
    },
    /* -------------------- Sessions -------------------- */

    // Shared
    breakSession(data) {
      session?.cancel(data)
      session = undefined
      history.disable()
      commands.deleteSelected(data)
      history.enable()
    },
    cancelSession(data) {
      session?.cancel(data)
      session = undefined
    },
    completeSession(data) {
      session?.complete(data)
      session = undefined
    },

    // Brushing
    startBrushSession(data, payload: PointerInfo) {
      session = new Sessions.BrushSession(
        data,
        screenToWorld(payload.point, data)
      )
    },
    updateBrushSession(data, payload: PointerInfo) {
      session.update(data, screenToWorld(payload.point, data))
    },

    // Rotating
    startRotateSession(data, payload: PointerInfo) {
      session = new Sessions.RotateSession(
        data,
        screenToWorld(payload.point, data)
      )
    },
    keyUpdateRotateSession(data, payload: PointerInfo) {
      session.update(
        data,
        screenToWorld(inputs.pointer.point, data),
        payload.shiftKey
      )
    },
    updateRotateSession(data, payload: PointerInfo) {
      session.update(data, screenToWorld(payload.point, data), payload.shiftKey)
    },

    // Dragging / Translating
    startTranslateSession(data, payload: PointerInfo) {
      session = new Sessions.TranslateSession(
        data,
        screenToWorld(inputs.pointer.origin, data),
        payload.altKey
      )
    },
    keyUpdateTranslateSession(
      data,
      payload: { shiftKey: boolean; altKey: boolean }
    ) {
      session.update(
        data,
        screenToWorld(inputs.pointer.point, data),
        payload.shiftKey,
        payload.altKey
      )
    },
    updateTranslateSession(data, payload: PointerInfo) {
      session.update(
        data,
        screenToWorld(payload.point, data),
        payload.shiftKey,
        payload.altKey
      )
    },

    // Dragging / Translating
    startTransformSession(
      data,
      payload: PointerInfo & { target: Corner | Edge }
    ) {
      const point = screenToWorld(inputs.pointer.origin, data)
      session =
        data.selectedIds.size === 1
          ? new Sessions.TransformSingleSession(data, payload.target, point)
          : new Sessions.TransformSession(data, payload.target, point)
    },
    startDrawTransformSession(data, payload: PointerInfo) {
      session = new Sessions.TransformSingleSession(
        data,
        Corner.BottomRight,
        screenToWorld(payload.point, data),
        true
      )
    },
    keyUpdateTransformSession(data, payload: PointerInfo) {
      session.update(
        data,
        screenToWorld(inputs.pointer.point, data),
        payload.shiftKey,
        payload.altKey
      )
    },
    updateTransformSession(data, payload: PointerInfo) {
      session.update(
        data,
        screenToWorld(payload.point, data),
        payload.shiftKey,
        payload.altKey
      )
    },

    // Direction
    startDirectionSession(data, payload: PointerInfo) {
      session = new Sessions.DirectionSession(
        data,
        screenToWorld(inputs.pointer.origin, data)
      )
    },
    updateDirectionSession(data, payload: PointerInfo) {
      session.update(data, screenToWorld(payload.point, data))
    },

    // Drawing
    startDrawSession(data) {
      const id = Array.from(data.selectedIds.values())[0]
      session = new Sessions.DrawSession(
        data,
        id,
        screenToWorld(inputs.pointer.origin, data)
      )
    },
    updateDrawSession(data, payload: PointerInfo) {
      session.update(data, screenToWorld(payload.point, data))
    },

    // Nudges
    nudgeSelection(data, payload: { delta: number[]; shiftKey: boolean }) {
      commands.nudge(
        data,
        vec.mul(
          payload.delta,
          payload.shiftKey
            ? data.settings.nudgeDistanceLarge
            : data.settings.nudgeDistanceSmall
        )
      )
    },

    /* -------------------- Selection ------------------- */

    selectAll(data) {
      const { selectedIds } = data
      const page = getPage(data)
      selectedIds.clear()
      for (let id in page.shapes) {
        selectedIds.add(id)
      }
    },
    setHoveredId(data, payload: PointerInfo) {
      data.hoveredId = payload.target
    },
    clearHoveredId(data) {
      data.hoveredId = undefined
    },
    setPointedId(data, payload: PointerInfo) {
      data.pointedId = payload.target
    },
    clearPointedId(data) {
      data.pointedId = undefined
    },
    clearSelectedIds(data) {
      data.selectedIds.clear()
    },
    pullPointedIdFromSelectedIds(data) {
      const { selectedIds, pointedId } = data
      selectedIds.delete(pointedId)
    },
    pushPointedIdToSelectedIds(data) {
      data.selectedIds.add(data.pointedId)
    },
    moveSelection(data, payload: { type: MoveType }) {
      commands.move(data, payload.type)
    },
    alignSelection(data, payload: { type: AlignType }) {
      commands.align(data, payload.type)
    },
    stretchSelection(data, payload: { type: StretchType }) {
      commands.stretch(data, payload.type)
    },
    distributeSelection(data, payload: { type: DistributeType }) {
      commands.distribute(data, payload.type)
    },
    duplicateSelection(data) {
      commands.duplicate(data)
    },
    lockSelection(data) {
      commands.toggle(data, 'isLocked')
    },
    hideSelection(data) {
      commands.toggle(data, 'isHidden')
    },
    aspectLockSelection(data) {
      commands.toggle(data, 'isAspectRatioLocked')
    },
    deleteSelection(data) {
      commands.deleteSelected(data)
    },
    rotateSelectionCcw(data) {
      commands.rotateCcw(data)
    },

    /* --------------------- Camera --------------------- */

    zoomIn(data) {
      const { camera } = data
      const i = Math.round((camera.zoom * 100) / 25)
      const center = [window.innerWidth / 2, window.innerHeight / 2]

      const p0 = screenToWorld(center, data)
      camera.zoom = Math.min(3, (i + 1) * 0.25)
      const p1 = screenToWorld(center, data)
      camera.point = vec.add(camera.point, vec.sub(p1, p0))

      setZoomCSS(camera.zoom)
    },
    zoomOut(data) {
      const { camera } = data
      const i = Math.round((camera.zoom * 100) / 25)
      const center = [window.innerWidth / 2, window.innerHeight / 2]

      const p0 = screenToWorld(center, data)
      camera.zoom = Math.max(0.1, (i - 1) * 0.25)
      const p1 = screenToWorld(center, data)
      camera.point = vec.add(camera.point, vec.sub(p1, p0))

      setZoomCSS(camera.zoom)
    },
    zoomCameraToActual(data) {
      const { camera } = data

      const center = [window.innerWidth / 2, window.innerHeight / 2]

      const p0 = screenToWorld(center, data)
      camera.zoom = 1
      const p1 = screenToWorld(center, data)
      camera.point = vec.add(camera.point, vec.sub(p1, p0))

      setZoomCSS(camera.zoom)
    },
    zoomCameraToSelectionActual(data) {
      const { camera } = data

      const bounds = getSelectedBounds(data)

      const mx = (window.innerWidth - bounds.width) / 2
      const my = (window.innerHeight - bounds.height) / 2

      camera.zoom = 1
      camera.point = vec.add([-bounds.minX, -bounds.minY], [mx, my])

      setZoomCSS(camera.zoom)
    },
    zoomCameraToSelection(data) {
      const { camera } = data

      const bounds = getSelectedBounds(data)

      const zoom =
        bounds.width > bounds.height
          ? (window.innerWidth - 128) / bounds.width
          : (window.innerHeight - 128) / bounds.height

      const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
      const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

      camera.zoom = zoom
      camera.point = vec.add([-bounds.minX, -bounds.minY], [mx, my])

      setZoomCSS(camera.zoom)
    },
    zoomCameraToFit(data) {
      const { camera } = data
      const page = getPage(data)

      const shapes = Object.values(page.shapes)

      if (shapes.length === 0) {
        return
      }

      const bounds = getCommonBounds(
        ...Object.values(shapes).map((shape) =>
          getShapeUtils(shape).getBounds(shape)
        )
      )

      const zoom =
        bounds.width > bounds.height
          ? (window.innerWidth - 128) / bounds.width
          : (window.innerHeight - 128) / bounds.height

      const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
      const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

      camera.zoom = zoom
      camera.point = vec.add([-bounds.minX, -bounds.minY], [mx, my])

      setZoomCSS(camera.zoom)
    },
    zoomCamera(data, payload: { delta: number; point: number[] }) {
      const { camera } = data
      const next = camera.zoom - (payload.delta / 100) * camera.zoom

      const p0 = screenToWorld(payload.point, data)
      camera.zoom = clamp(next, 0.1, 3)
      const p1 = screenToWorld(payload.point, data)
      camera.point = vec.add(camera.point, vec.sub(p1, p0))

      setZoomCSS(camera.zoom)
    },
    panCamera(data, payload: { delta: number[] }) {
      const { camera } = data
      camera.point = vec.sub(camera.point, vec.div(payload.delta, camera.zoom))
    },
    pinchCamera(
      data,
      payload: {
        delta: number[]
        distanceDelta: number
        angleDelta: number
        point: number[]
      }
    ) {
      const { camera } = data

      camera.point = vec.sub(camera.point, vec.div(payload.delta, camera.zoom))

      const next = camera.zoom - (payload.distanceDelta / 300) * camera.zoom

      const p0 = screenToWorld(payload.point, data)
      camera.zoom = clamp(next, 0.1, 3)
      const p1 = screenToWorld(payload.point, data)
      camera.point = vec.add(camera.point, vec.sub(p1, p0))

      setZoomCSS(camera.zoom)
    },
    resetCamera(data) {
      data.camera.zoom = 1
      data.camera.point = [window.innerWidth / 2, window.innerHeight / 2]

      document.documentElement.style.setProperty('--camera-zoom', '1')
    },

    /* ---------------------- History ---------------------- */

    // History
    popHistory() {
      history.pop()
    },
    forceSave(data) {
      history.save(data)
    },
    enableHistory() {
      history.enable()
    },
    disableHistory() {
      history.disable()
    },
    undo(data) {
      history.undo(data)
    },
    redo(data) {
      history.redo(data)
    },

    /* --------------------- Styles --------------------- */

    toggleStylePanel(data) {
      data.settings.isStyleOpen = !data.settings.isStyleOpen
    },
    updateStyles(data, payload: Partial<ShapeStyles>) {
      Object.assign(data.currentStyle, payload)
    },
    applyStylesToSelection(data, payload: Partial<ShapeStyles>) {
      commands.style(data, payload)
    },

    /* ---------------------- Code ---------------------- */

    closeCodePanel(data) {
      data.settings.isCodeOpen = false
    },
    openCodePanel(data) {
      data.settings.isCodeOpen = true
    },
    toggleCodePanel(data) {
      data.settings.isCodeOpen = !data.settings.isCodeOpen
    },
    setGeneratedShapes(
      data,
      payload: { shapes: Shape[]; controls: CodeControl[] }
    ) {
      commands.generate(data, data.currentPageId, payload.shapes)
    },
    setCodeControls(data, payload: { controls: CodeControl[] }) {
      data.codeControls = Object.fromEntries(
        payload.controls.map((control) => [control.id, control])
      )
    },
    increaseCodeFontSize(data) {
      data.settings.fontSize++
    },
    decreaseCodeFontSize(data) {
      data.settings.fontSize--
    },
    updateControls(data, payload: { [key: string]: any }) {
      for (let key in payload) {
        data.codeControls[key].value = payload[key]
      }

      history.disable()

      data.selectedIds.clear()

      try {
        const { shapes } = updateFromCode(
          data.document.code[data.currentCodeFileId].code,
          data.codeControls
        )

        commands.generate(data, data.currentPageId, shapes)
      } catch (e) {
        console.error(e)
      }

      history.enable()
    },

    /* -------------------- Settings -------------------- */

    enablePenLock(data) {
      data.settings.isPenLocked = true
    },
    disablePenLock(data) {
      data.settings.isPenLocked = false
    },
    toggleToolLock(data) {
      data.settings.isToolLocked = !data.settings.isToolLocked
    },

    /* ---------------------- Data ---------------------- */

    saveCode(data, payload: { code: string }) {
      data.document.code[data.currentCodeFileId].code = payload.code
      history.save(data)
    },

    restoreSavedData(data) {
      history.load(data)
    },

    clearBoundsRotation(data) {
      data.boundsRotation = 0
    },
  },
  values: {
    selectedIds(data) {
      return new Set(data.selectedIds)
    },
    selectedBounds(data) {
      const { selectedIds } = data

      const page = getPage(data)

      const shapes = Array.from(selectedIds.values())
        .map((id) => page.shapes[id])
        .filter(Boolean)

      if (selectedIds.size === 0) return null

      if (selectedIds.size === 1) {
        if (!shapes[0]) {
          console.error('Could not find that shape! Clearing selected IDs.')
          data.selectedIds.clear()
          return null
        }

        const shapeUtils = getShapeUtils(shapes[0])
        if (!shapeUtils.canTransform) return null
        return shapeUtils.getBounds(shapes[0])
      }

      return getCommonBounds(
        ...shapes.map((shape) => getShapeUtils(shape).getRotatedBounds(shape))
      )
    },
  },
})

let session: Sessions.BaseSession

export default state

export const useSelector = createSelectorHook(state)
