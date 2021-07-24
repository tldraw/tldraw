import useHandleEvents from '../hooks/useHandleEvents'
import { useRef } from 'react'
import { Vec } from '../../utils'
import { TLShape } from '../../types'
import { useTLContext } from '../hooks'

interface HandlesProps {
  shape: TLShape
}

export function Handles({ shape }: HandlesProps): JSX.Element | null {
  const { shapeUtils } = useTLContext()

  const center = shapeUtils[shape.type].getCenter(shape)

  if (shape.handles === undefined) {
    return null
  }

  return (
    <g transform={`rotate(${shape.rotation * (180 / Math.PI)},${center})`}>
      {Object.values(shape.handles).map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          point={Vec.add(handle.point, shape.point)}
        />
      ))}
    </g>
  )
}

function Handle({ id, point }: { id: string; point: number[] }) {
  const rGroup = useRef<SVGGElement>(null)
  const events = useHandleEvents(id, rGroup)

  return (
    <g
      key={id}
      className="handles"
      ref={rGroup}
      {...events}
      pointerEvents="all"
      transform={`translate(${point})`}
    >
      <circle className="tl-handle-bg" r={12} />
      <use href="#handle" pointerEvents="none" />
    </g>
  )
}
