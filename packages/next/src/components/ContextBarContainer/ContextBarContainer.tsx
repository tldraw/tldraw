import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { Container } from '~components'
import { PI, PI2, TAU } from '~constants'
import { useContext } from '~hooks'
import { BoundsUtils } from '~utils'
import type { TLNuShape } from '~nu-lib'
import type { TLNuBounds } from '~types'
import { autorun } from 'mobx'
import { useCounterScaledPosition } from '~hooks/useCounterScaledPosition'

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
      camera: { zoom },
    },
  } = useContext()

  const rBounds = React.useRef<HTMLDivElement>(null)
  const scaledBounds = BoundsUtils.multiplyBounds(bounds, zoom)
  useCounterScaledPosition(rBounds, scaledBounds, zoom, 10003)
  if (!ContextBar) throw Error('Expected a ContextBar component.')

  React.useLayoutEffect(() => {
    const elm = rBounds.current
    if (!elm) return
    if (hidden) {
      elm.classList.add('nu-fade-out')
      elm.classList.remove('nu-fade-in')
    } else {
      elm.classList.add('nu-fade-in')
      elm.classList.remove('nu-fade-out')
    }
  }, [hidden])

  return (
    <div
      ref={rBounds}
      className="nu-counter-scaled-positioned "
      aria-label="context-bar-container"
      onPointerMove={stopEventPropagation}
      onPointerUp={stopEventPropagation}
      onPointerDown={stopEventPropagation}
    >
      <ContextBar
        shapes={shapes}
        bounds={bounds}
        scaledBounds={scaledBounds}
        rotation={bounds.rotation || 0}
      />
    </div>
  )
})
