import * as React from 'react'
import { observer } from 'mobx-react-lite'
import type { TLNuBounds } from '~types'
import { Container, SVGContainer } from '~components'

interface BrushProps {
  brush: TLNuBounds
}

export const Brush = observer(function Brush({ brush }: BrushProps) {
  return (
    <Container bounds={brush} zIndex={10001}>
      <SVGContainer>
        <rect className="nu-brush" x={0} y={0} width={brush.width} height={brush.height} />
      </SVGContainer>
    </Container>
  )
})
