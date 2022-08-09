import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { Container } from '~components/Container'
import { SVGContainer } from '~components/SVGContainer'
import { useHandleEvents } from '~hooks'
import Utils from '~utils'

interface HandleProps {
  id: string
  point: number[]
}

export const Handle = observer(function Handle({ id, point }: HandleProps) {
  const events = useHandleEvents(id)

  return (
    <Container
      bounds={Utils.translateBounds(
        {
          minX: 0,
          minY: 0,
          maxX: 0,
          maxY: 0,
          width: 0,
          height: 0,
        },
        point
      )}
    >
      <SVGContainer>
        <g className="tl-handle" aria-label="handle" {...events}>
          <circle className="tl-handle-bg" pointerEvents="all" />
          <circle className="tl-counter-scaled tl-handle" pointerEvents="none" r={4} />
        </g>
      </SVGContainer>
    </Container>
  )
})
