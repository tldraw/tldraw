/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import type { TLNuBounds } from '~types'
import { useContext } from '~hooks'

export function usePosition(ref: React.RefObject<HTMLElement>, bounds: TLNuBounds, zIndex: number) {
  const {
    viewport: {
      camera: {
        point: [x, y],
        zoom,
      },
    },
  } = useContext()

  const rWidth = React.useRef(0)
  const rHeight = React.useRef(0)

  React.useLayoutEffect(() => {
    const elm = ref.current!
    rWidth.current = bounds.width + 128 * (1 / zoom)
    rHeight.current = bounds.height + 128 * (1 / zoom)

    elm.style.setProperty('width', `${rWidth.current}px`)
    elm.style.setProperty('height', `${rHeight.current}px`)

    if (zIndex !== undefined) {
      elm.style.setProperty('z-index', zIndex?.toString())
    }
  }, [bounds.width, bounds.height, zIndex, zoom])

  React.useLayoutEffect(() => {
    const elm = ref.current!

    let transform = `
      scale(${zoom})
      translate3d(
        ${x + bounds.minX - 64 * (1 / zoom)}px,
        ${y + bounds.minY - 64 * (1 / zoom)}px,
        0
      )`

    if (bounds.rotation !== 0) {
      transform += `translate3d(${rWidth.current / 2}px, ${rHeight.current / 2}px,
      0)
      rotate(${bounds.rotation || 0}rad)
      translate(${-rWidth.current / 2}px, ${-rHeight.current / 2}px)`
    }

    elm.style.setProperty('transform', transform)
  }, [bounds.minX, bounds.minY, bounds.rotation, x, y, zoom])
}
