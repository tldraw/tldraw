import * as React from 'react'
import type { TLPageState } from '~types'
import Utils from '~utils'

const STEPS = [
  [-1, 0.15, 64],
  [0.05, 0.375, 16],
  [0.15, 1, 4],
  [0.7, 2.5, 1],
]

export function Iso({ space, camera }: { camera: TLPageState['camera']; space: number }) {
  return (
    <svg className="tl-grid" version="1.1" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {STEPS.map(([min, mid, size], i) => {
          const s = size * space * camera.zoom 
          const xo = camera.point[0] * camera.zoom
          const yo = camera.point[1] * camera.zoom
          const gxo = xo > 0 ? xo % (s*2) : s*2 + (xo % (s*2))
          const gyo = yo > 0 ? yo % s : s + (yo % s)
          
          const opacity = camera.zoom < mid ? Utils.modulate(camera.zoom, [min, mid], [0, 1]) : 1

          return (
            <pattern
              key={`grid-pattern-${i}`}
              id={`grid-${i}`}
              width={s*2}
              height={s}
              patternUnits="userSpaceOnUse"
            >
              <line className={`tl-grid-line`} x1={gxo-s*2} y1={gyo} x2={s*2+gxo} y2={s*2+gyo} opacity={opacity} />
              <line className={`tl-grid-line`} x1={gxo-s*2} y1={gyo-s} x2={s*2+gxo} y2={s+gyo} opacity={opacity} />
              <line className={`tl-grid-line`} x1={gxo-s*2} y1={gyo-s*2} x2={s*2+gxo} y2={gyo} opacity={opacity} />
              <line className={`tl-grid-line`} x1={s*2+gxo} y1={gyo} x2={gxo-s*2} y2={s*2+gyo} opacity={opacity} />
              <line className={`tl-grid-line`} x1={s*2+gxo} y1={gyo-s} x2={gxo-s*2} y2={s+gyo} opacity={opacity} />
              <line className={`tl-grid-line`} x1={s*2+gxo} y1={gyo-s*2} x2={gxo-s*2} y2={gyo} opacity={opacity} />
              <line className={`tl-grid-line`} x1={gxo} y1={0} x2={gxo} y2={s} opacity={opacity} />
              <line className={`tl-grid-line`} x1={(s+gxo)%(s*2)} y1={0} x2={(s+gxo)%(s*2)} y2={s} opacity={opacity} />
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