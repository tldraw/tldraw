import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { useContext } from '~hooks'
import { BoundsUtils } from '~utils'
import { useCounterScaledPosition } from '~hooks'
import type { TLNuShape } from '~nu-lib'
import type { TLNuBounds, TLNuOffset } from '~types'

const stopEventPropagation = (e: React.PointerEvent) => e.stopPropagation()

export interface TLNuContextBarContainerProps<S extends TLNuShape> {
  shapes: S[]
  hidden: boolean
  bounds: TLNuBounds
}

export const ContextBarContainer = observer(function ContextBar<S extends TLNuShape>({
  shapes,
  hidden,
  bounds,
}: TLNuContextBarContainerProps<S>) {
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

  const offset: TLNuOffset = {
    top: bounds.minY + y * zoom,
    right: vpBounds.width - (bounds.maxX + x * zoom),
    bottom: vpBounds.height - (bounds.maxY + y * zoom),
    left: bounds.minX + x * zoom,
  }

  const inView = offset.left > 0 && offset.top > 0 && offset.right > 0 && offset.bottom > 0

  const rBounds = React.useRef<HTMLDivElement>(null)
  const scaledBounds = BoundsUtils.multiplyBounds(bounds, zoom)
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
        offset={offset}
        scaledBounds={scaledBounds}
        rotation={bounds.rotation || 0}
      />
    </div>
  )
})
