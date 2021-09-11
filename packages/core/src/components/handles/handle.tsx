import * as React from 'react'
import { useHandleEvents } from '+hooks'
import { Container } from '+components/container'
import Utils from '+utils'
import { SVGContainer } from '+components/svg-container'

interface HandleProps {
  id: string
  point: number[]
}

export const Handle = React.memo(({ id, point }: HandleProps) => {
  const events = useHandleEvents(id)

  const bounds = React.useMemo(
    () =>
      Utils.translateBounds(
        {
          minX: 0,
          minY: 0,
          maxX: 32,
          maxY: 32,
          width: 32,
          height: 32,
        },
        point
      ),
    [point]
  )

  return (
    <Container bounds={bounds}>
      <SVGContainer>
        <g className="tl-handles" {...events}>
          <circle className="tl-handle-bg" pointerEvents="all" />
          <circle className="tl-counter-scaled tl-handle" pointerEvents="none" r={4} />
        </g>
      </SVGContainer>
    </Container>
  )
})
