import { createSelectorHook, createState } from "@state-designer/react"
import * as vec from "utils/vec"
import inputs from "./inputs"
import { shades, defaultDocument } from "./data"
import { createShape, getShapeUtils } from "lib/shape-utils"
import history from "state/history"
import * as Sessions from "./sessions"
import commands from "./commands"
import { updateFromCode } from "lib/code/generate"
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
} from "utils/utils"
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
} from "types"

const initialData: Data = {
  isReadOnly: false,
  settings: {
    fontSize: 13,
    isDarkMode: false,
    isCodeOpen: false,
    isStyleOpen: false,
  },
  currentStyle: {
    fill: shades.lightGray,
    stroke: shades.darkGray,
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
  currentPageId: "page0",
  currentCodeFileId: "file0",
  codeControls: {},
  document: defaultDocument,
}

const state = createState({
  data: initialData,
  on: {
    ZOOMED_CAMERA: {
      do: "zoomCamera",
    },
    PANNED_CAMERA: {
      do: "panCamera",
    },
    SELECTED_SELECT_TOOL: { to: "selecting" },
    SELECTED_DOT_TOOL: { unless: "isReadOnly", to: "dot" },
    SELECTED_CIRCLE_TOOL: { unless: "isReadOnly", to: "circle" },
    SELECTED_ELLIPSE_TOOL: { unless: "isReadOnly", to: "ellipse" },
    SELECTED_RAY_TOOL: { unless: "isReadOnly", to: "ray" },
    SELECTED_LINE_TOOL: { unless: "isReadOnly", to: "line" },
    SELECTED_POLYLINE_TOOL: { unless: "isReadOnly", to: "polyline" },
    SELECTED_RECTANGLE_TOOL: { unless: "isReadOnly", to: "rectangle" },
    TOGGLED_CODE_PANEL_OPEN: "toggleCodePanel",
    TOGGLED_STYLE_PANEL_OPEN: "toggleStylePanel",
    CHANGED_STYLE: ["updateStyles", "applyStylesToSelection"],
    RESET_CAMERA: "resetCamera",
    ZOOMED_TO_FIT: "zoomCameraToFit",
    ZOOMED_TO_SELECTION: {
      if: "hasSelection",
      do: "zoomCameraToSelection",
    },
    ZOOMED_TO_ACTUAL: {
      if: "hasSelection",
      do: "zoomCameraToSelectionActual",
      else: "zoomCameraToActual",
    },
  },
  initial: "loading",
  states: {
    loading: {
      on: {
        MOUNTED: {
          do: ["restoreSavedData", "zoomCameraToFit"],
          to: "ready",
        },
      },
    },
    ready: {
      on: {
        UNMOUNTED: [
          { unless: "isReadOnly", do: "forceSave" },
          { to: "loading" },
        ],
      },
      initial: "selecting",
      states: {
        selecting: {
          on: {
            SAVED: "forceSave",
            UNDO: { do: "undo" },
            REDO: { do: "redo" },
            CANCELLED: { do: "clearSelectedIds" },
            DELETED: { do: "deleteSelectedIds" },
            SAVED_CODE: "saveCode",
            GENERATED_FROM_CODE: ["setCodeControls", "setGeneratedShapes"],
            INCREASED_CODE_FONT_SIZE: "increaseCodeFontSize",
            DECREASED_CODE_FONT_SIZE: "decreaseCodeFontSize",
            CHANGED_CODE_CONTROL: "updateControls",
            ALIGNED: "alignSelection",
            STRETCHED: "stretchSelection",
            DISTRIBUTED: "distributeSelection",
            MOVED: "moveSelection",
          },
          initial: "notPointing",
          states: {
            notPointing: {
              on: {
                SELECTED_ALL: "selectAll",
                POINTED_CANVAS: { to: "brushSelecting" },
                POINTED_BOUNDS: { to: "pointingBounds" },
                POINTED_BOUNDS_HANDLE: {
                  if: "isPointingRotationHandle",
                  to: "rotatingSelection",
                  else: { to: "transformingSelection" },
                },
                MOVED_OVER_SHAPE: {
                  if: "pointHitsShape",
                  then: {
                    unless: "shapeIsHovered",
                    do: "setHoveredId",
                  },
                  else: { if: "shapeIsHovered", do: "clearHoveredId" },
                },
                UNHOVERED_SHAPE: "clearHoveredId",
                POINTED_SHAPE: [
                  {
                    if: "isPressingMetaKey",
                    to: "brushSelecting",
                  },
                  "setPointedId",
                  {
                    unless: "isPointedShapeSelected",
                    then: {
                      if: "isPressingShiftKey",
                      do: ["pushPointedIdToSelectedIds", "clearPointedId"],
                      else: ["clearSelectedIds", "pushPointedIdToSelectedIds"],
                    },
                  },
                  {
                    to: "pointingBounds",
                  },
                ],
              },
            },
            pointingBounds: {
              on: {
                STOPPED_POINTING: [
                  {
                    if: "isPressingShiftKey",
                    then: {
                      if: "isPointedShapeSelected",
                      do: "pullPointedIdFromSelectedIds",
                    },
                    else: {
                      unless: "isPointingBounds",
                      do: ["clearSelectedIds", "pushPointedIdToSelectedIds"],
                    },
                  },
                  { to: "notPointing" },
                ],
                MOVED_POINTER: {
                  unless: "isReadOnly",
                  if: "distanceImpliesDrag",
                  to: "draggingSelection",
                },
              },
            },
            rotatingSelection: {
              onEnter: "startRotateSession",
              onExit: "clearBoundsRotation",
              on: {
                MOVED_POINTER: "updateRotateSession",
                PANNED_CAMERA: "updateRotateSession",
                PRESSED_SHIFT_KEY: "keyUpdateRotateSession",
                RELEASED_SHIFT_KEY: "keyUpdateRotateSession",
                STOPPED_POINTING: { do: "completeSession", to: "selecting" },
                CANCELLED: { do: "cancelSession", to: "selecting" },
              },
            },
            transformingSelection: {
              onEnter: "startTransformSession",
              on: {
                MOVED_POINTER: "updateTransformSession",
                PANNED_CAMERA: "updateTransformSession",
                PRESSED_SHIFT_KEY: "keyUpdateTransformSession",
                RELEASED_SHIFT_KEY: "keyUpdateTransformSession",
                STOPPED_POINTING: { do: "completeSession", to: "selecting" },
                CANCELLED: { do: "cancelSession", to: "selecting" },
              },
            },
            draggingSelection: {
              onEnter: "startTranslateSession",
              on: {
                MOVED_POINTER: "updateTranslateSession",
                PANNED_CAMERA: "updateTranslateSession",
                PRESSED_SHIFT_KEY: "keyUpdateTranslateSession",
                RELEASED_SHIFT_KEY: "keyUpdateTranslateSession",
                PRESSED_ALT_KEY: "keyUpdateTranslateSession",
                RELEASED_ALT_KEY: "keyUpdateTranslateSession",
                STOPPED_POINTING: { do: "completeSession", to: "selecting" },
                CANCELLED: { do: "cancelSession", to: "selecting" },
              },
            },
            brushSelecting: {
              onEnter: [
                {
                  unless: ["isPressingMetaKey", "isPressingShiftKey"],
                  do: "clearSelectedIds",
                },
                "clearBoundsRotation",
                "startBrushSession",
              ],
              on: {
                MOVED_POINTER: "updateBrushSession",
                PANNED_CAMERA: "updateBrushSession",
                STOPPED_POINTING: { do: "completeSession", to: "selecting" },
                CANCELLED: { do: "cancelSession", to: "selecting" },
              },
            },
          },
        },
        dot: {
          initial: "creating",
          states: {
            creating: {
              on: {
                POINTED_CANVAS: {
                  get: "newDot",
                  do: "createShape",
                  to: "dot.editing",
                },
              },
            },
            editing: {
              on: {
                STOPPED_POINTING: { do: "completeSession", to: "selecting" },
                CANCELLED: {
                  do: ["cancelSession", "deleteSelectedIds"],
                  to: "selecting",
                },
              },
              initial: "inactive",
              states: {
                inactive: {
                  on: {
                    MOVED_POINTER: {
                      if: "distanceImpliesDrag",
                      to: "dot.editing.active",
                    },
                  },
                },
                active: {
                  onEnter: "startTranslateSession",
                  on: {
                    MOVED_POINTER: "updateTranslateSession",
                    PANNED_CAMERA: "updateTranslateSession",
                  },
                },
              },
            },
          },
        },
        circle: {
          initial: "creating",
          states: {
            creating: {
              on: {
                POINTED_CANVAS: {
                  to: "circle.editing",
                },
              },
            },
            editing: {
              on: {
                STOPPED_POINTING: { to: "selecting" },
                CANCELLED: { to: "selecting" },
                MOVED_POINTER: {
                  if: "distanceImpliesDrag",
                  then: {
                    get: "newCircle",
                    do: "createShape",
                    to: "drawingShape.bounds",
                  },
                },
              },
            },
          },
        },
        ellipse: {
          initial: "creating",
          states: {
            creating: {
              on: {
                CANCELLED: { to: "selecting" },
                POINTED_CANVAS: {
                  to: "ellipse.editing",
                },
              },
            },
            editing: {
              on: {
                STOPPED_POINTING: { to: "selecting" },
                CANCELLED: { to: "selecting" },
                MOVED_POINTER: {
                  if: "distanceImpliesDrag",
                  then: {
                    get: "newEllipse",
                    do: "createShape",
                    to: "drawingShape.bounds",
                  },
                },
              },
            },
          },
        },
        rectangle: {
          initial: "creating",
          states: {
            creating: {
              on: {
                CANCELLED: { to: "selecting" },
                POINTED_CANVAS: {
                  to: "rectangle.editing",
                },
              },
            },
            editing: {
              on: {
                STOPPED_POINTING: { to: "selecting" },
                CANCELLED: { to: "selecting" },
                MOVED_POINTER: {
                  if: "distanceImpliesDrag",
                  then: {
                    get: "newRectangle",
                    do: "createShape",
                    to: "drawingShape.bounds",
                  },
                },
              },
            },
          },
        },
        ray: {
          initial: "creating",
          states: {
            creating: {
              on: {
                CANCELLED: { to: "selecting" },
                POINTED_CANVAS: {
                  get: "newRay",
                  do: "createShape",
                  to: "ray.editing",
                },
              },
            },
            editing: {
              on: {
                STOPPED_POINTING: { to: "selecting" },
                CANCELLED: { to: "selecting" },
                MOVED_POINTER: {
                  if: "distanceImpliesDrag",
                  to: "drawingShape.direction",
                },
              },
            },
          },
        },
        line: {
          initial: "creating",
          states: {
            creating: {
              on: {
                CANCELLED: { to: "selecting" },
                POINTED_CANVAS: {
                  get: "newLine",
                  do: "createShape",
                  to: "line.editing",
                },
              },
            },
            editing: {
              on: {
                STOPPED_POINTING: { to: "selecting" },
                CANCELLED: { to: "selecting" },
                MOVED_POINTER: {
                  if: "distanceImpliesDrag",
                  to: "drawingShape.direction",
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
        STOPPED_POINTING: {
          do: "completeSession",
          to: "selecting",
        },
        CANCELLED: {
          do: ["cancelSession", "deleteSelectedIds"],
          to: "selecting",
        },
      },
      initial: "drawingShapeBounds",
      states: {
        bounds: {
          onEnter: "startDrawTransformSession",
          on: {
            MOVED_POINTER: "updateTransformSession",
            PANNED_CAMERA: "updateTransformSession",
          },
        },
        direction: {
          onEnter: "startDirectionSession",
          on: {
            MOVED_POINTER: "updateDirectionSession",
            PANNED_CAMERA: "updateDirectionSession",
          },
        },
      },
    },
  },
  results: {
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
      return payload.target === "bounds"
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
      payload: { target: Edge | Corner | "rotate" }
    ) {
      return payload.target === "rotate"
    },
    hasSelection(data) {
      return data.selectedIds.size > 0
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

      getShapeUtils(shape).setChildIndex(shape, childIndex)

      getPage(data).shapes[shape.id] = shape

      data.selectedIds.clear()
      data.selectedIds.add(shape.id)
    },
    /* -------------------- Sessions -------------------- */

    // Shared
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

    /* --------------------- Camera --------------------- */

    resetCamera(data) {
      data.camera.zoom = 1
      data.camera.point = [window.innerWidth / 2, window.innerHeight / 2]

      document.documentElement.style.setProperty("--camera-zoom", "1")
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
    panCamera(data, payload: { delta: number[]; point: number[] }) {
      const { camera } = data
      data.camera.point = vec.sub(
        camera.point,
        vec.div(payload.delta, camera.zoom)
      )
    },
    deleteSelectedIds(data) {
      commands.deleteSelected(data)
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

    // Data
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
          console.error("Could not find that shape! Clearing selected IDs.")
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
