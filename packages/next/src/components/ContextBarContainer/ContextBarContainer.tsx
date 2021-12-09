import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { useContext } from '~hooks'
import { BoundsUtils } from '~utils'
import { useCounterScaledPosition } from '~hooks'
import type { TLNuShape } from '~nu-lib'
import type { TLNuBounds, TLNuOffset } from '~types'

const stopEventPropagation = (e: React.PointerEvent) => e.stopPropagation()

export interface TLNuContextBarContainerProps {
  shapes: TLNuShape[]
  hidden: boolean
  bounds: TLNuBounds
}

export const ContextBarContainer = observer(function ContextBar({
  shapes,
  hidden,
  bounds,
}: TLNuContextBarContainerProps) {
  const {
    components: { ContextBar },
    viewport: {
      bounds: vpBounds,
      camera: {
        point: [x, y],
        zoom,
      },
    },
  } = useContext()

  const rBounds = React.useRef<HTMLDivElement>(null)
  const scaledBounds = BoundsUtils.multiplyBounds(bounds, zoom)
  const minX = (bounds.minX + x) * zoom
  const maxX = (bounds.maxX + x) * zoom
  const minY = (bounds.minY + y) * zoom
  const maxY = (bounds.maxY + y) * zoom

  const screenBounds: TLNuBounds = {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }

  const offsets: TLNuOffset = {
    left: screenBounds.minX,
    right: vpBounds.width - screenBounds.maxX,
    top: screenBounds.minY,
    bottom: vpBounds.height - screenBounds.maxY,
    width: screenBounds.width,
    height: screenBounds.height,
  }

  const inView =
    BoundsUtils.boundsContain(vpBounds, screenBounds) ||
    BoundsUtils.boundsCollide(vpBounds, screenBounds)

  useCounterScaledPosition(rBounds, scaledBounds, zoom, 10003)
  if (!ContextBar) throw Error('Expected a ContextBar component.')

  React.useLayoutEffect(() => {
    const elm = rBounds.current
    if (!elm) return
    if (hidden || !inView) {
      elm.classList.add('nu-fade-out')
      elm.classList.remove('nu-fade-in')
    } else {
      elm.classList.add('nu-fade-in')
      elm.classList.remove('nu-fade-out')
    }
  }, [hidden, inView])

  return (
    <div
      ref={rBounds}
      className="nu-counter-scaled-positioned nu-fade-out"
      aria-label="context-bar-container"
      onPointerMove={stopEventPropagation}
      onPointerUp={stopEventPropagation}
      onPointerDown={stopEventPropagation}
    >
      <ContextBar
        shapes={shapes}
        bounds={bounds}
        offset={offsets}
        scaledBounds={scaledBounds}
        rotation={bounds.rotation || 0}
      />
    </div>
  )
})
