import { observer } from 'mobx-react-lite'
import * as React from 'react'
import type { TLBounds } from '~types'
import { useBoundsEvents } from '~hooks'
import { Container } from '~components/Container'
import { SVGContainer } from '~components/SVGContainer'

interface BoundsBgProps {
  bounds: TLBounds
  rotation: number
  isHidden: boolean
}

export const BoundsBg = observer<BoundsBgProps>(function BoundsBg({ bounds, rotation, isHidden }) {
  const events = useBoundsEvents()

  return (
    <Container bounds={bounds} rotation={rotation}>
      <SVGContainer>
        <rect
          className="tl-bounds-bg"
          aria-label="bounds bg"
          width={bounds.width}
          height={bounds.height}
          opacity={isHidden ? 0 : 1}
          {...events}
        />
      </SVGContainer>
    </Container>
  )
})
