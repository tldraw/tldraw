import * as React from 'react'
import { Container } from '~components/Container'
import { SVGContainer } from '~components/SVGContainer'
import { useBoundsEvents } from '~hooks'
import type { TLBounds } from '~types'

export interface BoundsBgProps {
  bounds: TLBounds
  rotation: number
  isHidden: boolean
}

function _BoundsBg({ bounds, rotation, isHidden }: BoundsBgProps) {
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
}

export const BoundsBg = React.memo(_BoundsBg)
