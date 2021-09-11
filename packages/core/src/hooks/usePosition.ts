/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import type { TLBounds } from '+types'

export function usePosition(bounds: TLBounds, rotation = 0) {
  const rBounds = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const elm = rBounds.current!
    const transform = `
    translate(calc(${bounds.minX}px - var(--tl-padding)),calc(${bounds.minY}px - var(--tl-padding)))
    rotate(${rotation + (bounds.rotation || 0)}rad)
    `
    elm.style.setProperty('transform', transform)
    elm.style.setProperty('width', `calc(${bounds.width}px + (var(--tl-padding) * 2))`)
    elm.style.setProperty('height', `calc(${bounds.height}px + (var(--tl-padding) * 2))`)
  }, [rBounds, bounds, rotation])

  return rBounds
}
