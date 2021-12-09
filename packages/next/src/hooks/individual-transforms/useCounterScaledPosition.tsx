/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import type { TLNuBounds } from '~types'

export function useCounterScaledPosition(
  ref: React.RefObject<HTMLElement>,
  bounds: TLNuBounds,
  camera: { point: number[]; zoom: number },
  zIndex: number
) {
  const {
    point: [x, y],
    zoom,
  } = camera

  const rWidth = React.useRef(0)
  const rHeight = React.useRef(0)

  React.useLayoutEffect(() => {
    const elm = ref.current!
    rWidth.current = (bounds.width + 128 * (1 / zoom)) * zoom
    rHeight.current = (bounds.height + 128 * (1 / zoom)) * zoom
    elm.style.setProperty('width', `${rWidth.current}px`)
    elm.style.setProperty('height', `${rHeight.current}px`)
    if (zIndex !== undefined) {
      elm.style.setProperty('z-index', zIndex?.toString())
    }
  }, [bounds.width, bounds.height, zIndex, zoom])

  React.useLayoutEffect(() => {
    const elm = ref.current!
    let transform = `
      translate(
        ${(x + bounds.minX - 64 * (1 / zoom)) * zoom}px,
        ${(y + bounds.minY - 64 * (1 / zoom)) * zoom}px
      )`
    if (bounds.rotation !== 0) {
      transform += `translate(${rWidth.current / 2}px, ${rHeight.current / 2}px)
      rotate(${bounds.rotation || 0}rad)
      translate(${-rWidth.current / 2}px, ${-rHeight.current / 2}px)`
    }
    elm.style.setProperty('transform', transform)
  }, [bounds.minX, bounds.minY, bounds.rotation, x, y, zoom])
}
