import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { useBoundsHandleEvents } from '~hooks'
import { TLBounds, TLBoundsEdge } from '~types'

const edgeClassnames = {
  [TLBoundsEdge.Top]: 'tl-cursor-ns',
  [TLBoundsEdge.Right]: 'tl-cursor-ew',
  [TLBoundsEdge.Bottom]: 'tl-cursor-ns',
  [TLBoundsEdge.Left]: 'tl-cursor-ew',
}

interface EdgeHandleProps {
  targetSize: number
  size: number
  bounds: TLBounds
  edge: TLBoundsEdge
  isHidden: boolean
}

export const EdgeHandle = observer<EdgeHandleProps>(function EdgeHandle({
  size,
  isHidden,
  bounds,
  edge,
}: EdgeHandleProps) {
  const events = useBoundsHandleEvents(edge)

  const isHorizontal = edge === TLBoundsEdge.Top || edge === TLBoundsEdge.Bottom
  const isFarEdge = edge === TLBoundsEdge.Right || edge === TLBoundsEdge.Bottom

  const { height, width } = bounds

  return (
    <rect
      pointerEvents={isHidden ? 'none' : 'all'}
      className={'tl-transparent tl-edge-handle ' + (isHidden ? '' : edgeClassnames[edge])}
      aria-label={`${edge} handle`}
      opacity={isHidden ? 0 : 1}
      x={isHorizontal ? size / 2 : (isFarEdge ? width + 1 : -1) - size / 2}
      y={isHorizontal ? (isFarEdge ? height + 1 : -1) - size / 2 : size / 2}
      width={isHorizontal ? Math.max(0, width + 1 - size) : size}
      height={isHorizontal ? size : Math.max(0, height + 1 - size)}
      {...events}
    />
  )
})
