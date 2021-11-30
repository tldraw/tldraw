import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { useContext } from '~hooks/useContext'
import { TLNuBoundsEdge, TLNuTargetType } from '~types'
import { useBoundsEvents } from '~hooks/useBoundsEvents'

const edgeClassnames = {
  [TLNuBoundsEdge.Top]: 'nu-cursor-ns',
  [TLNuBoundsEdge.Right]: 'nu-cursor-ew',
  [TLNuBoundsEdge.Bottom]: 'nu-cursor-ns',
  [TLNuBoundsEdge.Left]: 'nu-cursor-ew',
}

interface EdgeHandleProps {
  x: number
  y: number
  width: number
  height: number
  targetSize: number
  edge: TLNuBoundsEdge
  isHidden?: boolean
}

export const EdgeHandle = observer<EdgeHandleProps>(function EdgeHandle({
  x,
  y,
  width,
  height,
  targetSize,
  edge,
  isHidden,
}: EdgeHandleProps): JSX.Element {
  const events = useBoundsEvents(edge)

  return (
    <rect
      pointerEvents={isHidden ? 'none' : 'all'}
      className={'nu-transparent nu-edge-handle ' + (isHidden ? '' : edgeClassnames[edge])}
      aria-label={`${edge} target`}
      opacity={isHidden ? 0 : 1}
      x={x - targetSize}
      y={y - targetSize}
      width={Math.max(1, width + targetSize * 2)}
      height={Math.max(1, height + targetSize * 2)}
      {...events}
    />
  )
})
