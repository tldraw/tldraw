import { observer } from 'mobx-react-lite'
import { SVGContainer } from '~components'
import { Container } from '~components/Container'
import type { TLBounds } from '~types'
import * as React from 'react'

export const Brush = observer<{ brush: TLBounds,  dashed: boolean | null | undefined}>(function Brush({ brush, dashed }): JSX.Element | null {
  return (
    <Container bounds={brush} rotation={0}>
      <SVGContainer>
        <rect
          className={"tl-brush" + (dashed ? " dashed" : "")}
          opacity={1}
          x={0}
          y={0}
          width={brush.width}
          height={brush.height}
          aria-label="brush"
        />
      </SVGContainer>
    </Container>
  )
})
