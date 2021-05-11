import { useSelector } from "state"
import { DotShape } from "types"
import ShapeGroup from "./shape-group"

interface BaseCircleProps {
  point: number[]
  fill?: string
  stroke?: string
  strokeWidth?: number
}

function BaseDot({
  point,
  fill = "#ccc",
  stroke = "none",
  strokeWidth = 0,
}: BaseCircleProps) {
  return (
    <g>
      <circle
        cx={point[0] + strokeWidth}
        cy={point[1] + strokeWidth}
        r={8}
        fill="transparent"
        stroke="none"
        strokeWidth="0"
      />
      <circle
        cx={point[0] + strokeWidth}
        cy={point[1] + strokeWidth}
        r={Math.max(1, 4 - strokeWidth)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </g>
  )
}

export default function Dot({ id, point }: DotShape) {
  const isSelected = useSelector((state) => state.values.selectedIds.has(id))
  return (
    <ShapeGroup id={id}>
      <BaseDot point={point} />
      {isSelected && (
        <BaseDot point={point} fill="none" stroke="blue" strokeWidth={1} />
      )}
    </ShapeGroup>
  )
}
