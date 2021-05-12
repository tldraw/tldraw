import { useSelector } from "state"
import { CircleShape } from "types"
import ShapeGroup from "./shape-g"

interface BaseCircleProps extends Pick<CircleShape, "radius"> {
  radius: number
  fill?: string
  stroke?: string
  strokeWidth?: number
}

function BaseCircle({
  radius,
  fill = "#ccc",
  stroke = "none",
  strokeWidth = 0,
}: BaseCircleProps) {
  return (
    <circle
      cx={strokeWidth}
      cy={strokeWidth}
      r={radius - strokeWidth}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  )
}

export default function Circle({ id, point, radius }: CircleShape) {
  const isSelected = useSelector((state) => state.values.selectedIds.has(id))
  return (
    <ShapeGroup id={id} point={point}>
      <BaseCircle radius={radius} />
      {isSelected && (
        <BaseCircle radius={radius} fill="none" stroke="blue" strokeWidth={1} />
      )}
    </ShapeGroup>
  )
}
