import { createSelectorHook, createState } from "@state-designer/react"
import { clamp, screenToWorld } from "utils/utils"
import * as vec from "utils/vec"
import { Data } from "types"
import { defaultDocument } from "./data"
import * as Sessions from "./sessions"

const initialData: Data = {
  camera: {
    point: [0, 0],
    zoom: 1,
  },
  brush: undefined,
  pointedId: null,
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
  },
  initial: "selecting",
  states: {
    selecting: {
      on: {
        POINTED_CANVAS: { to: "brushSelecting" },
        POINTED_SHAPE: [
          "setPointedId",
          {
            if: "isPressingShiftKey",
            then: {
              if: "isPointedShapeSelected",
              do: "pullPointedIdFromSelectedIds",
              else: "pushPointedIdToSelectedIds",
            },
            else: ["clearSelectedIds", "pushPointedIdToSelectedIds"],
          },
        ],
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
  conditions: {
    isPointedShapeSelected(data) {
      return data.selectedIds.has(data.pointedId)
    },
    isPressingShiftKey(data, payload: { shiftKey: boolean }) {
      return payload.shiftKey
    },
  },
  actions: {
    cancelSession(data) {
      session.cancel(data)
      session = undefined
    },
    completeSession(data) {
      session.complete(data)
      session = undefined
    },
    startBrushSession(data, payload: { point: number[] }) {
      session = new Sessions.BrushSession(
        data,
        screenToWorld(payload.point, data)
      )
    },
    updateBrushSession(data, payload: { point: number[] }) {
      session.update(data, screenToWorld(payload.point, data))
    },
    // Selection
    setPointedId(data, payload: { id: string }) {
      data.pointedId = payload.id
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
  },
  values: {
    selectedIds(data) {
      return new Set(data.selectedIds)
    },
  },
})

let session: Sessions.BaseSession

export default state

export const useSelector = createSelectorHook(state)
