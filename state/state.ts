import { createSelectorHook, createState } from "@state-designer/react"
import { clamp, screenToWorld } from "utils/utils"
import * as vec from "utils/vec"
import { Data, ShapeType } from "types"

const initialData: Data = {
  camera: {
    point: [0, 0],
    zoom: 1,
  },
  currentPageId: "page0",
  document: {
    pages: {
      page0: {
        id: "page0",
        type: "page",
        name: "Page 0",
        childIndex: 0,
        shapes: {
          shape0: {
            id: "shape0",
            type: ShapeType.Circle,
            name: "Shape 0",
            parentId: "page0",
            childIndex: 1,
            point: [100, 100],
            radius: 50,
            rotation: 0,
          },
          shape1: {
            id: "shape1",
            type: ShapeType.Rectangle,
            name: "Shape 1",
            parentId: "page0",
            childIndex: 1,
            point: [300, 300],
            size: [200, 200],
            rotation: 0,
          },
          shape2: {
            id: "shape2",
            type: ShapeType.Circle,
            name: "Shape 2",
            parentId: "page0",
            childIndex: 2,
            point: [200, 800],
            radius: 25,
            rotation: 0,
          },
        },
      },
    },
  },
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
  actions: {
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
    },
    panCamera(data, payload: { delta: number[]; point: number[] }) {
      const { camera } = data
      data.camera.point = vec.sub(
        camera.point,
        vec.div(payload.delta, camera.zoom)
      )
    },
  },
})

export default state

export const useSelector = createSelectorHook(state)
