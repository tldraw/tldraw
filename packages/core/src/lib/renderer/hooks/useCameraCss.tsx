import * as React from 'react'
import { TLPageState } from '../../types'

export function useCameraCss(pageState: TLPageState) {
  const rGroup = React.useRef<SVGGElement>(null)

  // Update the tl-zoom CSS variable when the zoom changes
  React.useEffect(() => {
    document.documentElement.style.setProperty('--tl-zoom', pageState.camera.zoom.toString())
  }, [pageState.camera.zoom])

  // Update the group's position when the camera moves or zooms
  React.useEffect(() => {
    const {
      zoom,
      point: [x = 0, y = 0],
    } = pageState.camera
    rGroup.current?.setAttribute('transform', `scale(${zoom}) translate(${x} ${y})`)
  }, [pageState.camera])

  return rGroup
}
