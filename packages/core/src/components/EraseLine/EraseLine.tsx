import { observer } from 'mobx-react-lite'
import getStroke from 'perfect-freehand'
import * as React from 'react'
import Utils from '~utils'

export interface UiEraseLintProps {
  points: number[][]
  zoom: number
}

export type UiEraseLineComponent = (props: UiEraseLintProps) => any | null

export const EraseLine = observer(function EraserLine({ points, zoom }: UiEraseLintProps) {
  if (points.length === 0) return null

  const d = Utils.getSvgPathFromStroke(
    getStroke(points, { size: 16 / zoom, start: { taper: true } })
  )

  return <path d={d} className="tl-erase-line" />
})
