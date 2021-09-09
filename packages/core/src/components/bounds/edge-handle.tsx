import * as React from 'react'
import { useBoundsHandleEvents } from '+hooks'
import { TLBoundsEdge, TLBounds } from '+types'

const edgeClassnames = {
  [TLBoundsEdge.Top]: 'tl-transparent tl-cursor-ns',
  [TLBoundsEdge.Right]: 'tl-transparent tl-cursor-ew',
  [TLBoundsEdge.Bottom]: 'tl-transparent tl-cursor-ns',
  [TLBoundsEdge.Left]: 'tl-transparent tl-cursor-ew',
}

interface EdgeHandleProps {
  targetSize: number
  size: number
  bounds: TLBounds
  edge: TLBoundsEdge
}

export const EdgeHandle = React.memo(({ size, bounds, edge }: EdgeHandleProps): JSX.Element => {
  const events = useBoundsHandleEvents(edge)

  const isHorizontal = edge === TLBoundsEdge.Top || edge === TLBoundsEdge.Bottom
  const isFarEdge = edge === TLBoundsEdge.Right || edge === TLBoundsEdge.Bottom

  const { height, width } = bounds

  return (
    <rect
      className={edgeClassnames[edge]}
      x={isHorizontal ? size / 2 : (isFarEdge ? width + 1 : -1) - size / 2}
      y={isHorizontal ? (isFarEdge ? height + 1 : -1) - size / 2 : size / 2}
      width={isHorizontal ? Math.max(0, width + 1 - size) : size}
      height={isHorizontal ? size : Math.max(0, height + 1 - size)}
      {...events}
    />
  )
})
