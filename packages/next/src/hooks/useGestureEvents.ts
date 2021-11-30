import Vec from '@tldraw/vec'
import type { Handler } from '@use-gesture/core/types'
import { useGesture } from '@use-gesture/react'
import * as React from 'react'
import { useContext } from '~hooks'
import { TLNuTargetType } from '~types'

export function useGestureEvents(ref: React.RefObject<HTMLDivElement>) {
  const { viewport, inputs, callbacks } = useContext()

  const handleWheel = React.useCallback<Handler<'wheel', WheelEvent>>(({ delta, event: e }) => {
    e.preventDefault()
    if (Vec.isEqual(delta, [0, 0])) return

    viewport.panCamera(delta)
    inputs.onPointerMove([...viewport.getPagePoint([e.clientX, e.clientY]), 0.5], e)
    callbacks.onPan?.({ type: TLNuTargetType.Canvas, target: 'canvas', order: 0 }, e)
  }, [])

  useGesture(
    {
      onWheel: handleWheel,
    },
    {
      target: ref,
      eventOptions: { passive: false },
      pinch: {
        from: viewport.camera.zoom,
        scaleBounds: () => ({ from: viewport.camera.zoom, max: 5, min: 0.1 }),
      },
    }
  )
}
