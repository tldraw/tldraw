import { autorun } from 'mobx'
import * as React from 'react'
import type { TLPageState } from '~types'

export function useCameraCss(
  layerRef: React.RefObject<HTMLDivElement>,
  containerRef: React.ForwardedRef<HTMLDivElement>,
  pageState: TLPageState
) {
  // Update the tl-zoom CSS variable when the zoom changes
  const rZoom = React.useRef<number>()
  const rPoint = React.useRef<number[]>()

  React.useLayoutEffect(() => {
    return autorun(() => {
      const { zoom, point } = pageState.camera

      const didZoom = zoom !== rZoom.current
      const didPan = point !== rPoint.current

      rZoom.current = zoom
      rPoint.current = point

      if (didZoom || didPan) {
        const layer = layerRef.current
        if (containerRef && 'current' in containerRef) {
          const container = containerRef.current

          // If we zoomed, set the CSS variable for the zoom
          if (didZoom) {
            if (container) {
              container.style.setProperty('--tl-zoom', zoom.toString())
            }
          }

          // Either way, position the layer
          if (layer) {
            layer.style.setProperty(
              'transform',
              `scale(${zoom}) translateX(${point[0]}px) translateY(${point[1]}px)`
            )
          }
        }
      }
    })
  }, [pageState])
}
