import { useSelector } from "state"
import { CircleShape, ShapeProps } from "types"
import ShapeGroup from "./shape-g"

function BaseCircle({
  radius,
  fill = "#999",
  stroke = "none",
  strokeWidth = 0,
}: ShapeProps<CircleShape>) {
  return (
    <circle
      cx={radius}
      cy={radius}
      r={radius}
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
