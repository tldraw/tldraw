/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import type { TLBounds } from '+types'

export function usePosition(bounds: TLBounds, rotation = 0) {
  const rBounds = React.useRef<HTMLDivElement>(null)

  // Update the transform
  React.useLayoutEffect(() => {
    const elm = rBounds.current!

    const transform = `
    translate3d(
      calc(${bounds.minX}px - var(--tl-padding)),
      calc(${bounds.minY}px - var(--tl-padding)), 
      0px
    )
    rotate(${rotation + (bounds.rotation || 0)}rad)`

    elm.style.setProperty('transform', transform)
  }, [bounds.minX, bounds.minY, rotation])

  // Update dimensions
  React.useLayoutEffect(() => {
    const elm = rBounds.current!

    elm.style.setProperty('width', `calc(${Math.floor(bounds.width)}px + (var(--tl-padding) * 2))`)

    elm.style.setProperty(
      'height',
      `calc(${Math.floor(bounds.height)}px + (var(--tl-padding) * 2))`
    )
  }, [bounds.width, bounds.height])

  return rBounds
}
