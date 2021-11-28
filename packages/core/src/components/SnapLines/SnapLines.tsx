import { observer } from 'mobx-react-lite'
import * as React from 'react'
import type { TLSnapLine } from '~types'
import Utils from '~utils'

export const SnapLines = observer<{ snapLines: TLSnapLine[] }>(function SnapLines({ snapLines }) {
  return (
    <>
      {snapLines.map((snapLine, i) => (
        <SnapLine key={i} snapLine={snapLine} />
      ))}
    </>
  )
})

export const SnapLine = observer<{ snapLine: TLSnapLine }>(function SnapLine({ snapLine }) {
  const bounds = Utils.getBoundsFromPoints(snapLine)

  return (
    <>
      <line
        className="tl-snap-line"
        x1={bounds.minX}
        y1={bounds.minY}
        x2={bounds.maxX}
        y2={bounds.maxY}
      />
      {snapLine.map(([x, y], i) => (
        <use key={i} href="#tl-snap-point" x={x} y={y} />
      ))}
    </>
  )
})
