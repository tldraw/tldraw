import { useSelector } from "state"
import { PolylineShape, ShapeProps } from "types"
import ShapeGroup from "./shape-g"

function BasePolyline({
  points,
  fill = "none",
  stroke = "#999",
  strokeWidth = 1,
}: ShapeProps<PolylineShape>) {
  return (
    <>
      <polyline
        points={points.toString()}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
      />
      <polyline
        points={points.toString()}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </>
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
