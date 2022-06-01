import * as React from 'react'
import { observer } from 'mobx-react-lite'
import getStroke from 'perfect-freehand'
import Utils from '~utils'

export interface UiEraseLintProps {
  points: number[][]
}

export type UiEraseLineComponent = (props: UiEraseLintProps) => any | null

export const EraseLine = observer(function EraserLine({ points }: UiEraseLintProps) {
  if (points.length === 0) return null

  const d = Utils.getSvgPathFromStroke(getStroke(points, { size: 16, start: { taper: 200 } }))

  return <path d={d} className="tl-erase-line" />
})
