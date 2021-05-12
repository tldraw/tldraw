import { PolylineShape, ShapeProps } from "types"
import { Indicator, HoverIndicator } from "./indicator"
import ShapeGroup from "./shape-g"

function BasePolyline({
  points,
  fill = "none",
  stroke = "#999",
  strokeWidth = 1,
}: ShapeProps<PolylineShape>) {
  return (
    <>
      <HoverIndicator as="polyline" points={points.toString()} />
      <polyline
        points={points.toString()}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Indicator as="polyline" points={points.toString()} />
    </>
  )
}

export default function Polyline({ id, point, points }: PolylineShape) {
  return (
    <ShapeGroup id={id} point={point}>
      <BasePolyline points={points} />
    </ShapeGroup>
  )
}
