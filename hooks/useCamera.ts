import React, { useEffect } from 'react'
import state from 'state'
import { getCurrentCamera } from 'utils/utils'

/**
 * When the state's camera changes, update the transform of
 * the SVG group to reflect the correct zoom and pan.
 * @param ref
 */
export default function useCamera(ref: React.MutableRefObject<SVGGElement>) {
  useEffect(() => {
    let prev = getCurrentCamera(state.data)

    return state.onUpdate(() => {
      const g = ref.current
      if (!g) return

      const { point, zoom } = getCurrentCamera(state.data)

      if (point !== prev.point || zoom !== prev.zoom) {
        g.setAttribute(
          'transform',
          `scale(${zoom}) translate(${point[0]} ${point[1]})`
        )

        localStorage.setItem(
          'code_slate_camera',
          JSON.stringify({ point, zoom })
        )

        prev = getCurrentCamera(state.data)
      }
    })
  }, [state])
}
