import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { useContext } from '~hooks'
import { BoundsUtils } from '~utils'
import type { TLNuBounds } from '~types'
import type { TLNuShape } from '~nu-lib'
import { useCounterScaledPosition } from '~hooks'

export interface TLNuBoundsDetailContainerProps<S extends TLNuShape> {
  hidden: boolean
  detail: 'size' | 'rotation'
  bounds: TLNuBounds
  shapes: S[]
}

export const BoundsDetailContainer = observer(function BoundsDetail<S extends TLNuShape>({
  bounds,
  hidden,
  shapes,
  detail = 'size',
}: TLNuBoundsDetailContainerProps<S>) {
  const {
    components: { BoundsDetail },
    viewport: {
      camera: { zoom },
    },
  } = useContext()

  const rBounds = React.useRef<HTMLDivElement>(null)
  const scaledBounds = BoundsUtils.multiplyBounds(bounds, zoom)
  useCounterScaledPosition(rBounds, scaledBounds, zoom, 10003)

  if (!BoundsDetail) throw Error('Expected a BoundsDetail component.')

  return (
    <div
      ref={rBounds}
      className={`nu-counter-scaled-positioned ${hidden ? `nu-fade-out` : ''}`}
      aria-label="bounds-detail-container"
    >
      <BoundsDetail
        shapes={shapes}
        bounds={bounds}
        scaledBounds={scaledBounds}
        zoom={zoom}
        detail={detail}
      />
    </div>
  )
})
