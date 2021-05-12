import { CircleShape, ShapeProps } from "types"
import { Indicator, HoverIndicator } from "./indicator"
import ShapeGroup from "./shape-group"

function BaseCircle({
  radius,
  fill = "#999",
  stroke = "none",
  strokeWidth = 0,
}: ShapeProps<CircleShape>) {
  return (
    <>
      <HoverIndicator as="circle" cx={radius} cy={radius} r={radius} />
      <circle
        cx={radius}
        cy={radius}
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <Indicator as="circle" cx={radius} cy={radius} r={radius} />
    </>
  )
}

export default function Circle({ id, point, radius }: CircleShape) {
  return (
    <ShapeGroup id={id} point={point}>
      <BaseCircle radius={radius} />
    </ShapeGroup>
  )
}
