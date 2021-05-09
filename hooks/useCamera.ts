import React, { useEffect } from "react"
import state from "state"

/**
 * When the state's camera changes, update the transform of
 * the SVG group to reflect the correct zoom and pan.
 * @param ref
 */
export default function useCamera(ref: React.MutableRefObject<SVGGElement>) {
  useEffect(() => {
    let { camera } = state.data

    return state.onUpdate(({ data }) => {
      const g = ref.current
      if (!g) return

      const { point, zoom } = data.camera

      if (point !== camera.point || zoom !== camera.zoom) {
        g.setAttribute(
          "transform",
          `scale(${zoom}) translate(${point[0]} ${point[1]})`
        )
      }

      camera = data.camera
    })
  }, [state])
}
