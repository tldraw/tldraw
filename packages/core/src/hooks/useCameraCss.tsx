/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import type { TLPageState } from '+types'

export function useCameraCss(
  layerRef: React.RefObject<HTMLDivElement>,
  containerRef: React.RefObject<HTMLDivElement>,
  pageState: TLPageState
) {
  // Update the tl-zoom CSS variable when the zoom changes
  const rZoom = React.useRef(pageState.camera.zoom)
  const rPoint = React.useRef(pageState.camera.point)

  React.useLayoutEffect(() => {
    const { zoom, point } = pageState.camera

    const didZoom = zoom !== rZoom.current
    const didPan = point !== rPoint.current

    rZoom.current = zoom
    rPoint.current = point

    if (didZoom || didPan) {
      // If we zoomed, set the CSS variable for the zoom
      if (didZoom) {
        const container = containerRef.current
        if (container) {
          container.style.setProperty('--tl-zoom', zoom.toString())
        }
      }

      // Either way, position the layer
      const layer = layerRef.current
      if (layer) {
        layer.style.setProperty(
          'transform',
          `scale(${zoom}) translateX(${point[0]}px) translateY(${point[1]}px)`
        )
      }
    }
  }, [pageState.camera])
}
