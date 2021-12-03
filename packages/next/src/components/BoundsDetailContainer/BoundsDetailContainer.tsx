import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { useContext } from '~hooks'
import { BoundsUtils } from '~utils'
import type { TLNuBounds } from '~types'
import { useCounterScaledPosition } from '~hooks/useCounterScaledPosition'

export interface TLNuBoundsDetailContainerProps {
  hidden: boolean
  detail: 'size' | 'rotation'
  bounds: TLNuBounds
}

export const BoundsDetailContainer = observer(function BoundsDetail({
  bounds,
  hidden,
  detail = 'size',
}: TLNuBoundsDetailContainerProps) {
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
      className={`nu-counter-scaled-positioned ${hidden ? `nu-fade` : ''}`}
      aria-label="bounds-detail-container"
    >
      <BoundsDetail bounds={bounds} scaledBounds={scaledBounds} zoom={zoom} detail={detail} />
    </div>
  )
})
