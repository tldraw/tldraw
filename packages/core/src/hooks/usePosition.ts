import { autorun } from 'mobx'
import * as React from 'react'
import type { TLBounds } from '~types'

export function usePosition(bounds: TLBounds, rotation = 0) {
  const rBounds = React.useRef<HTMLDivElement>(null)

  // Update the transform
  React.useLayoutEffect(() => {
    return autorun(() => {
      const elm = rBounds.current!
      const transform = `
    translate(
      calc(${bounds.minX}px - var(--tl-padding)),
      calc(${bounds.minY}px - var(--tl-padding))
    )
    rotate(${rotation + (bounds.rotation || 0)}rad)`
      elm.style.setProperty('transform', transform)
      elm.style.setProperty(
        'width',
        `calc(${Math.floor(bounds.width)}px + (var(--tl-padding) * 2))`
      )
      elm.style.setProperty(
        'height',
        `calc(${Math.floor(bounds.height)}px + (var(--tl-padding) * 2))`
      )
    })
  }, [bounds, rotation])

  return rBounds
}
