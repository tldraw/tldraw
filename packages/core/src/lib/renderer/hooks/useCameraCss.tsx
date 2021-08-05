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
    const { zoom, point } = pageState.camera
    rGroup.current?.setAttribute('transform', `scale(${zoom}) translate(${point[0]} ${point[1]})`)
  }, [pageState.camera])

  return rGroup
}
