import { createSelectorHook, createState } from "@state-designer/react"
import { clamp, getCommonBounds, screenToWorld } from "utils/utils"
import * as vec from "utils/vec"
import {
  Data,
  PointerInfo,
  Shape,
  ShapeType,
  Shapes,
  TransformCorner,
  TransformEdge,
} from "types"
import { defaultDocument } from "./data"
import shapeUtilityMap, { getShapeUtils } from "lib/shapes"
import history from "state/history"
import * as Sessions from "./sessions"
import commands from "./commands"

const initialData: Data = {
  isReadOnly: false,
  settings: {
    fontSize: 13,
    darkMode: false,
  },
  camera: {
    point: [0, 0],
    zoom: 1,
  },
  brush: undefined,
  pointedId: null,
  hoveredId: null,
  selectedIds: new Set([]),
  currentPageId: "page0",
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
  },
  initial: "selecting",
  states: {
    selecting: {
      on: {
        UNDO: { do: "undo" },
        REDO: { do: "redo" },
        CANCELLED: { do: "clearSelectedIds" },
        DELETED: { do: "deleteSelectedIds" },
        GENERATED_SHAPES_FROM_CODE: "setGeneratedShapes",
        INCREASED_CODE_FONT_SIZE: "increaseCodeFontSize",
        DECREASED_CODE_FONT_SIZE: "decreaseCodeFontSize",
      },
      initial: "notPointing",
      states: {
        notPointing: {
          on: {
            POINTED_CANVAS: { to: "brushSelecting" },
            POINTED_BOUNDS: { to: "pointingBounds" },
            POINTED_BOUNDS_EDGE: { to: "transformingSelection" },
            POINTED_BOUNDS_CORNER: { to: "transformingSelection" },
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
                then: {
                  if: "isPointedShapeSelected",
                  do: "pullPointedIdFromSelectedIds",
                  else: {
                    do: "pushPointedIdToSelectedIds",
                    to: "pointingBounds",
                  },
                },
                else: [
                  {
                    unless: "isPointedShapeSelected",
                    do: ["clearSelectedIds", "pushPointedIdToSelectedIds"],
                  },
                  {
                    to: "pointingBounds",
                  },
                ],
              },
            ],
          },
        },
        pointingBounds: {
          on: {
            STOPPED_POINTING: [
              {
                unless: ["isPointingBounds", "isPressingShiftKey"],
                do: ["clearSelectedIds", "pushPointedIdToSelectedIds"],
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
            STOPPED_POINTING: { do: "completeSession", to: "selecting" },
            CANCELLED: { do: "cancelSession", to: "selecting" },
          },
        },
        brushSelecting: {
          onEnter: [
            { unless: "isPressingShiftKey", do: "clearSelectedIds" },
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
    circle: {},
    ellipse: {},
    ray: {
      initial: "creating",
      states: {
        creating: {
          on: {
            POINTED_CANVAS: {
              do: "createRay",
              to: "ray.editing",
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
                  to: "ray.editing.active",
                },
              },
            },
            active: {
              onEnter: "startDirectionSession",
              on: {
                MOVED_POINTER: "updateDirectionSession",
                PANNED_CAMERA: "updateDirectionSession",
              },
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
            POINTED_CANVAS: {
              do: "createLine",
              to: "line.editing",
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
                  to: "line.editing.active",
                },
              },
            },
            active: {
              onEnter: "startDirectionSession",
              on: {
                MOVED_POINTER: "updateDirectionSession",
                PANNED_CAMERA: "updateDirectionSession",
              },
            },
          },
        },
      },
    },
    polyline: {},
    rectangle: {},
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

      commands.createShape(data, shape)
      data.selectedIds.add(shape.id)
    },

    // Ray
    createRay(data, payload: PointerInfo) {
      const shape = shapeUtilityMap[ShapeType.Ray].create({
        point: screenToWorld(payload.point, data),
      })

      commands.createShape(data, shape)
      data.selectedIds.add(shape.id)
    },

    // Line
    createLine(data, payload: PointerInfo) {
      const shape = shapeUtilityMap[ShapeType.Line].create({
        point: screenToWorld(payload.point, data),
        direction: [0, 1],
      })

      commands.createShape(data, shape)
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

    // Dragging / Translating
    startTranslateSession(data, payload: PointerInfo) {
      session = new Sessions.TranslateSession(
        data,
        screenToWorld(payload.point, data)
      )
    },
    updateTranslateSession(data, payload: PointerInfo) {
      session.update(data, screenToWorld(payload.point, data))
    },

    // Dragging / Translating
    startTransformSession(
      data,
      payload: PointerInfo & { target: TransformCorner | TransformEdge }
    ) {
      session = new Sessions.TransformSession(
        data,
        payload.target,
        screenToWorld(payload.point, data)
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
      const shapes = document.pages[currentPageId].shapes

      data.selectedIds.forEach((id) => {
        delete shapes[id]
        // TODO: recursively delete children
      })

      data.selectedIds.clear()
      data.hoveredId = undefined
      data.pointedId = undefined
    },

    /* ---------------------- Misc ---------------------- */

    // History
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

    // Code
    setGeneratedShapes(data, payload: { shapes: Shape[] }) {
      commands.generateShapes(data, data.currentPageId, payload.shapes)
    },
    increaseCodeFontSize(data) {
      data.settings.fontSize++
    },
    decreaseCodeFontSize(data) {
      data.settings.fontSize--
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

      const shapes = Array.from(selectedIds.values()).map(
        (id) => pages[currentPageId].shapes[id]
      )

      if (selectedIds.size === 0) return null

      if (selectedIds.size === 1 && !getShapeUtils(shapes[0]).canTransform) {
        return null
      }

      return getCommonBounds(
        ...shapes.map((shape) => getShapeUtils(shape).getBounds(shape))
      )
    },
  },
})

let session: Sessions.BaseSession

export default state

export const useSelector = createSelectorHook(state)
