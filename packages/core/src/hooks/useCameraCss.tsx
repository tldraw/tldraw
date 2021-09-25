/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import type { TLPageState } from '+types'

export function useCameraCss(
  layerRef: React.RefObject<HTMLDivElement>,
  camera: TLPageState['camera']
) {
  // Update the tl-zoom CSS variable when the zoom changes
  const rZoom = React.useRef(camera.zoom)

  React.useLayoutEffect(() => {
    const {
      zoom,
      point: [x, y],
    } = camera

    const layer = layerRef.current

    if (zoom !== rZoom.current) {
      rZoom.current = zoom

      if (layer) {
        layer.style.setProperty('--tl-zoom', zoom.toString())
      }
    }

    if (layer) {
      layer.style.setProperty('transform', `scale(${zoom}) translate(${x}px, ${y}px)`)
    }
  }, [camera])
}
