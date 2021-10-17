import * as React from 'react'
import type { TLSnapLine } from '+types'

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
  const minX = Math.min(snapLine.from[0], snapLine.to[0])
  const minY = Math.min(snapLine.from[1], snapLine.to[1])
  const maxX = Math.max(snapLine.from[0], snapLine.to[0])
  const maxY = Math.max(snapLine.from[1], snapLine.to[1])
  const width = Math.max(1, maxX - minX)
  const height = Math.max(1, maxY - minY)

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate(${minX}px, ${minY}px)`,
        width: width + 'px',
        height: height + 'px',
        backgroundColor: 'red',
      }}
    />
  )
}
