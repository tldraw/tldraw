/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import type { TLPageState } from '+types'

export function useCameraCss(ref: React.RefObject<HTMLDivElement>, pageState: TLPageState) {
  const rGroup = React.useRef<SVGGElement>(null)

  // Update the tl-zoom CSS variable when the zoom changes
  React.useEffect(() => {
    ref.current!.style.setProperty('--tl-zoom', pageState.camera.zoom.toString())
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
