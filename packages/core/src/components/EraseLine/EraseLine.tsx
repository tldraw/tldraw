import getStroke from 'perfect-freehand'
import * as React from 'react'
import Utils from '~utils'

export interface UiEraseLineProps {
  points: number[][]
  zoom: number
}

export type UiEraseLineComponent = (props: UiEraseLineProps) => any | null

function _EraseLine({ points, zoom }: UiEraseLineProps) {
  if (points.length === 0) return null

  const d = Utils.getSvgPathFromStroke(
    getStroke(points, { size: 16 / zoom, start: { taper: true } })
  )

  return <path d={d} className="tl-erase-line" />
}

export const EraseLine = React.memo(_EraseLine)
