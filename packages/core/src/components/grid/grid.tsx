import * as React from 'react'
import type { TLPageState } from '~types'

const FRACTIONS = [1, 8, 16, 32, 64]

export function Grid({ grid = 8, camera }: { camera: TLPageState['camera']; grid?: number }) {
  return (
    <svg className="tl-grid">
      <defs>
        {FRACTIONS.map((size, i) => {
          const s = size * grid * camera.zoom
          const xo = camera.point[0] * camera.zoom
          const yo = camera.point[1] * camera.zoom
          const gxo = xo > 0 ? xo % s : s + (xo % s)
          const gyo = yo > 0 ? yo % s : s + (yo % s)
          const opacity = s / (grid * 4) - 0.05

          return (
            <pattern
              key={`pattern-${i}`}
              id={`grid-${i}`}
              width={s}
              height={s}
              patternUnits="userSpaceOnUse"
            >
              <g opacity={opacity}>
                <line
                  className={`tl-grid-minor`}
                  x1={gxo}
                  y1={0}
                  x2={gxo}
                  y2={s}
                  fill="none"
                  strokeWidth={1}
                />
                <line
                  className={`tl-grid-minor`}
                  x1={0}
                  y1={gyo}
                  x2={s}
                  y2={gyo}
                  fill="none"
                  strokeWidth={1}
                />
              </g>
            </pattern>
          )
        })}
      </defs>
      {FRACTIONS.map((_, i) => (
        <rect key={`grid-${i}`} width="100%" height="100%" fill={`url(#grid-${i})`} />
      ))}
    </svg>
  )
}
