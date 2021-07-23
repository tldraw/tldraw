/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import React, { useEffect } from 'react'
import { useTLState } from './useTLState'

/**
 * When the state's camera changes, update the transform of
 * the SVG group to reflect the correct zoom and pan.
 * @param ref
 */
export function useCamera(ref: React.RefObject<SVGGElement>) {
  const state = useTLState()

  useEffect(() => {
    let prev = state.getCurrentCamera(state.data)

    return state.state.onUpdate(() => {
      const g = ref.current
      if (!g) return

      const { point, zoom } = state.getCurrentCamera(state.data)

      if (point !== prev.point || zoom !== prev.zoom) {
        g.setAttribute(
          'transform',
          `scale(${zoom}) translate(${point[0]} ${point[1]})`
        )

        // storage.savePageState(state.data)

        prev = state.getCurrentCamera(state.data)
      }
    })
  }, [ref, state])
}
