import * as React from 'react'
import type { TLPageState } from '~types'
import Utils from '~utils'

const STEPS = [
  [-1, 0.15, 64],
  [0.05, 0.375, 16],
  [0.15, 1, 4],
  [0.7, 2.5, 1],
]

export function Lines({ space, subgrid, camera }: { space: number, subgrid?: boolean, camera: TLPageState['camera'] }) {
  return (
    <svg className="tl-grid" version="1.1" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {STEPS.map(([min, mid, size], i) => {
          if (!subgrid && i != 2) return
          const s = size * space * camera.zoom
          const xo = camera.point[0] * camera.zoom
          const yo = camera.point[1] * camera.zoom
          const gyo = yo > 0 ? yo % s : s + (yo % s)
          const opacity = camera.zoom < mid ? Utils.modulate(camera.zoom, [min, mid], [0, 1]) : 1

          return (
            <pattern
              key={`grid-pattern-${i}`}
              id={`grid-${i}`}
              width={s}
              height={s}
              patternUnits="userSpaceOnUse"
            >
              <line className={`tl-grid-line`} x1={0} y1={gyo} x2={s} y2={gyo} opacity={opacity} />
            </pattern>
          )
        })}
      </defs>
      {STEPS.map((_, i) => (
        <rect key={`grid-rect-${i}`} width="100%" height="100%" fill={`url(#grid-${i})`} />
      ))}
    </svg>
  )
}