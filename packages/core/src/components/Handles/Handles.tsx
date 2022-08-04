import { Vec } from '@tldraw/vec'
import { observer } from 'mobx-react-lite'
import * as React from 'react'
import type { TLHandle, TLShape } from '~types'
import { Handle } from './Handle'

interface HandlesProps {
  shape: TLShape
  zoom: number
}

export const Handles = observer(function Handles({ shape, zoom }: HandlesProps) {
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

  if (handlesToShow.length === 1) return null

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
