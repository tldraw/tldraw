/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import type { TLBounds } from '~types'
import { useBoundsEvents } from '~hooks'
import { Container } from '~components/container'
import { SVGContainer } from '~components/svg-container'

interface BoundsBgProps {
  bounds: TLBounds
  rotation: number
  isHidden: boolean
}

export const BoundsBg = React.memo(function BoundsBg({
  bounds,
  rotation,
  isHidden,
}: BoundsBgProps): JSX.Element {
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
