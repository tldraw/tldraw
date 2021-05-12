import { Indicator, HoverIndicator } from "./indicator"
import { DotShape, ShapeProps } from "types"
import ShapeGroup from "./shape-group"

const dotRadius = 4

function BaseDot({
  fill = "#999",
  stroke = "none",
  strokeWidth = 0,
}: ShapeProps<DotShape>) {
  return (
    <>
      <HoverIndicator as="circle" cx={dotRadius} cy={dotRadius} r={dotRadius} />
      <circle
        cx={dotRadius}
        cy={dotRadius}
        r={dotRadius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <Indicator as="circle" cx={dotRadius} cy={dotRadius} r={dotRadius} />
    </>
  )
}

export default function Dot({ id, point }: DotShape) {
  return (
    <ShapeGroup id={id} point={point}>
      <BaseDot />
    </ShapeGroup>
  )
}
