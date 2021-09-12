import * as React from 'react'
import { Vec } from '@tldraw/vec'
import type { TLShape } from '+types'
import { Handle } from './handle'

interface HandlesProps {
  shape: TLShape
}

export const Handles = React.memo(({ shape }: HandlesProps): JSX.Element | null => {
  if (shape.handles === undefined) {
    return null
  }

  return (
    <>
      {Object.values(shape.handles).map((handle) => (
        <Handle
          key={shape.id + '_' + handle.id}
          id={handle.id}
          point={Vec.add(handle.point, shape.point)}
        />
      ))}
    </>
  )
})
