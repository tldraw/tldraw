import * as React from 'react'
import type { TLSnapLine } from '+types'
import Utils from '+utils'

export function SnapLines({ snapLines }: { snapLines: TLSnapLine[] }) {
  return (
    <>
      {snapLines.map((snapLine, i) => (
        <SnapLine key={i} snapLine={snapLine} />
      ))}
    </>
  )
}

export function SnapLine({ snapLine }: { snapLine: TLSnapLine }) {
  const bounds = Utils.getBoundsFromPoints(snapLine)

  return (
    <>
      <div
        className="tl-snap-line"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${bounds.minX - 0.5}px, ${bounds.minY - 0.5}px)`,
          width: Math.max(bounds.width, 1) + 'px',
          height: Math.max(bounds.height, 1) + 'px',
          backgroundColor: 'red',
        }}
      />
      {snapLine.map(([x, y], i) => (
        <div
          key={i}
          className="tl-snap-line-anchor"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translate(${x - 2}px, ${y - 2}px)`,
            width: 4 + 'px',
            height: 4 + 'px',
            borderRadius: '100%',
            backgroundColor: 'red',
          }}
        />
      ))}
    </>
  )
}
