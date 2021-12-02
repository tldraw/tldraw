import { autorun } from 'mobx'
import * as React from 'react'
import type { TLNuViewport } from '~nu-lib'

export function useCameraCss(
  containerRef: React.ForwardedRef<HTMLDivElement>,
  viewport: TLNuViewport
) {
  // Update the tl-zoom CSS variable when the zoom changes
  const rZoom = React.useRef<number>()

  React.useLayoutEffect(() => {
    return autorun(() => {
      const { zoom } = viewport.camera
      const didZoom = zoom !== rZoom.current
      rZoom.current = zoom

      if (didZoom) {
        if (containerRef && 'current' in containerRef) {
          const container = containerRef.current

          // If we zoomed, set the CSS variable for the zoom
          if (container) {
            console.log('updating zoom css')
            container.style.setProperty('--tl-zoom', zoom.toString())
          }
        }
      }
    })
  }, [])
}
