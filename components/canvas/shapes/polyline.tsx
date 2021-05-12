import { useSelector } from "state"
import { PolylineShape } from "types"
import ShapeGroup from "./shape-g"

interface BasePolylineProps extends Pick<PolylineShape, "points"> {
  fill?: string
  stroke?: string
  strokeWidth?: number
}

function BasePolyline({
  points,
  fill = "none",
  stroke = "#ccc",
  strokeWidth = 2,
}: BasePolylineProps) {
  return (
    <polyline
      points={points.toString()}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  )
}

export default function Polyline({ id, point, points }: PolylineShape) {
  const isSelected = useSelector((state) => state.values.selectedIds.has(id))
  return (
    <ShapeGroup id={id} point={point}>
      <BasePolyline points={points} />
      {isSelected && <BasePolyline points={points} fill="none" stroke="blue" />}
    </ShapeGroup>
  )
}
