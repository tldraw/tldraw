import { createSelectorHook, createState } from "@state-designer/react"
import { clamp, getCommonBounds, screenToWorld } from "utils/utils"
import * as vec from "utils/vec"
import {
  Data,
  PointerInfo,
  Shape,
  ShapeType,
  TransformCorner,
  TransformEdge,
  CodeControl,
} from "types"
import inputs from "./inputs"
import { defaultDocument } from "./data"
import shapeUtilityMap, { getShapeUtils } from "lib/shapes"
import history from "state/history"
import * as Sessions from "./sessions"
import commands from "./commands"
import { updateFromCode } from "lib/code/generate"

const initialData: Data = {
  isReadOnly: false,
  settings: {
    fontSize: 13,
    isDarkMode: false,
    isCodeOpen: false,
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
    RESET_CAMERA: "resetCamera",
  },
  initial: "loading",
  states: {
    loading: {
      on: {
        MOUNTED: {
          do: "restoreSavedData",
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
          },
          initial: "notPointing",
          states: {
            notPointing: {
              on: {
                SELECTED_ALL: "selectAll",
                POINTED_CANVAS: { to: "brushSelecting" },
                POINTED_BOUNDS: { to: "pointingBounds" },
                POINTED_BOUNDS_EDGE: { to: "transformingSelection" },
                POINTED_BOUNDS_CORNER: { to: "transformingSelection" },
                POINTED_ROTATE_HANDLE: { to: "rotatingSelection" },
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
                  "setPointedId",
                  {
                    if: "isPressingShiftKey",
                    unless: "isPointedShapeSelected",
                    do: ["pushPointedIdToSelectedIds", "clearPointedId"],
                    to: "pointingBounds",
                  },
                  {
                    unless: "isPointedShapeSelected",
                    do: ["clearSelectedIds", "pushPointedIdToSelectedIds"],
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
                      if: "isPointingBounds",
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
              on: {
                MOVED_POINTER: "updateRotateSession",
                PANNED_CAMERA: "updateRotateSession",
                STOPPED_POINTING: { do: "completeSession", to: "selecting" },
                CANCELLED: { do: "cancelSession", to: "selecting" },
              },
            },
            transformingSelection: {
              onEnter: "startTransformSession",
              on: {
                MOVED_POINTER: "updateTransformSession",
                PANNED_CAMERA: "updateTransformSession",
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
                { unless: "isPressingShiftKey", do: "clearSelectedIds" },
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
                  do: "createDot",
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
                  do: "createCircle",
                  to: "drawingShape.bounds",
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
                  do: "createEllipse",
                  to: "drawingShape.bounds",
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
                  do: "createRectangle",
                  to: "drawingShape.bounds",
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
                  do: "createRay",
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
                  do: "createLine",
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
  conditions: {
    isPointingBounds(data, payload: PointerInfo) {
      return payload.target === "bounds"
    },
    isReadOnly(data) {
      return data.isReadOnly
    },
    distanceImpliesDrag(data, payload: PointerInfo) {
      return vec.dist2(payload.origin, payload.point) > 16
    },
    isPointedShapeSelected(data) {
      return data.selectedIds.has(data.pointedId)
    },
    isPressingShiftKey(data, payload: { shiftKey: boolean }) {
      return payload.shiftKey
    },
    shapeIsHovered(data, payload: { target: string }) {
      return data.hoveredId === payload.target
    },
    pointHitsShape(data, payload: { target: string; point: number[] }) {
      const shape =
        data.document.pages[data.currentPageId].shapes[payload.target]

      return getShapeUtils(shape).hitTest(
        shape,
        screenToWorld(payload.point, data)
      )
    },
  },
  actions: {
    /* --------------------- Shapes --------------------- */

    // Dot
    createDot(data, payload: PointerInfo) {
      const shape = shapeUtilityMap[ShapeType.Dot].create({
        point: screenToWorld(payload.point, data),
      })

      data.document.pages[data.currentPageId].shapes[shape.id] = shape
      data.selectedIds.clear()
      data.selectedIds.add(shape.id)
    },

    // Ray
    createRay(data, payload: PointerInfo) {
      const shape = shapeUtilityMap[ShapeType.Ray].create({
        point: screenToWorld(payload.point, data),
      })

      data.document.pages[data.currentPageId].shapes[shape.id] = shape
      data.selectedIds.clear()
      data.selectedIds.add(shape.id)
    },

    // Line
    createLine(data, payload: PointerInfo) {
      const shape = shapeUtilityMap[ShapeType.Line].create({
        point: screenToWorld(payload.point, data),
        direction: [0, 1],
      })

      data.document.pages[data.currentPageId].shapes[shape.id] = shape
      data.selectedIds.clear()
      data.selectedIds.add(shape.id)
    },

    createCircle(data, payload: PointerInfo) {
      const shape = shapeUtilityMap[ShapeType.Circle].create({
        point: screenToWorld(payload.point, data),
        radius: 1,
      })

      data.document.pages[data.currentPageId].shapes[shape.id] = shape
      data.selectedIds.clear()
      data.selectedIds.add(shape.id)
    },

    createEllipse(data, payload: PointerInfo) {
      const shape = shapeUtilityMap[ShapeType.Ellipse].create({
        point: screenToWorld(payload.point, data),
        radiusX: 1,
        radiusY: 1,
      })

      data.document.pages[data.currentPageId].shapes[shape.id] = shape
      data.selectedIds.clear()
      data.selectedIds.add(shape.id)
    },

    createRectangle(data, payload: PointerInfo) {
      const shape = shapeUtilityMap[ShapeType.Rectangle].create({
        point: screenToWorld(payload.point, data),
        size: [1, 1],
      })

      data.document.pages[data.currentPageId].shapes[shape.id] = shape
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
    updateRotateSession(data, payload: PointerInfo) {
      session.update(data, screenToWorld(payload.point, data))
    },

    // Dragging / Translating
    startTranslateSession(data, payload: PointerInfo) {
      session = new Sessions.TranslateSession(
        data,
        screenToWorld(payload.point, data),
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
      console.log(payload.altKey)
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
      payload: PointerInfo & { target: TransformCorner | TransformEdge }
    ) {
      session =
        data.selectedIds.size === 1
          ? new Sessions.TransformSingleSession(
              data,
              payload.target,
              screenToWorld(payload.point, data)
            )
          : new Sessions.TransformSession(
              data,
              payload.target,
              screenToWorld(payload.point, data)
            )
    },
    startDrawTransformSession(data, payload: PointerInfo) {
      session = new Sessions.TransformSingleSession(
        data,
        TransformCorner.BottomRight,
        screenToWorld(payload.point, data),
        true
      )
    },
    updateTransformSession(data, payload: PointerInfo) {
      session.update(data, screenToWorld(payload.point, data))
    },

    // Direction
    startDirectionSession(data, payload: PointerInfo) {
      session = new Sessions.DirectionSession(
        data,
        screenToWorld(payload.point, data)
      )
    },
    updateDirectionSession(data, payload: PointerInfo) {
      session.update(data, screenToWorld(payload.point, data))
    },

    /* -------------------- Selection ------------------- */

    selectAll(data) {
      const { selectedIds, document, currentPageId } = data
      selectedIds.clear()
      for (let id in document.pages[currentPageId].shapes) {
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
    // Camera
    resetCamera(data) {
      data.camera.zoom = 1
      data.camera.point = [window.innerWidth / 2, window.innerHeight / 2]

      document.documentElement.style.setProperty("--camera-zoom", "1")
    },
    zoomCamera(data, payload: { delta: number; point: number[] }) {
      const { camera } = data
      const p0 = screenToWorld(payload.point, data)
      camera.zoom = clamp(
        camera.zoom - (payload.delta / 100) * camera.zoom,
        0.5,
        3
      )
      const p1 = screenToWorld(payload.point, data)
      camera.point = vec.add(camera.point, vec.sub(p1, p0))

      document.documentElement.style.setProperty(
        "--camera-zoom",
        camera.zoom.toString()
      )
    },
    panCamera(data, payload: { delta: number[]; point: number[] }) {
      const { camera } = data
      data.camera.point = vec.sub(
        camera.point,
        vec.div(payload.delta, camera.zoom)
      )
    },
    deleteSelectedIds(data) {
      const { document, currentPageId } = data
      const { shapes } = document.pages[currentPageId]

      data.hoveredId = undefined
      data.pointedId = undefined

      data.selectedIds.forEach((id) => {
        delete shapes[id]
        // TODO: recursively delete children
      })

      data.document.pages[currentPageId].shapes = shapes
      data.selectedIds.clear()
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
      const {
        selectedIds,
        currentPageId,
        document: { pages },
      } = data

      const shapes = Array.from(selectedIds.values())
        .map((id) => pages[currentPageId].shapes[id])
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
