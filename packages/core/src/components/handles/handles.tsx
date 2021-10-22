import * as React from 'react'
import { Vec } from '@tldraw/vec'
import type { TLHandle, TLShape } from '+types'
import { Handle } from './handle'

interface HandlesProps {
  shape: TLShape
  zoom: number
}

export const Handles = React.memo(({ shape, zoom }: HandlesProps): JSX.Element | null => {
  if (shape.handles === undefined) {
    return null
  }

  let prev: number[] | null = null

  const handlesToShow = Object.values(shape.handles).reduce((acc, cur) => {
    const point = Vec.add(cur.point, shape.point)

    if (!prev || Vec.dist(point, prev) * zoom >= 32) {
      acc.push(cur)
      prev = point
    }

    return acc
  }, [] as TLHandle[])

  return (
    <>
      {handlesToShow.map((handle) => (
        <Handle
          key={shape.id + '_' + handle.id}
          id={handle.id}
          point={Vec.add(handle.point, shape.point)}
        />
      ))}
    </>
  )
})
