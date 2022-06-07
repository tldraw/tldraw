import * as React from 'react'
import type { TLPageState } from '~types'

const STEPS = [
  [-1, 0.15, 64],
  [0.05, 0.375, 16],
  [0.15, 1, 4],
  [0.7, 2.5, 1],
]

export function Music({ space, camera }: { camera: TLPageState['camera']; space: number }) {
  const s = space * camera.zoom
  const sw = 1000 * camera.zoom
  const sh = 24 * s
  const xo = camera.point[0] * camera.zoom
  const yo = camera.point[1] * camera.zoom
  const gxo = xo > 0 ? xo % sw : sw + (xo % sw)
  const gyo = yo > 0 ? yo % sh : sh + (yo % sh)

  let lines = []
  for (let i = 0; i < 12; i++) {
    lines.push(<line className={`tl-grid-line`} x1={(8*s+gxo)%sw} y1={(gyo+s*i*2)%sh} x2={(8*s+gxo)%sw+sw-8*s} y2={(gyo+s*i*2)%sh} opacity={(i < 4 || i > 8) ? (camera.zoom > 2 ? 0.1 : 0) : 1} key={i*2}/>);
    lines.push(<line className={`tl-grid-line`} x1={(8*s+gxo)%sw-sw} y1={(gyo+s*i*2)%sh} x2={(8*s+gxo)%sw+sw-8*s-sw} y2={(gyo+s*i*2)%sh} opacity={(i < 4 || i > 8) ? (camera.zoom > 2 ? 0.1 : 0) : 1} key={i*2+1} />);
  }
  return (
    <svg className="tl-grid" version="1.1" xmlns="http://www.w3.org/2000/svg">
      <defs>
            <pattern
              key={`grid-pattern`}
              id={`grid-fill`}
              width={sw}
              height={sh}
              patternUnits="userSpaceOnUse"
            >
              {lines}
            </pattern>
      </defs>
      <rect key={`grid-rect`} width="100%" height="100%" fill={`url(#grid-fill)`} />
    </svg>
  )
}