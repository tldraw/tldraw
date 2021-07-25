import * as React from 'react'
import { inputs } from '../../../inputs'
import { TLBounds } from '../../../types'
import { Utils } from '../../../utils'
import { useTLContext } from '../../hooks'

interface BoundsBgProps {
  bounds: TLBounds
  rotation: number
}

export function BoundsBg({ bounds, rotation }: BoundsBgProps): JSX.Element {
  const { callbacks } = useTLContext()

  const rBounds = React.useRef<SVGRectElement>(null)

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      const info = inputs.pointerDown(e, 'bounds')

      if (e.button === 0) {
        callbacks.onPointBounds?.(info)
      } else if (e.button === 2) {
        callbacks.onRightPointBounds?.(info)
      }
    },
    [callbacks]
  )

  const handlePointerUp = React.useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()
      e.currentTarget.releasePointerCapture(e.pointerId)
      const info = inputs.pointerUp(e, 'bounds')
      callbacks.onStopPointing?.(info)
    },
    [callbacks]
  )

  const { width, height } = bounds

  const center = Utils.getBoundsCenter(bounds)

  return (
    <rect
      ref={rBounds}
      className="tl-bounds-bg"
      width={Math.max(1, width)}
      height={Math.max(1, height)}
      transform={`
        rotate(${rotation * (180 / Math.PI)},${center})
        translate(${bounds.minX},${bounds.minY})
        rotate(${(bounds.rotation || 0) * (180 / Math.PI)}, 0, 0)`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    />
  )
}
