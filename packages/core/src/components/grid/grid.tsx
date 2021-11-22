import * as React from 'react'
import type { TLGrid } from '~types'

export function Grid({
  id,
  grid,
  camera,
}: {
  id: string
  grid: TLGrid
  camera: { point: number[]; zoom: number }
}) {
  const s = grid.size * camera.zoom
  const xo = camera.point[0] * camera.zoom
  const yo = camera.point[1] * camera.zoom
  const gxo = xo > 0 ? xo % s : s + (xo % s)
  const gyo = yo > 0 ? yo % s : s + (yo % s)

  return (
    <>
      <defs>
        <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse">
          <line x1={gxo} y1={0} x2={gxo} y2={s} fill="none" stroke={grid.color} strokeWidth={1} />
          <line x1={0} y1={gyo} x2={s} y2={gyo} fill="none" stroke={grid.color} strokeWidth={1} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </>
  )
}

export function Grids({
  grids,
  camera,
}: {
  grids: TLGrid[]
  camera: { point: number[]; zoom: number }
}) {
  return (
    <>
      {grids.map((grid, i) => (
        <Grid key={i} id={`grid-${i}`} grid={grid} camera={camera} />
      ))}
    </>
  )
}

export function GridOverlay({ children }: { children?: React.ReactNode }) {
  return <svg className="tl-grid">{children}</svg>
}
