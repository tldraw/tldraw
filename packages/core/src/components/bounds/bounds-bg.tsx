/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import type { TLBounds } from '+types'
import { useBoundsEvents } from '+hooks'
import { Container } from '+components/container'
import { SVGContainer } from '+components/svg-container'

interface BoundsBgProps {
  bounds: TLBounds
  rotation: number
}

export const BoundsBg = React.memo(({ bounds, rotation }: BoundsBgProps): JSX.Element => {
  const events = useBoundsEvents()

  return (
    <Container bounds={bounds} rotation={rotation}>
      <SVGContainer>
        <rect className="tl-bounds-bg" width={bounds.width} height={bounds.height} {...events} />
      </SVGContainer>
    </Container>
  )
})
