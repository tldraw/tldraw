import state, { useSelector } from "state"
import { CircleShape } from "types"
import ShapeGroup from "./shape-group"
import { getPointerEventInfo } from "utils/utils"

interface BaseCircleProps {
  point: number[]
  radius: number
  fill?: string
  stroke?: string
  strokeWidth?: number
}

function BaseCircle({
  point,
  radius,
  fill = "#ccc",
  stroke = "none",
  strokeWidth = 0,
}: BaseCircleProps) {
  return (
    <circle
      cx={point[0] + strokeWidth}
      cy={point[1] + strokeWidth}
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
    <ShapeGroup id={id}>
      <BaseCircle point={point} radius={radius} />
      {isSelected && (
        <BaseCircle
          point={point}
          radius={radius}
          fill="none"
          stroke="blue"
          strokeWidth={1}
        />
      )}
    </ShapeGroup>
  )
}
