/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import type { TLPageState } from '+types'

export function useCameraCss(ref: React.RefObject<HTMLDivElement>, pageState: TLPageState) {
  const rLayer = React.useRef<HTMLDivElement>(null)

  // Update the tl-zoom CSS variable when the zoom changes
  React.useEffect(() => {
    ref.current!.style.setProperty('--tl-zoom', pageState.camera.zoom.toString())
  }, [pageState.camera.zoom])

  React.useEffect(() => {
    ref.current!.style.setProperty('--tl-camera-x', pageState.camera.point[0] + 'px')
    ref.current!.style.setProperty('--tl-camera-y', pageState.camera.point[1] + 'px')
  }, [pageState.camera.point])

  // Update the group's position when the camera moves or zooms
  // React.useEffect(() => {
  //   const {
  //     zoom,
  //     point: [x = 0, y = 0],
  //   } = pageState.camera
  //   rLayer.current?.style.setProperty(
  //     'transform',
  //     `scale(${zoom},${zoom}) translate(${x}px,${y}px)`
  //   )
  // }, [pageState.camera])

  return rLayer
}
