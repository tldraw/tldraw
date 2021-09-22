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

  React.useLayoutEffect(() => {
    const {
      zoom,
      point: [x, y],
    } = pageState.camera

    if (zoom !== rZoom.current) {
      rZoom.current = zoom

      const container = containerRef.current

      if (container) {
        container.style.setProperty('--tl-zoom', zoom.toString())
      }
    }

    const layer = layerRef.current

    if (layer) {
      layer.style.setProperty('transform', `scale(${zoom}) translate(${x}px, ${y}px)`)
    }
  }, [pageState.camera])
}
